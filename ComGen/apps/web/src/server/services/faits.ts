import {
  type Contradiction,
  type EtatCommunication,
  NIVEAUX,
  type Niveau,
  type StatutFait,
  TYPES_VALEUR,
  type TypeSource,
  type TypeValeur,
  formaterReferenceFait,
  localiserCitation,
  verifierCitation,
} from '@comgen/core'
import type { ContexteTransaction } from '@comgen/db'
import { z } from 'zod'

import { exigerDroit, verifierDroit } from '@/server/auth/droits'

import { type Acteur, ErreurMetier, introuvable } from './erreurs'
import { ETATS_FICHE_OUVERTE, type TransitionEvaluee, evaluerTransitionsManuelles } from './etat'

/**
 * Fiche de faits (spécification §11, §15) : revue fait par fait, citation en
 * regard. Règles tenues ici, côté serveur :
 * - une citation est un extrait mot pour mot de sa source, vérifié par
 *   comparaison de chaînes ;
 * - la valeur d'un fait ajouté figure telle quelle dans sa citation ;
 * - changer une valeur passe par un amendement justifié (§11), jamais par
 *   une simple mise à jour ;
 * - toute modification d'une fiche PRETE_A_GENERER la renvoie en
 *   FAITS_A_VALIDER : la garde sera réévaluée sur la fiche modifiée.
 */

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

export interface SourceDeFiche {
  id: string
  type: TypeSource
  nom: string
  langue: string | null
  confidentialite: Niveau
  empreinte: string
  figeeLe: Date
  contenuTexte: string
  fichierConserve: boolean
}

export interface AmendementDeFiche {
  ancienneValeur: string | null
  nouvelleValeur: string
  justification: string
  sourceInvoquee: string | null
  responsabiliteAssumee: boolean
  auteurNom: string
  creeLe: Date
}

export interface FaitDeFiche {
  id: string
  reference: string
  enonce: string
  valeur: string | null
  typeValeur: TypeValeur | null
  citation: string
  sourceId: string
  localisation: { offsetDebut: number; offsetFin: number; ligne?: number; page?: number }
  confiance: number
  confidentialite: Niveau
  statut: StatutFait
  amendements: AmendementDeFiche[]
  /** Indice de la contradiction à laquelle ce fait participe, s'il y en a une. */
  contradiction: number | null
}

export interface Fiche {
  communication: {
    id: string
    reference: string
    titre: string
    etat: EtatCommunication
    langue: string
  }
  sources: SourceDeFiche[]
  faits: FaitDeFiche[]
  contradictions: Contradiction[]
  transitions: TransitionEvaluee[]
  /** La fiche se modifie (état et droit réunis). */
  modifiable: boolean
}

function lireLocalisation(brute: unknown): FaitDeFiche['localisation'] {
  const objet = (typeof brute === 'object' && brute !== null ? brute : {}) as Record<
    string,
    unknown
  >
  const nombre = (cle: string) =>
    typeof objet[cle] === 'number' ? (objet[cle] as number) : undefined
  const localisation: FaitDeFiche['localisation'] = {
    offsetDebut: nombre('offsetDebut') ?? 0,
    offsetFin: nombre('offsetFin') ?? 0,
  }
  const ligne = nombre('ligne')
  const page = nombre('page')
  if (ligne !== undefined) localisation.ligne = ligne
  if (page !== undefined) localisation.page = page
  return localisation
}

export async function chargerFiche(acteur: Acteur, communicationId: string): Promise<Fiche> {
  const { utilisateur, contexte } = acteur
  exigerDroit(utilisateur, 'CONSULTER')
  const communication = await contexte.communication.findUnique({
    where: { id: communicationId },
    select: { id: true, reference: true, titre: true, etat: true, langue: true, criticite: true },
  })
  if (!communication) throw introuvable('Communication', communicationId)

  const [sources, faits, { transitions, contradictions }] = await Promise.all([
    contexte.source.findMany({
      where: { communicationId },
      orderBy: [{ figeeLe: 'asc' }, { nom: 'asc' }],
    }),
    contexte.fait.findMany({
      where: { communicationId },
      orderBy: { reference: 'asc' },
      include: {
        amendements: {
          orderBy: { creeLe: 'desc' },
          include: { auteur: { select: { nom: true } } },
        },
      },
    }),
    evaluerTransitionsManuelles(contexte, communication),
  ])

  const indiceContradiction = new Map<string, number>()
  contradictions.forEach((c, i) => {
    for (const fait of c.faits) indiceContradiction.set(fait.id, i)
  })

  return {
    communication: {
      id: communication.id,
      reference: communication.reference,
      titre: communication.titre,
      etat: communication.etat,
      langue: communication.langue,
    },
    sources: sources.map((s) => ({
      id: s.id,
      type: s.type,
      nom: s.nom,
      langue: s.langue,
      confidentialite: s.confidentialite,
      empreinte: s.empreinte,
      figeeLe: s.figeeLe,
      contenuTexte: s.contenuTexte ?? '',
      fichierConserve: s.cheminStockage !== null,
    })),
    faits: faits.map((f) => ({
      id: f.id,
      reference: f.reference,
      enonce: f.enonce,
      valeur: f.valeur,
      typeValeur: f.typeValeur,
      citation: f.citation,
      sourceId: f.sourceId,
      localisation: lireLocalisation(f.localisation),
      confiance: f.confiance,
      confidentialite: f.confidentialite,
      statut: f.statut,
      contradiction: indiceContradiction.get(f.id) ?? null,
      amendements: f.amendements.map((a) => ({
        ancienneValeur: a.ancienneValeur,
        nouvelleValeur: a.nouvelleValeur,
        justification: a.justification,
        sourceInvoquee: a.sourceInvoquee,
        responsabiliteAssumee: a.responsabiliteAssumee,
        auteurNom: a.auteur.nom,
        creeLe: a.creeLe,
      })),
    })),
    contradictions,
    transitions,
    modifiable:
      ETATS_FICHE_OUVERTE.has(communication.etat) && verifierDroit(utilisateur, 'EDITER').autorise,
  }
}

// ---------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------

function exigerFicheOuverte(etat: EtatCommunication, communicationId: string): void {
  if (!ETATS_FICHE_OUVERTE.has(etat)) {
    throw new ErreurMetier(
      'ETAT_INCOMPATIBLE',
      `Communication ${communicationId} en ${etat} : la fiche de faits est figée`,
    )
  }
}

/** Une fiche modifiée n'est plus « prête » : retour en FAITS_A_VALIDER, garde à réévaluer. */
async function rouvrirSiPrete(tx: ContexteTransaction, communicationId: string): Promise<void> {
  await tx.communication.updateMany({
    where: { id: communicationId, etat: 'PRETE_A_GENERER' },
    data: { etat: 'FAITS_A_VALIDER' },
  })
}

type FaitLu = { id: string; statut: StatutFait; communicationId: string }

async function modifierFait(
  acteur: Acteur,
  faitId: string,
  ecrire: (tx: ContexteTransaction, fait: FaitLu) => Promise<void>,
): Promise<void> {
  exigerDroit(acteur.utilisateur, 'EDITER')
  await acteur.contexte.$transaction(async (tx) => {
    const fait = await tx.fait.findUnique({
      where: { id: faitId },
      select: {
        id: true,
        statut: true,
        communicationId: true,
        communication: { select: { etat: true } },
      },
    })
    if (!fait) throw introuvable('Fait', faitId)
    exigerFicheOuverte(fait.communication.etat, fait.communicationId)
    await ecrire(tx, fait)
    await rouvrirSiPrete(tx, fait.communicationId)
  })
}

function exigerStatut(fait: FaitLu, admis: readonly StatutFait[], operation: string): void {
  if (!admis.includes(fait.statut)) {
    throw new ErreurMetier('ETAT_INCOMPATIBLE', `${operation} impossible : fait ${fait.statut}`)
  }
}

export async function confirmerFait(acteur: Acteur, faitId: string): Promise<void> {
  await modifierFait(acteur, faitId, async (tx, fait) => {
    exigerStatut(fait, ['PROPOSE'], 'Confirmation')
    await tx.fait.update({ where: { id: fait.id }, data: { statut: 'CONFIRME' } })
  })
}

export async function retirerFait(acteur: Acteur, faitId: string): Promise<void> {
  await modifierFait(acteur, faitId, async (tx, fait) => {
    exigerStatut(fait, ['PROPOSE', 'CONFIRME', 'DECLARE'], 'Retrait')
    await tx.fait.update({ where: { id: fait.id }, data: { statut: 'RETIRE' } })
  })
}

/** Annule un retrait : le fait redevient PROPOSE et doit être revu. */
export async function retablirFait(acteur: Acteur, faitId: string): Promise<void> {
  await modifierFait(acteur, faitId, async (tx, fait) => {
    exigerStatut(fait, ['RETIRE'], 'Rétablissement')
    await tx.fait.update({ where: { id: fait.id }, data: { statut: 'PROPOSE' } })
  })
}

export async function changerConfidentialiteFait(
  acteur: Acteur,
  faitId: string,
  saisi: string | undefined,
): Promise<void> {
  const niveau = NIVEAUX.find((n) => n === saisi)
  if (niveau === undefined) {
    throw new ErreurMetier('DONNEES_INVALIDES', `Niveau inconnu : ${saisi}`, {
      champs: { confidentialite: 'invalide' },
    })
  }
  await modifierFait(acteur, faitId, async (tx, fait) => {
    await tx.fait.update({ where: { id: fait.id }, data: { confidentialite: niveau } })
  })
}

const SchemaEnonce = z
  .string({ error: 'requis' })
  .trim()
  .min(3, { error: 'trop_court' })
  .max(1000, { error: 'trop_long' })

/**
 * L'énoncé est le libellé humain du fait : il se reformule librement, la
 * citation et la valeur restent celles de la source. C'est aussi ce qui
 * rapproche deux faits pour détecter une contradiction.
 */
export async function modifierEnonce(
  acteur: Acteur,
  faitId: string,
  enonce: string,
): Promise<void> {
  const analyse = SchemaEnonce.safeParse(enonce)
  if (!analyse.success) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'Énoncé invalide', {
      champs: { enonce: analyse.error.issues[0]?.message ?? 'invalide' },
    })
  }
  await modifierFait(acteur, faitId, async (tx, fait) => {
    exigerStatut(fait, ['PROPOSE', 'CONFIRME', 'DECLARE'], 'Modification')
    await tx.fait.update({ where: { id: fait.id }, data: { enonce: analyse.data } })
  })
}

const SchemaAmendement = z
  .object({
    nouvelleValeur: z
      .string({ error: 'requis' })
      .trim()
      .min(1, { error: 'requis' })
      .max(500, { error: 'trop_long' }),
    justification: z
      .string({ error: 'requis' })
      .trim()
      .min(10, { error: 'trop_court' })
      .max(2000, { error: 'trop_long' }),
    sourceInvoquee: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().trim().max(300, { error: 'trop_long' }).optional(),
    ),
    responsabiliteAssumee: z.boolean(),
  })
  .superRefine((a, ctx) => {
    if (a.sourceInvoquee === undefined && !a.responsabiliteAssumee) {
      ctx.addIssue({ code: 'custom', path: ['sourceInvoquee'], message: 'appui_requis' })
    }
  })

export type EntreeAmendement = z.input<typeof SchemaAmendement>

/**
 * Change la valeur d'un fait (§11) : justification obligatoire, et une
 * source invoquée ou la responsabilité assumée (le fait devient alors
 * DECLARE, visible des approbateurs, et impose une approbation). Le dépôt
 * de données trace l'amendement et annule les approbations en cours.
 */
export async function amenderValeur(
  acteur: Acteur,
  faitId: string,
  entree: EntreeAmendement,
): Promise<void> {
  const { utilisateur, contexte } = acteur
  exigerDroit(utilisateur, 'EDITER')
  const analyse = SchemaAmendement.safeParse(entree)
  if (!analyse.success) {
    const champs: Record<string, string> = {}
    for (const issue of analyse.error.issues) champs[String(issue.path[0])] ??= issue.message
    throw new ErreurMetier('DONNEES_INVALIDES', 'Amendement invalide', { champs })
  }

  const fait = await contexte.fait.findUnique({
    where: { id: faitId },
    select: {
      id: true,
      statut: true,
      valeur: true,
      communicationId: true,
      communication: { select: { etat: true } },
    },
  })
  if (!fait) throw introuvable('Fait', faitId)
  exigerFicheOuverte(fait.communication.etat, fait.communicationId)
  if (fait.statut === 'RETIRE' || fait.statut === 'PERIME') {
    throw new ErreurMetier('ETAT_INCOMPATIBLE', `Amendement impossible : fait ${fait.statut}`)
  }
  if (fait.valeur === analyse.data.nouvelleValeur) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'La valeur est inchangée', {
      champs: { nouvelleValeur: 'inchangee' },
    })
  }

  // Rouvrir d'abord : si l'amendement échoue ensuite, la fiche est simplement à revoir.
  await contexte.communication.updateMany({
    where: { id: fait.communicationId, etat: 'PRETE_A_GENERER' },
    data: { etat: 'FAITS_A_VALIDER' },
  })
  await contexte.amenderFait({
    faitId: fait.id,
    nouvelleValeur: analyse.data.nouvelleValeur,
    justification: analyse.data.justification,
    ...(analyse.data.sourceInvoquee === undefined
      ? {}
      : { sourceInvoquee: analyse.data.sourceInvoquee }),
    responsabiliteAssumee: analyse.data.responsabiliteAssumee,
    auteurId: utilisateur.id,
  })
}

const SchemaNouveauFait = z
  .object({
    sourceId: z.string({ error: 'requis' }).min(1, { error: 'requis' }),
    citation: z
      .string({ error: 'requis' })
      .min(1, { error: 'requis' })
      .max(2000, { error: 'trop_long' }),
    enonce: SchemaEnonce,
    typeValeur: z.enum(TYPES_VALEUR, { error: 'requis' }),
    valeur: z.preprocess(
      (v) => (typeof v === 'string' && v === '' ? undefined : v),
      z.string().max(500, { error: 'trop_long' }).optional(),
    ),
    confidentialite: z.enum(NIVEAUX, { error: 'invalide' }),
  })
  .superRefine((f, ctx) => {
    if (f.typeValeur !== 'TEXTE' && f.valeur === undefined) {
      ctx.addIssue({ code: 'custom', path: ['valeur'], message: 'requis' })
    }
  })

/** Entrée brute d'un formulaire : des chaînes, validées ici. */
export type EntreeNouveauFait = Partial<
  Record<keyof z.input<typeof SchemaNouveauFait>, string | undefined>
>

/**
 * Ajoute un fait relevé à la main dans une source. La citation doit être un
 * extrait exact du texte de la source ; la valeur, recopiée de la citation,
 * doit y figurer telle quelle. Le fait, lu par un humain, est CONFIRME.
 */
export async function ajouterFait(
  acteur: Acteur,
  communicationId: string,
  entree: EntreeNouveauFait,
): Promise<{ id: string; reference: string }> {
  exigerDroit(acteur.utilisateur, 'EDITER')
  const analyse = SchemaNouveauFait.safeParse(entree)
  if (!analyse.success) {
    const champs: Record<string, string> = {}
    for (const issue of analyse.error.issues) champs[String(issue.path[0])] ??= issue.message
    throw new ErreurMetier('DONNEES_INVALIDES', 'Fait invalide', { champs })
  }
  const nouveau = analyse.data

  return acteur.contexte.$transaction(async (tx) => {
    const communication = await tx.communication.findUnique({
      where: { id: communicationId },
      select: { id: true, etat: true },
    })
    if (!communication) throw introuvable('Communication', communicationId)
    exigerFicheOuverte(communication.etat, communicationId)

    const source = await tx.source.findFirst({
      where: { id: nouveau.sourceId, communicationId },
      select: { id: true, contenuTexte: true },
    })
    if (!source) {
      throw new ErreurMetier('DONNEES_INVALIDES', 'Source inconnue', {
        champs: { sourceId: 'invalide' },
      })
    }
    const contenu = source.contenuTexte ?? ''
    const verification = verifierCitation(contenu, nouveau.citation)
    const localisation = localiserCitation(contenu, nouveau.citation)
    if (!verification.valide || localisation === null) {
      throw new ErreurMetier('CITATION_INVALIDE', 'La citation ne figure pas dans la source', {
        champs: { citation: 'absente_de_la_source' },
      })
    }
    if (nouveau.valeur !== undefined && !nouveau.citation.includes(nouveau.valeur)) {
      throw new ErreurMetier('VALEUR_HORS_CITATION', 'La valeur ne figure pas dans la citation', {
        champs: { valeur: 'absente_de_la_citation' },
      })
    }

    const existants = await tx.fait.findMany({
      where: { communicationId },
      select: { reference: true },
    })
    const numero =
      existants.reduce((max, { reference }) => {
        const n = Number.parseInt(reference.replace(/^F-/, ''), 10)
        return Number.isNaN(n) ? max : Math.max(max, n)
      }, 0) + 1

    const cree = await tx.fait.create({
      data: {
        organisationId: acteur.utilisateur.organisationId,
        communicationId,
        reference: formaterReferenceFait(numero),
        enonce: nouveau.enonce,
        valeur: nouveau.valeur ?? null,
        typeValeur: nouveau.typeValeur,
        citation: nouveau.citation,
        sourceId: source.id,
        localisation,
        confiance: 1,
        confidentialite: nouveau.confidentialite,
        statut: 'CONFIRME',
      },
      select: { id: true, reference: true },
    })
    await rouvrirSiPrete(tx, communicationId)
    return cree
  })
}
