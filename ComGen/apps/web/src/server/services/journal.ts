import { ACTIONS_AUDIT, formaterResume, OBJETS_AUDIT } from '@comgen/core'
import type { ActionAudit, ObjetAudit } from '@comgen/core'

import { exigerDroit } from '@/server/auth/droits'

import type { Acteur } from './erreurs'

/**
 * Lecture du journal d'audit (plan L3).
 *
 * Le journal se lit, il ne s'écrit pas d'ici : les lignes sont posées par
 * les services qui changent quelque chose, dans leur propre transaction.
 * Ce service ne fait que filtrer et mettre en forme, sous le droit
 * `CONSULTER_AUDIT`.
 */

export interface LigneJournal {
  id: string
  acteurCourriel: string
  action: ActionAudit
  objet: ObjetAudit
  objetLibelle: string
  /** Changements déjà rendus en une ligne, secrets masqués en amont. */
  resume: string
  creeLe: Date
}

export interface FiltresJournal {
  objet?: string
  action?: string
}

export interface EcranJournal {
  lignes: LigneJournal[]
  objets: readonly ObjetAudit[]
  actions: readonly ActionAudit[]
  /** Filtres retenus, après rejet de toute valeur inconnue. */
  filtres: { objet: ObjetAudit | null; action: ActionAudit | null }
}

function objetValide(brut: string | undefined): ObjetAudit | null {
  return OBJETS_AUDIT.find((valeur) => valeur === brut) ?? null
}

function actionValide(brut: string | undefined): ActionAudit | null {
  return ACTIONS_AUDIT.find((valeur) => valeur === brut) ?? null
}

export async function chargerJournal(
  acteur: Acteur,
  filtres: FiltresJournal = {},
): Promise<EcranJournal> {
  exigerDroit(acteur.utilisateur, 'CONSULTER_AUDIT')

  // Un filtre inconnu est ignoré, pas refusé : il vient d'une adresse que
  // l'on peut taper à la main, et un écran vide se lit mal.
  const objet = objetValide(filtres.objet)
  const action = actionValide(filtres.action)

  const lignes = await acteur.contexte.listerAudit({
    ...(objet === null ? {} : { objet }),
    ...(action === null ? {} : { action }),
  })

  return {
    lignes: lignes.map((ligne) => ({
      id: ligne.id,
      acteurCourriel: ligne.acteurCourriel,
      action: ligne.action,
      objet: ligne.objet,
      objetLibelle: ligne.objetLibelle,
      resume: formaterResume(ligne.changements),
      creeLe: ligne.creeLe,
    })),
    objets: OBJETS_AUDIT,
    actions: ACTIONS_AUDIT,
    filtres: { objet, action },
  }
}
