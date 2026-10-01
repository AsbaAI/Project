'use server'

import { ETATS_COMMUNICATION, type EtatCommunication } from '@comgen/core'
import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'

import { redirect } from '@/i18n/navigation'
import { CHEMIN_CONNEXION } from '@/server/auth/config'
import { ErreurAutorisation } from '@/server/auth/droits'
import { ErreurAuthentification, exigerSession } from '@/server/auth/session'
import { changerEtat, creerCommunication } from '@/server/services/communications'
import { dependancesEntree } from '@/server/services/dependances'
import { type Acteur, ErreurMetier } from '@/server/services/erreurs'
import {
  ajouterFait,
  amenderValeur,
  changerConfidentialiteFait,
  confirmerFait,
  modifierEnonce,
  retablirFait,
  retirerFait,
} from '@/server/services/faits'
import { type ResultatDepot, deposerFichiers, saisirTexte } from '@/server/services/sources'

import { choisirDestinataires, genererVariante } from '@/server/services/generation'

import type { EtatFormulaire } from './etat-formulaire'

/*
 * Actions serveur des écrans de communication. Elles ne décident de rien :
 * elles relisent la session, lisent le formulaire, appellent le service et
 * traduisent son issue en un état que le formulaire affiche. Le droit, la
 * validation et les règles sont dans les services.
 */

function texte(formulaire: FormData, champ: string): string | undefined {
  const valeur = formulaire.get(champ)
  return typeof valeur === 'string' ? valeur : undefined
}

let jeton = 0
const prochainJeton = () => {
  jeton += 1
  return jeton
}

/**
 * Exécute une opération pour l'acteur de la session. Une erreur attendue
 * (métier, droit) devient un état affichable ; toute autre erreur remonte
 * telle quelle jusqu'à la page d'erreur : jamais de succès supposé.
 */
async function executer(
  formulaire: FormData,
  operation: (acteur: Acteur) => Promise<EtatFormulaire | void>,
): Promise<EtatFormulaire> {
  const valeurs: Record<string, string> = {}
  for (const [cle, valeur] of formulaire.entries()) {
    if (typeof valeur === 'string') valeurs[cle] = valeur
  }
  let acteur: Acteur
  try {
    acteur = await exigerSession()
  } catch (erreur) {
    if (erreur instanceof ErreurAuthentification) {
      redirect({ href: CHEMIN_CONNEXION, locale: await getLocale() })
    }
    throw erreur
  }
  try {
    const resultat = await operation(acteur)
    revalidatePath('/', 'layout')
    return resultat ?? { statut: 'ok', jeton: prochainJeton() }
  } catch (erreur) {
    if (erreur instanceof ErreurMetier) {
      return {
        statut: 'erreur',
        code: erreur.code,
        ...(erreur.details.champs ? { champs: { ...erreur.details.champs } } : {}),
        ...(erreur.details.motifs ? { motifs: [...erreur.details.motifs] } : {}),
        valeurs,
        jeton: prochainJeton(),
      }
    }
    if (erreur instanceof ErreurAutorisation) {
      return { statut: 'erreur', code: 'NON_AUTORISE', valeurs, jeton: prochainJeton() }
    }
    throw erreur
  }
}

// ---------------------------------------------------------------------------
// Cadrage
// ---------------------------------------------------------------------------

export async function actionCreerCommunication(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  let creee: { id: string } | undefined
  const etat = await executer(formulaire, async (acteur) => {
    creee = await creerCommunication(acteur, {
      titre: texte(formulaire, 'titre') ?? '',
      nature: texte(formulaire, 'nature') ?? '',
      criticite: texte(formulaire, 'criticite') ?? '',
      portee: texte(formulaire, 'portee') ?? '',
      langue: texte(formulaire, 'langue') ?? '',
      dateEffet: texte(formulaire, 'dateEffet'),
      echeance: texte(formulaire, 'echeance'),
      modeEntree: texte(formulaire, 'modeEntree') ?? '',
      parentId: texte(formulaire, 'parentId'),
      intentionReprise: texte(formulaire, 'intentionReprise'),
    })
  })
  if (creee !== undefined) {
    redirect({ href: `/communications/${creee.id}/entree`, locale: await getLocale() })
  }
  return etat
}

export async function actionChangerEtat(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const id = texte(formulaire, 'communicationId') ?? ''
  const vers = texte(formulaire, 'vers')
  const cible = ETATS_COMMUNICATION.find((e): e is EtatCommunication => e === vers)
  if (cible === undefined)
    return { statut: 'erreur', code: 'DONNEES_INVALIDES', jeton: prochainJeton() }
  return executer(formulaire, (acteur) => changerEtat(acteur, id, cible))
}

// ---------------------------------------------------------------------------
// Entrée
// ---------------------------------------------------------------------------

export async function actionDeposerFichiers(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const id = texte(formulaire, 'communicationId') ?? ''
  const fichiers = await Promise.all(
    formulaire
      .getAll('fichiers')
      .filter((f): f is File => f instanceof File && f.size > 0)
      .map(async (f) => ({ nom: f.name, octets: new Uint8Array(await f.arrayBuffer()) })),
  )
  return executer(formulaire, async (acteur) => {
    const depot: ResultatDepot = await deposerFichiers(acteur, dependancesEntree(), id, fichiers, {
      confidentialite: texte(formulaire, 'confidentialite'),
    })
    return { statut: 'depot', depot, jeton: prochainJeton() }
  })
}

export async function actionSaisirTexte(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const id = texte(formulaire, 'communicationId') ?? ''
  let fini = false
  const etat = await executer(formulaire, async (acteur) => {
    await saisirTexte(acteur, id, {
      titre: texte(formulaire, 'titre') ?? '',
      texte: texte(formulaire, 'texte') ?? '',
      confidentialite: texte(formulaire, 'confidentialite'),
    })
    fini = true
  })
  if (fini) redirect({ href: `/communications/${id}/faits`, locale: await getLocale() })
  return etat
}

// ---------------------------------------------------------------------------
// Fiche de faits
// ---------------------------------------------------------------------------

export async function actionStatutFait(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const faitId = texte(formulaire, 'faitId') ?? ''
  const operation = texte(formulaire, 'operation')
  return executer(formulaire, async (acteur) => {
    if (operation === 'confirmer') await confirmerFait(acteur, faitId)
    else if (operation === 'retirer') await retirerFait(acteur, faitId)
    else if (operation === 'retablir') await retablirFait(acteur, faitId)
    else throw new ErreurMetier('DONNEES_INVALIDES', `Opération inconnue : ${operation}`)
  })
}

export async function actionConfidentialiteFait(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const faitId = texte(formulaire, 'faitId') ?? ''
  return executer(formulaire, (acteur) =>
    changerConfidentialiteFait(acteur, faitId, texte(formulaire, 'confidentialite')),
  )
}

export async function actionModifierEnonce(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const faitId = texte(formulaire, 'faitId') ?? ''
  return executer(formulaire, (acteur) =>
    modifierEnonce(acteur, faitId, texte(formulaire, 'enonce') ?? ''),
  )
}

export async function actionAmenderValeur(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const faitId = texte(formulaire, 'faitId') ?? ''
  return executer(formulaire, (acteur) =>
    amenderValeur(acteur, faitId, {
      nouvelleValeur: texte(formulaire, 'nouvelleValeur') ?? '',
      justification: texte(formulaire, 'justification') ?? '',
      sourceInvoquee: texte(formulaire, 'sourceInvoquee'),
      responsabiliteAssumee: texte(formulaire, 'responsabiliteAssumee') === 'oui',
    }),
  )
}

export async function actionAjouterFait(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const communicationId = texte(formulaire, 'communicationId') ?? ''
  return executer(formulaire, async (acteur) => {
    await ajouterFait(acteur, communicationId, {
      sourceId: texte(formulaire, 'sourceId') ?? '',
      citation: texte(formulaire, 'citation') ?? '',
      enonce: texte(formulaire, 'enonce') ?? '',
      typeValeur: texte(formulaire, 'typeValeur') ?? '',
      valeur: texte(formulaire, 'valeur'),
      confidentialite: texte(formulaire, 'confidentialite'),
    })
  })
}

// ---------------------------------------------------------------------------
// Destinataires et génération
// ---------------------------------------------------------------------------

export async function actionChoisirDestinataires(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const communicationId = texte(formulaire, 'communicationId') ?? ''
  // Plusieurs cases du même nom : `getAll`, pas `get`.
  const personaIds = formulaire
    .getAll('personaIds')
    .filter((valeur): valeur is string => typeof valeur === 'string')
  return executer(formulaire, async (acteur) => {
    await choisirDestinataires(acteur, { communicationId, personaIds })
  })
}

export async function actionGenererVariante(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const varianteId = texte(formulaire, 'varianteId') ?? ''
  return executer(formulaire, async (acteur) => {
    await genererVariante(acteur, { varianteId })
  })
}
