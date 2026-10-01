import {
  CRITICITES,
  type Contradiction,
  type Criticite,
  type EtatCommunication,
  INTENTIONS_REPRISE,
  type IntentionReprise,
  MODES_ENTREE,
  type ModeEntree,
  NATURES,
  type Nature,
  PORTEES,
  type Portee,
  evaluerTransition,
  heureLocaleVersUtc,
} from '@comgen/core'
import { z } from 'zod'

import { exigerDroit, verifierDroit } from '@/server/auth/droits'

import { type Acteur, ErreurMetier, introuvable } from './erreurs'
import {
  type TransitionEvaluee,
  construireContexteTransition,
  estTransitionManuelle,
  evaluerTransitionsManuelles,
} from './etat'

/**
 * Communications : cadrage, consultation, tableau de bord, transitions
 * manuelles (spécification §7, §15).
 */

/** Modes d'entrée livrés à ce jour ; les autres sont refusés explicitement. */
export const MODES_DISPONIBLES: readonly ModeEntree[] = ['FICHIER', 'TEXTE_SAISI']

/** Langues de rédaction prises en charge (l'interface et les contrôles). */
export const LANGUES_COMMUNICATION = ['fr', 'en'] as const

// ---------------------------------------------------------------------------
// Cadrage
// ---------------------------------------------------------------------------

const vide = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v)

const SchemaCadrage = z
  .object({
    titre: z
      .string({ error: 'requis' })
      .trim()
      .min(3, { error: 'trop_court' })
      .max(200, { error: 'trop_long' }),
    nature: z.enum(NATURES, { error: 'requis' }),
    criticite: z.enum(CRITICITES, { error: 'requis' }),
    portee: z.enum(PORTEES, { error: 'requis' }),
    langue: z.enum(LANGUES_COMMUNICATION, { error: 'requis' }),
    dateEffet: z.preprocess(vide, z.string().optional()),
    echeance: z.preprocess(vide, z.string().optional()),
    modeEntree: z.enum(MODES_ENTREE, { error: 'requis' }),
    parentId: z.preprocess(vide, z.string().optional()),
    intentionReprise: z.preprocess(vide, z.enum(INTENTIONS_REPRISE).optional()),
  })
  .superRefine((cadrage, ctx) => {
    if (cadrage.parentId !== undefined && cadrage.intentionReprise === undefined) {
      ctx.addIssue({ code: 'custom', path: ['intentionReprise'], message: 'requis' })
    }
    if (cadrage.parentId === undefined && cadrage.intentionReprise !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['parentId'], message: 'requis' })
    }
  })

export type EntreeCadrage = z.input<typeof SchemaCadrage>

function erreurValidation(issues: readonly z.core.$ZodIssue[]): ErreurMetier {
  const champs: Record<string, string> = {}
  for (const issue of issues) {
    const champ = String(issue.path[0] ?? 'formulaire')
    champs[champ] ??= issue.message
  }
  return new ErreurMetier('DONNEES_INVALIDES', 'Cadrage invalide', { champs })
}

async function fuseauDe(acteur: Acteur): Promise<string> {
  const { contexte, utilisateur } = acteur
  if (utilisateur.siteId !== null) {
    const site = await contexte.site.findUnique({
      where: { id: utilisateur.siteId },
      select: { fuseauHoraire: true },
    })
    if (site) return site.fuseauHoraire
  }
  const organisation = await contexte.organisation.findUnique({
    where: { id: utilisateur.organisationId },
    select: { fuseauHoraire: true },
  })
  if (!organisation) throw introuvable('Organisation', utilisateur.organisationId)
  return organisation.fuseauHoraire
}

/** Fuseau dans lequel l'acteur saisit et lit les dates (site, sinon organisation). */
export async function fuseauDeSaisie(acteur: Acteur): Promise<string> {
  return fuseauDe(acteur)
}

export async function creerCommunication(
  acteur: Acteur,
  entree: EntreeCadrage,
): Promise<{ id: string; reference: string }> {
  const { utilisateur, contexte } = acteur
  exigerDroit(utilisateur, 'CREER')

  const analyse = SchemaCadrage.safeParse(entree)
  if (!analyse.success) throw erreurValidation(analyse.error.issues)
  const cadrage = analyse.data
  const champs: Record<string, string> = {}

  if (!MODES_DISPONIBLES.includes(cadrage.modeEntree)) {
    champs['modeEntree'] = 'mode_non_disponible'
  }

  const region = await contexte.region.findUnique({
    where: { id: utilisateur.regionId },
    select: { localesAutorisees: true },
  })
  if (!region) throw introuvable('Région', utilisateur.regionId)
  if (!region.localesAutorisees.includes(cadrage.langue)) {
    champs['langue'] = 'langue_non_autorisee'
  }

  const fuseau = await fuseauDe(acteur)
  const dates: { dateEffet?: Date; echeance?: Date } = {}
  for (const champ of ['dateEffet', 'echeance'] as const) {
    const valeur = cadrage[champ]
    if (valeur === undefined) continue
    const conversion = heureLocaleVersUtc(valeur, fuseau)
    if (conversion.statut === 'OK') dates[champ] = conversion.instant
    else champs[champ] = `heure_${conversion.statut.toLowerCase()}`
  }

  if (cadrage.parentId !== undefined) {
    // Lu dans le contexte cloisonné : un parent d'une autre organisation est introuvable.
    const parent = await contexte.communication.findUnique({
      where: { id: cadrage.parentId },
      select: { id: true },
    })
    if (!parent) champs['parentId'] = 'parent_introuvable'
  }

  if (Object.keys(champs).length > 0) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'Cadrage invalide', { champs })
  }

  const reference = await contexte.prochaineReference(new Date().getUTCFullYear())
  const creee = await contexte.communication.create({
    data: {
      organisationId: utilisateur.organisationId,
      regionId: utilisateur.regionId,
      reference,
      titre: cadrage.titre,
      nature: cadrage.nature,
      criticite: cadrage.criticite,
      portee: cadrage.portee,
      langue: cadrage.langue,
      dateEffet: dates.dateEffet ?? null,
      echeance: dates.echeance ?? null,
      modeEntree: cadrage.modeEntree,
      auteurId: utilisateur.id,
      parentId: cadrage.parentId ?? null,
      intentionReprise: cadrage.intentionReprise ?? null,
    },
    select: { id: true, reference: true },
  })
  return creee
}

// ---------------------------------------------------------------------------
// Consultation
// ---------------------------------------------------------------------------

export interface ResumeCommunication {
  id: string
  reference: string
  titre: string
  nature: Nature
  criticite: Criticite
  portee: Portee
  langue: string
  etat: EtatCommunication
  modeEntree: ModeEntree
  modifieLe: Date
  auteurNom: string
}

const SELECTION_RESUME = {
  id: true,
  reference: true,
  titre: true,
  nature: true,
  criticite: true,
  portee: true,
  langue: true,
  etat: true,
  modeEntree: true,
  modifieLe: true,
  auteur: { select: { nom: true } },
} as const

function versResume(ligne: {
  id: string
  reference: string
  titre: string
  nature: Nature
  criticite: Criticite
  portee: Portee
  langue: string
  etat: EtatCommunication
  modeEntree: ModeEntree
  modifieLe: Date
  auteur: { nom: string }
}): ResumeCommunication {
  return {
    id: ligne.id,
    reference: ligne.reference,
    titre: ligne.titre,
    nature: ligne.nature,
    criticite: ligne.criticite,
    portee: ligne.portee,
    langue: ligne.langue,
    etat: ligne.etat,
    modeEntree: ligne.modeEntree,
    modifieLe: ligne.modifieLe,
    auteurNom: ligne.auteur.nom,
  }
}

export async function listerCommunications(acteur: Acteur): Promise<ResumeCommunication[]> {
  exigerDroit(acteur.utilisateur, 'CONSULTER')
  const lignes = await acteur.contexte.communication.findMany({
    select: SELECTION_RESUME,
    orderBy: [{ modifieLe: 'desc' }, { reference: 'desc' }],
  })
  return lignes.map(versResume)
}

/** Candidats au rattachement (reprise) : communications non archivées de l'organisation. */
export async function listerParentsPossibles(
  acteur: Acteur,
): Promise<{ id: string; reference: string; titre: string }[]> {
  exigerDroit(acteur.utilisateur, 'CREER')
  return acteur.contexte.communication.findMany({
    where: { etat: { not: 'ARCHIVEE' } },
    select: { id: true, reference: true, titre: true },
    orderBy: { reference: 'desc' },
  })
}

export interface DroitsCommunication {
  editer: boolean
}

export interface DetailCommunication {
  communication: ResumeCommunication & {
    dateEffet: Date | null
    echeance: Date | null
    creeLe: Date
    intentionReprise: IntentionReprise | null
    parent: { id: string; reference: string; titre: string } | null
  }
  compteurs: { sources: number; faits: number; faitsAValider: number }
  contradictions: Contradiction[]
  transitions: TransitionEvaluee[]
  droits: DroitsCommunication
}

export async function chargerCommunication(
  acteur: Acteur,
  id: string,
): Promise<DetailCommunication> {
  const { utilisateur, contexte } = acteur
  exigerDroit(utilisateur, 'CONSULTER')
  const ligne = await contexte.communication.findUnique({
    where: { id },
    select: {
      ...SELECTION_RESUME,
      dateEffet: true,
      echeance: true,
      creeLe: true,
      intentionReprise: true,
      parent: { select: { id: true, reference: true, titre: true } },
      _count: { select: { sources: true, faits: true } },
    },
  })
  if (!ligne) throw introuvable('Communication', id)

  const [{ transitions, contradictions }, faitsAValider] = await Promise.all([
    evaluerTransitionsManuelles(contexte, ligne),
    contexte.fait.count({ where: { communicationId: id, statut: 'PROPOSE' } }),
  ])

  return {
    communication: {
      ...versResume(ligne),
      dateEffet: ligne.dateEffet,
      echeance: ligne.echeance,
      creeLe: ligne.creeLe,
      intentionReprise: ligne.intentionReprise,
      parent: ligne.parent,
    },
    compteurs: { sources: ligne._count.sources, faits: ligne._count.faits, faitsAValider },
    contradictions,
    transitions,
    droits: {
      editer: verifierDroit(utilisateur, 'EDITER').autorise,
    },
  }
}

// ---------------------------------------------------------------------------
// Transitions manuelles
// ---------------------------------------------------------------------------

export async function changerEtat(
  acteur: Acteur,
  id: string,
  vers: EtatCommunication,
): Promise<void> {
  const { utilisateur, contexte } = acteur
  exigerDroit(utilisateur, 'EDITER')

  await contexte.$transaction(async (tx) => {
    const communication = await tx.communication.findUnique({
      where: { id },
      select: { id: true, etat: true, criticite: true },
    })
    if (!communication) throw introuvable('Communication', id)
    if (!estTransitionManuelle(communication.etat, vers)) {
      throw new ErreurMetier(
        'TRANSITION_NON_MANUELLE',
        `${communication.etat} → ${vers} ne se déclenche pas depuis cet écran`,
      )
    }
    const { contexte: contexteTransition } = await construireContexteTransition(
      tx,
      id,
      communication.criticite,
    )
    const resultat = evaluerTransition(communication.etat, vers, contexteTransition)
    if (!resultat.autorisee) {
      throw new ErreurMetier('TRANSITION_REFUSEE', `${communication.etat} → ${vers} refusée`, {
        motifs: resultat.motifs,
      })
    }
    // Écriture conditionnelle : si l'état a changé depuis la lecture, rien n'est écrit.
    const { count } = await tx.communication.updateMany({
      where: { id, etat: communication.etat },
      data: { etat: vers },
    })
    if (count !== 1) throw new ErreurMetier('CONFLIT', `Communication ${id} modifiée entre-temps`)
  })
}

// ---------------------------------------------------------------------------
// Tableau de bord
// ---------------------------------------------------------------------------

export interface CommunicationBloquee {
  communication: ResumeCommunication
  /** Ce qui bloque, en termes que l'interface traduit. */
  motif: 'CONTRADICTION_NON_TRANCHEE' | 'A_CORRIGER' | 'REJETEE'
  contradictions: number
}

export interface TableauDeBord {
  mesCommunications: ResumeCommunication[]
  parEtat: Partial<Record<EtatCommunication, number>>
  aApprouver: ResumeCommunication[]
  bloquees: CommunicationBloquee[]
}

export async function chargerTableauDeBord(acteur: Acteur): Promise<TableauDeBord> {
  const { utilisateur, contexte } = acteur
  exigerDroit(utilisateur, 'CONSULTER')

  const [mes, approbationsEnAttente] = await Promise.all([
    contexte.communication.findMany({
      where: { auteurId: utilisateur.id, etat: { not: 'ARCHIVEE' } },
      select: { ...SELECTION_RESUME, criticite: true },
      orderBy: [{ modifieLe: 'desc' }, { reference: 'desc' }],
    }),
    contexte.approbation.findMany({
      where: {
        utilisateurId: utilisateur.id,
        decision: 'EN_ATTENTE',
        annuleeLe: null,
        communication: { etat: 'EN_APPROBATION' },
      },
      select: { communication: { select: SELECTION_RESUME } },
      orderBy: { creeLe: 'asc' },
    }),
  ])

  const parEtat: Partial<Record<EtatCommunication, number>> = {}
  for (const ligne of mes) parEtat[ligne.etat] = (parEtat[ligne.etat] ?? 0) + 1

  const aApprouver = [
    ...new Map(
      approbationsEnAttente.map((a) => [a.communication.id, versResume(a.communication)]),
    ).values(),
  ]

  const bloquees: CommunicationBloquee[] = []
  const aExaminer = mes.filter((c) => c.etat === 'FAITS_A_VALIDER' || c.etat === 'PRETE_A_GENERER')
  const contextes = await Promise.all(
    aExaminer.map((c) => construireContexteTransition(contexte, c.id, c.criticite)),
  )
  aExaminer.forEach((ligne, i) => {
    const nombre = contextes[i]?.contradictions.length ?? 0
    if (nombre > 0) {
      bloquees.push({
        communication: versResume(ligne),
        motif: 'CONTRADICTION_NON_TRANCHEE',
        contradictions: nombre,
      })
    }
  })
  for (const ligne of mes) {
    if (ligne.etat === 'A_CORRIGER' || ligne.etat === 'REJETEE') {
      bloquees.push({ communication: versResume(ligne), motif: ligne.etat, contradictions: 0 })
    }
  }

  return { mesCommunications: mes.map(versResume), parEtat, aApprouver, bloquees }
}
