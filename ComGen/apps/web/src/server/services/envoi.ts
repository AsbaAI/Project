import { evaluerTransition } from '@comgen/core'

import { exigerDroit } from '@/server/auth/droits'

import { type Acteur, ErreurMetier, introuvable } from './erreurs'
import { construireContexteTransition, resoudreListes } from './etat'

/**
 * Envoi (§7) : APPROUVEE → ENVOI_PLANIFIE → ENVOYEE, et l'annulation dans
 * la fenêtre. Aucun connecteur de canal n'est branché : un envoi est donc
 * ENREGISTRÉ comme une SIMULATION (`etatRemise.mode`), jamais présenté
 * comme remis. L'application ne ment pas sur ce qui a quitté la maison —
 * `remis` reste faux tant qu'aucun canal réel ne l'a confirmé.
 *
 * Ce qui est réel : la garde (communication approuvée, liste de diffusion
 * résolue et non vide pour chaque variante), le droit (ENVOYER, réservé à
 * l'approbateur) et la trace de ce qui aurait été adressé. La base garde
 * l'effectif et le nom des listes, pas les adresses.
 */

export const ETAT_REMISE_SIMULEE = {
  mode: 'SIMULATION',
  remis: false,
  raison: 'Aucun connecteur de canal n’est configuré.',
} as const

async function communicationPour(
  id: string,
  tx: Parameters<Parameters<Acteur['contexte']['$transaction']>[0]>[0],
) {
  const communication = await tx.communication.findUnique({
    where: { id },
    select: { id: true, etat: true, criticite: true },
  })
  if (!communication) throw introuvable('Communication', id)
  return communication
}

export async function planifierEnvoi(
  acteur: Acteur,
  communicationId: string,
): Promise<{ envois: number }> {
  exigerDroit(acteur.utilisateur, 'ENVOYER')
  return acteur.contexte.$transaction(async (tx) => {
    const communication = await communicationPour(communicationId, tx)
    if (communication.etat !== 'APPROUVEE') {
      throw new ErreurMetier(
        'ETAT_INCOMPATIBLE',
        `Communication ${communicationId} en ${communication.etat} : envoi impossible`,
      )
    }
    const { contexte } = await construireContexteTransition(
      tx,
      communicationId,
      communication.criticite,
    )
    const resultat = evaluerTransition('APPROUVEE', 'ENVOI_PLANIFIE', contexte)
    if (!resultat.autorisee) {
      throw new ErreurMetier('TRANSITION_REFUSEE', 'Envoi refusé', { motifs: resultat.motifs })
    }

    const variantes = await tx.variante.findMany({
      where: { communicationId },
      select: {
        id: true,
        persona: {
          select: {
            canalDefaut: true,
            listes: {
              select: { id: true, nom: true, type: true, definition: true, exclusions: true },
            },
          },
        },
      },
    })
    const maintenant = new Date()
    await tx.envoi.createMany({
      data: variantes.map((variante) => {
        const { effectif, noms } = resoudreListes(variante.persona.listes)
        return {
          organisationId: acteur.utilisateur.organisationId,
          varianteId: variante.id,
          canal: variante.persona.canalDefaut,
          destinataires: { effectif: effectif ?? 0, listes: noms },
          planifiePour: maintenant,
          etatRemise: ETAT_REMISE_SIMULEE,
          annulable: true,
        }
      }),
    })
    const { count } = await tx.communication.updateMany({
      where: { id: communicationId, etat: 'APPROUVEE' },
      data: { etat: 'ENVOI_PLANIFIE' },
    })
    if (count !== 1) throw new ErreurMetier('CONFLIT', `Communication ${communicationId} modifiée`)
    return { envois: variantes.length }
  })
}

export async function confirmerEnvoi(acteur: Acteur, communicationId: string): Promise<void> {
  exigerDroit(acteur.utilisateur, 'ENVOYER')
  await acteur.contexte.$transaction(async (tx) => {
    const communication = await communicationPour(communicationId, tx)
    if (communication.etat !== 'ENVOI_PLANIFIE') {
      throw new ErreurMetier(
        'ETAT_INCOMPATIBLE',
        `Communication ${communicationId} en ${communication.etat} : aucun envoi planifié`,
      )
    }
    const { count } = await tx.communication.updateMany({
      where: { id: communicationId, etat: 'ENVOI_PLANIFIE' },
      data: { etat: 'ENVOYEE' },
    })
    if (count !== 1) throw new ErreurMetier('CONFLIT', `Communication ${communicationId} modifiée`)
    await tx.envoi.updateMany({
      where: { variante: { communicationId }, envoyeLe: null },
      data: { envoyeLe: new Date(), annulable: false },
    })
    await tx.variante.updateMany({
      where: { communicationId, etat: 'APPROUVEE' },
      data: { etat: 'ENVOYEE' },
    })
  })
}

/** Annulation dans la fenêtre : les envois non partis disparaissent, la communication reste approuvée. */
export async function annulerEnvoi(acteur: Acteur, communicationId: string): Promise<void> {
  exigerDroit(acteur.utilisateur, 'ENVOYER')
  await acteur.contexte.$transaction(async (tx) => {
    const communication = await communicationPour(communicationId, tx)
    if (communication.etat !== 'ENVOI_PLANIFIE') {
      throw new ErreurMetier(
        'ETAT_INCOMPATIBLE',
        `Communication ${communicationId} en ${communication.etat} : aucun envoi à annuler`,
      )
    }
    const { count } = await tx.communication.updateMany({
      where: { id: communicationId, etat: 'ENVOI_PLANIFIE' },
      data: { etat: 'APPROUVEE' },
    })
    if (count !== 1) throw new ErreurMetier('CONFLIT', `Communication ${communicationId} modifiée`)
    await tx.envoi.deleteMany({
      where: { variante: { communicationId }, envoyeLe: null, annulable: true },
    })
  })
}

export interface EnvoiLu {
  canal: string
  effectif: number
  listes: string[]
  envoyeLe: Date | null
  simule: boolean
}

/** Ce qui est planifié ou enregistré, tel que la base le garde. */
export async function chargerEnvois(acteur: Acteur, communicationId: string): Promise<EnvoiLu[]> {
  exigerDroit(acteur.utilisateur, 'CONSULTER')
  const lignes = await acteur.contexte.envoi.findMany({
    where: { variante: { communicationId } },
    select: { canal: true, destinataires: true, envoyeLe: true, etatRemise: true },
    orderBy: { creeLe: 'asc' },
  })
  return lignes.map((ligne) => {
    const d = (
      typeof ligne.destinataires === 'object' &&
      ligne.destinataires !== null &&
      !Array.isArray(ligne.destinataires)
        ? ligne.destinataires
        : {}
    ) as Record<string, unknown>
    const remise = (
      typeof ligne.etatRemise === 'object' &&
      ligne.etatRemise !== null &&
      !Array.isArray(ligne.etatRemise)
        ? ligne.etatRemise
        : {}
    ) as Record<string, unknown>
    return {
      canal: ligne.canal,
      effectif: typeof d['effectif'] === 'number' ? d['effectif'] : 0,
      listes: Array.isArray(d['listes'])
        ? d['listes'].filter((x): x is string => typeof x === 'string')
        : [],
      envoyeLe: ligne.envoyeLe,
      // Seul un canal réel peut dire « remis » ; tout le reste est une simulation.
      simule: remise['mode'] === 'SIMULATION' || remise['remis'] !== true,
    }
  })
}
