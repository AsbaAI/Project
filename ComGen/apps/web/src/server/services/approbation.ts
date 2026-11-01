import {
  type EtatCommunication,
  type MotifRefus,
  approbationsRequises,
  evaluerTransition,
} from '@comgen/core'
import { z } from 'zod'

import { exigerDroit } from '@/server/auth/droits'

import { type Acteur, ErreurMetier, introuvable } from './erreurs'
import { construireContexteTransition } from './etat'

/**
 * Soumission à l'approbation et décision humaine (§7).
 *
 * Trois garanties, portées ici et par la base — pas par l'écran :
 *  - on ne soumet qu'une communication dont toutes les variantes sont
 *    conformes, sans contrôle bloquant ouvert ;
 *  - les approbateurs sont désignés À LA SOUMISSION (ceux du persona, sinon
 *    tous les approbateurs de l'organisation), jamais l'auteur, et il doit
 *    y en avoir assez pour atteindre le quota de la criticité — sinon la
 *    soumission est refusée plutôt que de bloquer en silence ;
 *  - la communication n'est APPROUVEE que lorsque la garde du domaine
 *    l'autorise, une fois la décision écrite. Un rejet suffit à la
 *    rejeter ; il exige un motif.
 * Toute écriture de contenu annule les approbations : c'est le
 * déclencheur SQL, pas ce module.
 */

const SchemaDecision = z.object({
  communicationId: z.string().min(1),
  decision: z.enum(['APPROUVEE', 'REJETEE']),
  commentaire: z.string().trim().max(2000).optional(),
})

export interface EntreeDecision {
  communicationId: string
  decision: string
  commentaire?: string | undefined
}

function refus(motifs: [MotifRefus, ...MotifRefus[]], message: string): ErreurMetier {
  return new ErreurMetier('TRANSITION_REFUSEE', message, { motifs })
}

export async function soumettreALApprobation(
  acteur: Acteur,
  communicationId: string,
): Promise<{ approbateurs: number }> {
  exigerDroit(acteur.utilisateur, 'SOUMETTRE')
  return acteur.contexte.$transaction(async (tx) => {
    const communication = await tx.communication.findUnique({
      where: { id: communicationId },
      select: { id: true, etat: true, criticite: true, auteurId: true },
    })
    if (!communication) throw introuvable('Communication', communicationId)
    if (communication.etat !== 'EN_CONTROLE') {
      throw new ErreurMetier(
        'ETAT_INCOMPATIBLE',
        `Communication ${communicationId} en ${communication.etat} : soumission impossible`,
      )
    }

    const variantes = await tx.variante.findMany({
      where: { communicationId },
      select: { id: true, etat: true, persona: { select: { approbateurIds: true } } },
    })
    if (variantes.length === 0) throw refus(['AUCUNE_VARIANTE'], 'Aucune variante à soumettre')
    if (variantes.some((v) => v.etat !== 'CONFORME')) {
      throw refus(['CONTROLE_BLOQUANT_NON_RESOLU'], 'Une variante n’est pas conforme')
    }
    const bloquants = await tx.controle.count({
      where: { variante: { communicationId }, bloquant: true, resoluLe: null },
    })
    if (bloquants > 0) {
      throw refus(['CONTROLE_BLOQUANT_NON_RESOLU'], 'Des contrôles bloquants restent ouverts')
    }

    // Contexte de la garde, pour le quota (faits déclarés compris).
    const { contexte } = await construireContexteTransition(
      tx,
      communicationId,
      communication.criticite,
    )
    const requises = approbationsRequises(communication.criticite, {
      faitsDeclares: contexte.faitsDeclares,
    })

    const approbateursOrganisation = await tx.utilisateur.findMany({
      where: { roles: { has: 'APPROBATEUR' }, id: { not: communication.auteurId } },
      select: { id: true },
    })
    const eligibles = new Set(approbateursOrganisation.map((u) => u.id))

    const lignes: { varianteId: string; utilisateurId: string }[] = []
    for (const variante of variantes) {
      const designes = variante.persona.approbateurIds
      const choisis =
        designes.length > 0 ? designes.filter((id) => eligibles.has(id)) : [...eligibles]
      if (choisis.length < requises) {
        throw refus(
          ['APPROBATIONS_INSUFFISANTES'],
          `${String(choisis.length)} approbateur(s) possible(s), ${String(requises)} requis`,
        )
      }
      for (const utilisateurId of choisis) lignes.push({ varianteId: variante.id, utilisateurId })
    }

    // Les deux transitions de la table, validées l'une après l'autre : la
    // relecture n'a pas encore d'écran propre, la soumission les enchaîne.
    for (const [de, vers] of [
      ['EN_CONTROLE', 'EN_RELECTURE'],
      ['EN_RELECTURE', 'EN_APPROBATION'],
    ] as const) {
      const resultat = evaluerTransition(de, vers, contexte)
      if (!resultat.autorisee) throw refus([...resultat.motifs], `${de} → ${vers} refusée`)
    }
    const { count } = await tx.communication.updateMany({
      where: { id: communicationId, etat: 'EN_CONTROLE' },
      data: { etat: 'EN_APPROBATION' },
    })
    if (count !== 1) throw new ErreurMetier('CONFLIT', `Communication ${communicationId} modifiée`)

    await tx.approbation.createMany({
      data: lignes.map((ligne) => ({
        organisationId: acteur.utilisateur.organisationId,
        communicationId,
        varianteId: ligne.varianteId,
        utilisateurId: ligne.utilisateurId,
        regime: 'APPROBATION' as const,
      })),
    })
    return { approbateurs: new Set(lignes.map((l) => l.utilisateurId)).size }
  })
}

export async function decider(
  acteur: Acteur,
  entree: EntreeDecision,
): Promise<{ etat: EtatCommunication }> {
  const analyse = SchemaDecision.safeParse(entree)
  if (!analyse.success) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'Décision invalide', {
      champs: { decision: 'invalide' },
    })
  }
  const { communicationId, decision, commentaire } = analyse.data
  // Un rejet se motive : sans motif, l'auteur ne saurait pas quoi corriger.
  if (decision === 'REJETEE' && (commentaire ?? '').length < 3) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'Un rejet exige un motif', {
      champs: { commentaire: 'requis' },
    })
  }

  return acteur.contexte.$transaction(async (tx) => {
    const communication = await tx.communication.findUnique({
      where: { id: communicationId },
      select: { id: true, etat: true, criticite: true, auteurId: true },
    })
    if (!communication) throw introuvable('Communication', communicationId)
    exigerDroit(acteur.utilisateur, decision === 'APPROUVEE' ? 'APPROUVER' : 'REJETER', {
      auteurId: communication.auteurId,
    })
    if (communication.etat !== 'EN_APPROBATION') {
      throw new ErreurMetier(
        'ETAT_INCOMPATIBLE',
        `Communication ${communicationId} en ${communication.etat} : rien à décider`,
      )
    }

    // Être désigné, c'est avoir une approbation en attente : pas d'autre porte.
    const enAttente = {
      communicationId,
      utilisateurId: acteur.utilisateur.id,
      decision: 'EN_ATTENTE' as const,
      annuleeLe: null,
    }
    const mes = await tx.approbation.count({ where: enAttente })
    if (mes === 0) {
      throw new ErreurMetier('ETAT_INCOMPATIBLE', 'Aucune approbation en attente pour vous')
    }
    const maintenant = new Date()
    await tx.approbation.updateMany({
      where: enAttente,
      data: { decision, commentaire: commentaire ?? null, decideLe: maintenant },
    })

    let etat: EtatCommunication = 'EN_APPROBATION'
    if (decision === 'REJETEE') {
      // Les autres décisions en attente tombent : le rejet les rend sans objet.
      await tx.approbation.updateMany({
        where: { communicationId, decision: 'EN_ATTENTE', annuleeLe: null },
        data: { annuleeLe: maintenant, motifAnnulation: 'REJET' },
      })
      etat = 'REJETEE'
    } else {
      const { contexte } = await construireContexteTransition(
        tx,
        communicationId,
        communication.criticite,
      )
      if (evaluerTransition('EN_APPROBATION', 'APPROUVEE', contexte).autorisee) etat = 'APPROUVEE'
    }
    if (etat !== 'EN_APPROBATION') {
      const { count } = await tx.communication.updateMany({
        where: { id: communicationId, etat: 'EN_APPROBATION' },
        data: { etat },
      })
      if (count !== 1)
        throw new ErreurMetier('CONFLIT', `Communication ${communicationId} modifiée`)
      if (etat === 'APPROUVEE') {
        await tx.variante.updateMany({
          where: { communicationId, etat: 'CONFORME' },
          data: { etat: 'APPROUVEE' },
        })
      }
    }
    return { etat }
  })
}

export interface ApprobationEnAttente {
  communicationId: string
  reference: string
  titre: string
  criticite: string
  auteurNom: string
  variantes: number
  /** Accordées / requises, pour que l'approbateur voie où en est le quota. */
  accordees: number
  requises: number
}

export interface DecisionPassee {
  communicationId: string
  reference: string
  titre: string
  decision: string
  commentaire: string | null
  decideLe: Date
}

export interface EcranApprobations {
  enAttente: ApprobationEnAttente[]
  historique: DecisionPassee[]
}

export async function chargerApprobations(acteur: Acteur): Promise<EcranApprobations> {
  exigerDroit(acteur.utilisateur, 'CONSULTER')
  const moi = acteur.utilisateur.id
  const [mesLignes, mesDecisions] = await Promise.all([
    acteur.contexte.approbation.findMany({
      where: {
        utilisateurId: moi,
        decision: 'EN_ATTENTE',
        annuleeLe: null,
        communication: { etat: 'EN_APPROBATION' },
      },
      select: {
        communication: {
          select: {
            id: true,
            reference: true,
            titre: true,
            criticite: true,
            auteur: { select: { nom: true } },
            variantes: { select: { id: true } },
          },
        },
      },
      orderBy: { creeLe: 'asc' },
    }),
    acteur.contexte.approbation.findMany({
      where: {
        utilisateurId: moi,
        decision: { in: ['APPROUVEE', 'REJETEE'] },
        decideLe: { not: null },
      },
      select: {
        decision: true,
        commentaire: true,
        decideLe: true,
        communication: { select: { id: true, reference: true, titre: true } },
      },
      orderBy: { decideLe: 'desc' },
      take: 50,
    }),
  ])

  const parCommunication = new Map(mesLignes.map((l) => [l.communication.id, l.communication]))
  const enAttente: ApprobationEnAttente[] = await Promise.all(
    [...parCommunication.values()].map(async (c) => {
      const [accordees, { contexte }] = await Promise.all([
        acteur.contexte.approbation.count({
          where: { communicationId: c.id, decision: 'APPROUVEE', annuleeLe: null },
        }),
        construireContexteTransition(acteur.contexte, c.id, c.criticite),
      ])
      return {
        communicationId: c.id,
        reference: c.reference,
        titre: c.titre,
        criticite: c.criticite,
        auteurNom: c.auteur.nom,
        variantes: c.variantes.length,
        accordees: c.variantes.length === 0 ? 0 : Math.floor(accordees / c.variantes.length),
        requises: approbationsRequises(c.criticite, { faitsDeclares: contexte.faitsDeclares }),
      }
    }),
  )
  return {
    enAttente,
    historique: mesDecisions.flatMap((d) =>
      d.decideLe === null
        ? []
        : [
            {
              communicationId: d.communication.id,
              reference: d.communication.reference,
              titre: d.communication.titre,
              decision: d.decision,
              commentaire: d.commentaire,
              decideLe: d.decideLe,
            },
          ],
    ),
  }
}
