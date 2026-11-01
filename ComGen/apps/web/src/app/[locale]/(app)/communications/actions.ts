'use server'

import { estErreurItsm } from '@comgen/connecteurs'
import { ETATS_COMMUNICATION, type EtatCommunication } from '@comgen/core'
import { getLocale } from 'next-intl/server'

import { redirect } from '@/i18n/navigation'

import { changerEtat, creerCommunication } from '@/server/services/communications'
import { dependancesEntree } from '@/server/services/dependances'
import {
  ajouterFait,
  confirmerTousLesFaits,
  amenderValeur,
  changerConfidentialiteFait,
  confirmerFait,
  modifierEnonce,
  retablirFait,
  retirerFait,
} from '@/server/services/faits'
import { type ResultatDepot, deposerFichiers, saisirTexte } from '@/server/services/sources'

import { choisirDestinataires } from '@/server/services/generation'
import { decider, soumettreALApprobation } from '@/server/services/approbation'
import { annulerEnvoi, confirmerEnvoi, planifierEnvoi } from '@/server/services/envoi'
import { importerTicketItsm } from '@/server/services/itsm'

import { executer, prochainJeton, texte } from '@/server/actions-formulaire'
import { ErreurMetier } from '@/server/services/erreurs'

import type { EtatFormulaire } from './etat-formulaire'

/*
 * Actions serveur des écrans de communication. Elles ne décident de rien :
 * elles relisent la session, lisent le formulaire, appellent le service et
 * traduisent son issue en un état que le formulaire affiche. Le droit, la
 * validation et les règles sont dans les services.
 */

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

/*
 * Import d'un ticket ITSM comme source. Une panne de l'outil (instance
 * indisponible, jeton expiré) n'est pas une erreur de saisie : son code
 * part tel quel et l'écran le traduit.
 */
/*
 * Confirmation en lot. Le service décide seul de ce qu'il confirme et de
 * ce qu'il laisse ; l'action ne fait que rapporter son bilan, pour que
 * l'écran ne laisse jamais croire que tout a été revu.
 */
export async function actionConfirmerTousLesFaits(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const id = texte(formulaire, 'communicationId') ?? ''
  return executer(formulaire, async (acteur) => {
    const bilan = await confirmerTousLesFaits(acteur, id)
    return { statut: 'bilan', ...bilan, jeton: prochainJeton() }
  })
}

export async function actionImporterTicket(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const id = texte(formulaire, 'communicationId') ?? ''
  let importe = false
  const etat = await executer(formulaire, async (acteur) => {
    try {
      await importerTicketItsm(acteur, {
        communicationId: id,
        idExterne: texte(formulaire, 'idExterne') ?? '',
        avecNotes: formulaire.get('avecNotes') !== null,
        confidentialite: texte(formulaire, 'confidentialite'),
      })
    } catch (erreur) {
      if (estErreurItsm(erreur)) {
        return { statut: 'erreur', code: erreur.code, jeton: prochainJeton() }
      }
      throw erreur
    }
    importe = true
    return undefined
  })
  if (importe) {
    redirect({ href: `/communications/${id}/faits`, locale: await getLocale() })
  }
  return etat
}

/** Soumission à l'approbation : le service désigne les approbateurs et garde la porte. */
export async function actionSoumettreApprobation(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const id = texte(formulaire, 'communicationId') ?? ''
  return executer(formulaire, async (acteur) => {
    await soumettreALApprobation(acteur, id)
  })
}

/** Décision d'un approbateur. Le bouton pressé porte la décision, pas un champ caché. */
export async function actionDecider(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  return executer(formulaire, async (acteur) => {
    await decider(acteur, {
      communicationId: texte(formulaire, 'communicationId') ?? '',
      decision: texte(formulaire, 'decision') ?? '',
      commentaire: texte(formulaire, 'commentaire'),
    })
  })
}

/** Les trois gestes de l'envoi, portés par le bouton pressé (`intention`). */
export async function actionEnvoi(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const id = texte(formulaire, 'communicationId') ?? ''
  const intention = texte(formulaire, 'intention')
  return executer(formulaire, async (acteur) => {
    if (intention === 'planifier') await planifierEnvoi(acteur, id)
    else if (intention === 'confirmer') await confirmerEnvoi(acteur, id)
    else if (intention === 'annuler') await annulerEnvoi(acteur, id)
    else throw new ErreurMetier('DONNEES_INVALIDES', 'Intention inconnue')
  })
}
