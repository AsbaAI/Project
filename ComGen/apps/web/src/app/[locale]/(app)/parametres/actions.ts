'use server'

import { estErreurItsm } from '@comgen/connecteurs'

import { coche, executer, lignes, prochainJeton, texte } from '@/server/actions-formulaire'
import { enregistrerConfigItsm, testerConfigItsm } from '@/server/services/itsm'

import type { EtatFormulaire } from '../communications/etat-formulaire'

/*
 * Actions des paramètres. Comme ailleurs, elles ne décident de rien : elles
 * lisent le formulaire tel qu'il est saisi et laissent le service valider.
 *
 * Aucun secret ne transite par ici : le formulaire porte le NOM d'une
 * variable d'environnement, jamais sa valeur.
 */

const REGLE = /^([A-Za-z]{1,10})\s*:\s*(\d{1,2})\s*-\s*(\d{1,2})$/u

/**
 * Une règle d'identifiant telle qu'elle est écrite dans la zone de texte
 * (« E:6-7 »). Une ligne illisible est transmise telle quelle au service,
 * qui la refuse en nommant le champ : l'action ne masque pas une saisie
 * fausse en la réparant.
 */
function regleIdentifiant(ligne: string): unknown {
  const trouve = REGLE.exec(ligne)
  if (!trouve) return ligne
  return {
    prefixe: trouve[1],
    chiffresMin: Number(trouve[2]),
    chiffresMax: Number(trouve[3]),
  }
}

function configSaisie(formulaire: FormData): unknown {
  return {
    systeme: 'servicenow',
    urlInstance: texte(formulaire, 'urlInstance') ?? '',
    methodeAuth: texte(formulaire, 'methodeAuth') ?? '',
    identifiantPublic: texte(formulaire, 'identifiantPublic') ?? '',
    refSecret: texte(formulaire, 'refSecret') ?? '',
    masquage: {
      courriel: coche(formulaire, 'masquerCourriel'),
      telephone: coche(formulaire, 'masquerTelephone'),
      identifiants: lignes(formulaire, 'identifiants').map(regleIdentifiant),
      termes: lignes(formulaire, 'termes'),
      champs: coche(formulaire, 'masquerDemandeur') ? ['demandeur'] : [],
    },
    actif: coche(formulaire, 'actif'),
  }
}

/** Issue d'un test : un refus de l'instance n'est pas une erreur de saisie. */
function issueTest(
  formulaire: FormData,
  resultat: { ok: true; enregistre: boolean } | { ok: false; code: string },
): EtatFormulaire {
  const valeurs: Record<string, string> = {}
  for (const [cle, valeur] of formulaire.entries()) {
    if (typeof valeur === 'string') valeurs[cle] = valeur
  }
  return { statut: 'testItsm', resultat, valeurs, jeton: prochainJeton() }
}

/**
 * Une seule action pour les deux boutons : « tester » s'arrête au test,
 * « enregistrer » n'écrit qu'après un test réussi (c'est le service qui le
 * garantit, pas le formulaire).
 */
export async function actionConfigurerItsm(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const enregistrer = texte(formulaire, 'intention') === 'enregistrer'
  return executer(formulaire, async (acteur) => {
    if (!enregistrer) {
      const resultat = await testerConfigItsm(acteur, configSaisie(formulaire))
      return issueTest(
        formulaire,
        resultat.ok ? { ok: true, enregistre: false } : { ok: false, code: resultat.code },
      )
    }
    try {
      await enregistrerConfigItsm(acteur, configSaisie(formulaire))
    } catch (erreur) {
      // Le test a échoué : rien n'a été enregistré, et la saisie reste.
      if (estErreurItsm(erreur)) return issueTest(formulaire, { ok: false, code: erreur.code })
      throw erreur
    }
    return issueTest(formulaire, { ok: true, enregistre: true })
  })
}
