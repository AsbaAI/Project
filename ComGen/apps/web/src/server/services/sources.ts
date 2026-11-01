import { createHash, randomUUID } from 'node:crypto'

import {
  type Agent,
  type JeuAgents,
  type SortieAnalyste,
  type SortieExtracteur,
  type SortieSuggesteur,
  estErreurOrchestration,
  etape,
  fabriqueAgents,
  orchestrer,
} from '@comgen/agents'
import {
  NIVEAUX,
  type Niveau,
  detecterLangue,
  formaterReferenceFait,
  normaliserTexteSource,
  verifierCitation,
} from '@comgen/core'
import type { ContexteTransaction, Prisma } from '@comgen/db'
import { z } from 'zod'

import { type Antivirus, ErreurAntivirus } from '@/server/antivirus'
import { exigerDroit } from '@/server/auth/droits'
import {
  type CodeErreurExtraction,
  ErreurExtraction,
  type FormatSource,
  TAILLE_MAX_OCTETS,
  extraireTexte,
} from '@/server/extraction'
import { type Stockage, cleSource } from '@/server/stockage'

import { type Acteur, ErreurMetier, introuvable } from './erreurs'
import { ETATS_ENTREE_OUVERTE } from './etat'
import { type LigneExecution, ligneEchouee, ligneReussie } from './executions'

/**
 * Entrée des sources (spécification §10) : dépôt de fichiers et texte saisi.
 * Les deux convergent vers une `Source` figée — texte normalisé, empreinte
 * SHA-256, langue détectée — et des faits candidats PROPOSE, chacun cité
 * mot pour mot. Rien n'est présenté comme lu si ça ne l'a pas été.
 */

export interface DependancesEntree {
  stockage: Stockage
  antivirus: Antivirus
}

export const FICHIERS_PAR_DEPOT = 20
export const TAILLE_MAX_TEXTE = 200_000
/** Volume total d'un dépôt ; chaque fichier reste borné par TAILLE_MAX_OCTETS. */
export const TAILLE_MAX_DEPOT_OCTETS = 50 * 1024 * 1024

export interface FichierDepose {
  nom: string
  octets: Uint8Array
}

export type MotifRefusFichier =
  CodeErreurExtraction | 'INFECTE' | 'ANTIVIRUS_INDISPONIBLE' | 'EN_DOUBLE' | 'NOM_INVALIDE'

export type ResultatFichier =
  | {
      nom: string
      statut: 'DEPOSE'
      sourceId: string
      faitsProposes: number
      langue: string | null
    }
  | { nom: string; statut: 'REFUSE'; motif: MotifRefusFichier; detail?: string }

export interface ResultatDepot {
  fichiers: ResultatFichier[]
  /** Mode d'analyse antivirale effectivement appliqué ; `aucun` est affiché à l'utilisateur. */
  analyseAntivirale: Antivirus['mode']
}

const TYPES_MIME: Readonly<Record<FormatSource, string>> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  eml: 'message/rfc822',
  msg: 'application/vnd.ms-outlook',
  image: 'application/octet-stream',
}

export function empreinteTexte(texte: string): string {
  return createHash('sha256').update(texte, 'utf8').digest('hex')
}

export function nouvelIdentifiantSource(): string {
  return `src_${randomUUID().replaceAll('-', '')}`
}

/** Communication ouverte à l'entrée, lue dans le contexte cloisonné. */
async function communicationOuverte(
  lecteur: Pick<ContexteTransaction, 'communication'>,
  id: string,
) {
  const communication = await lecteur.communication.findUnique({
    where: { id },
    select: { id: true, etat: true, organisationId: true },
  })
  if (!communication) throw introuvable('Communication', id)
  if (!ETATS_ENTREE_OUVERTE.has(communication.etat)) {
    throw new ErreurMetier(
      'ETAT_INCOMPATIBLE',
      `Communication ${id} en ${communication.etat} : les sources sont figées`,
    )
  }
  return communication
}

export interface SourcePreparee {
  id: string
  nom: string
  type: 'FICHIER' | 'TEXTE_SAISI' | 'CONNECTEUR'
  contenuTexte: string
  empreinte: string
  langue: string | null
  confidentialite: Niveau
  cheminStockage: string | null
  /**
   * D'où vient la source quand elle n'est ni un fichier ni un texte saisi :
   * de quoi retrouver le ticket, jamais le ticket brut.
   */
  origineExterne?: Prisma.InputJsonObject
}

/** Ce que les agents ont lu d'une source : propositions, et trace de chacun. */
interface LectureSource {
  faits: SortieExtracteur['faits']
  audiences: SortieAnalyste['suggestions']
  cadrage: SortieSuggesteur | null
  executions: LigneExecution[]
}

type AgentsSource = Pick<JeuAgents['agents'], 'extracteur' | 'analyste' | 'suggesteur'>

/**
 * Un agent, seul, par l'orchestrateur : sa sortie est revalidée contre son
 * schéma, et son échec devient un résultat daté plutôt qu'une exception.
 *
 * Seul et non en chaîne : l'extracteur, l'analyste et le suggesteur lisent
 * la même source sans rien se transmettre. En chaîne, l'échec de l'un
 * annulerait les autres — or une source sans valeur fait légitimement
 * échouer l'extracteur, et l'analyste a encore quelque chose à en dire.
 */
async function lireAvec<E, S>(
  agent: Agent<E, S>,
  entree: E,
  serie: string,
  sourceId: string,
): Promise<
  { sortie: S; ligne: LigneExecution } | { sortie: null; ligne: LigneExecution; code: string }
> {
  try {
    const resultat = await orchestrer<{ sortie: S | null }>({
      etapes: [
        etape(
          agent,
          () => entree,
          (_dossier, sortie) => ({ sortie }),
        ),
      ],
      dossier: { sortie: null },
      contexte: {},
    })
    const trace = resultat.traces[0]
    if (resultat.dossier.sortie === null || trace === undefined) {
      throw new Error(`L'agent ${agent.role} a fini sans sortie ni trace`)
    }
    return { sortie: resultat.dossier.sortie, ligne: ligneReussie(trace, serie, sourceId) }
  } catch (erreur) {
    if (!estErreurOrchestration(erreur)) throw erreur
    const echouee = erreur.etapes.find((e) => e.etat === 'ECHOUEE') ?? {
      role: agent.role,
      version: agent.version,
    }
    return {
      sortie: null,
      code: erreur.code,
      ligne: ligneEchouee(echouee, 'simulation', serie, erreur.message, sourceId),
    }
  }
}

/**
 * Les trois agents lisent une source.
 *
 * Seule l'extraction est indispensable : un extracteur qui tombe en panne
 * fait échouer le dépôt, un résultat sans faits ne se présente pas comme un
 * résultat. Mais une source dont rien ne se laisse relever (`SOURCE_INEXPLOITABLE`)
 * n'est pas une panne : elle se dépose sans fait, et le rédacteur en ajoute
 * à la main. L'analyste et le suggesteur, eux, ne font que proposer : leur
 * échec est tracé, il ne bloque rien.
 */
async function lireSource(source: SourcePreparee, agents: AgentsSource): Promise<LectureSource> {
  const serie = randomUUID()
  const entree = { texte: source.contenuTexte }
  const [extraction, analyse, suggestion] = await Promise.all([
    lireAvec(agents.extracteur, entree, serie, source.id),
    lireAvec(agents.analyste, entree, serie, source.id),
    lireAvec(agents.suggesteur, entree, serie, source.id),
  ])
  if (extraction.sortie === null && extraction.code !== 'SOURCE_INEXPLOITABLE') {
    throw new Error(`Extraction impossible pour ${source.nom} : ${extraction.ligne.erreur ?? ''}`)
  }
  return {
    faits: extraction.sortie?.faits ?? [],
    audiences: analyse.sortie?.suggestions ?? [],
    cadrage: suggestion.sortie,
    executions: [extraction.ligne, analyse.ligne, suggestion.ligne],
  }
}

/**
 * Écrit les sources et leurs faits candidats, numérotés à la suite des
 * faits existants, puis passe la communication de BROUILLON à
 * FAITS_A_VALIDER (transition libre, §7). Une citation candidate qui ne se
 * vérifie pas est un défaut du programme : tout est annulé.
 */
export async function enregistrerSources(
  acteur: Acteur,
  communicationId: string,
  sources: readonly SourcePreparee[],
  agents: AgentsSource,
): Promise<Map<string, number>> {
  // Les agents lisent AVANT la transaction : on ne tient pas une transaction
  // ouverte pendant qu'on attend un agent, et une lecture ratée n'a rien écrit.
  const lectures = await Promise.all(sources.map((source) => lireSource(source, agents)))

  return acteur.contexte.$transaction(async (tx) => {
    await communicationOuverte(tx, communicationId)

    const existants = await tx.fait.findMany({
      where: { communicationId },
      select: { reference: true },
    })
    let numero = existants.reduce((max, { reference }) => {
      const n = Number.parseInt(reference.replace(/^F-/, ''), 10)
      return Number.isNaN(n) ? max : Math.max(max, n)
    }, 0)

    const faits: Prisma.FaitCreateManyInput[] = []
    const parSource = new Map<string, number>()
    for (const [indice, source] of sources.entries()) {
      const candidats = lectures[indice]?.faits ?? []
      for (const candidat of candidats) {
        // La sortie d'un agent est une proposition, pas une donnée de
        // confiance : la citation est relue dans le texte exact de la
        // source, et la valeur dans sa citation, avant d'être écrite.
        const verification = verifierCitation(
          source.contenuTexte,
          candidat.citation,
          candidat.localisation,
        )
        if (!verification.valide) {
          throw new Error(`Citation candidate invalide (${verification.motif}) dans ${source.id}`)
        }
        if (!candidat.citation.includes(candidat.valeur)) {
          throw new Error(`Valeur absente de sa citation dans ${source.id}`)
        }
        numero += 1
        faits.push({
          organisationId: acteur.utilisateur.organisationId,
          communicationId,
          reference: formaterReferenceFait(numero),
          enonce: candidat.enonce,
          valeur: candidat.valeur,
          typeValeur: candidat.typeValeur,
          citation: candidat.citation,
          sourceId: source.id,
          localisation: candidat.localisation,
          confiance: candidat.confiance,
          confidentialite: source.confidentialite,
          statut: 'PROPOSE',
        })
      }
      parSource.set(source.id, candidats.length)
    }

    await tx.source.createMany({
      data: sources.map((source, indice) => {
        const cadrage = lectures[indice]?.cadrage
        return {
          id: source.id,
          organisationId: acteur.utilisateur.organisationId,
          communicationId,
          type: source.type,
          nom: source.nom,
          empreinte: source.empreinte,
          cheminStockage: source.cheminStockage,
          contenuTexte: source.contenuTexte,
          langue: source.langue,
          confidentialite: source.confidentialite,
          // La lecture du suggesteur reste avec la source qu'elle a lue ; elle
          // n'est jamais appliquée au cadrage, que le rédacteur a saisi.
          ...(cadrage === null || cadrage === undefined ? {} : { cadrageSuggere: cadrage }),
          ...(source.origineExterne === undefined ? {} : { origineExterne: source.origineExterne }),
        }
      }),
    })
    if (faits.length > 0) await tx.fait.createMany({ data: faits })

    const audiences = lectures.flatMap((lecture) => lecture.audiences)
    if (audiences.length > 0) {
      await tx.suggestionAudience.createMany({
        data: audiences.map((audience) => ({
          organisationId: acteur.utilisateur.organisationId,
          communicationId,
          origine: audience.origine,
          dimension: audience.dimension,
          justification: audience.justification,
          extrait: audience.extrait,
          pertinence: audience.pertinence,
        })),
      })
    }
    await tx.execution.createMany({
      data: lectures
        .flatMap((lecture) => lecture.executions)
        .map((ligne) =>
          Object.assign({}, ligne, {
            organisationId: acteur.utilisateur.organisationId,
            communicationId,
          }),
        ),
    })
    await tx.communication.updateMany({
      where: { id: communicationId, etat: 'BROUILLON' },
      data: { etat: 'FAITS_A_VALIDER' },
    })
    return parSource
  })
}

export async function empreintesExistantes(
  acteur: Acteur,
  communicationId: string,
): Promise<Set<string>> {
  const lignes = await acteur.contexte.source.findMany({
    where: { communicationId },
    select: { empreinte: true },
  })
  return new Set(lignes.map((l) => l.empreinte))
}

// ---------------------------------------------------------------------------
// Mode FICHIER
// ---------------------------------------------------------------------------

type Analyse =
  | { statut: 'ACCEPTE'; nom: string; octets: Uint8Array; format: FormatSource; texte: string }
  | Extract<ResultatFichier, { statut: 'REFUSE' }>

async function analyserFichier(antivirus: Antivirus, fichier: FichierDepose): Promise<Analyse> {
  const nom = fichier.nom.trim()
  if (nom.length === 0 || nom.length > 255) {
    return { nom: fichier.nom, statut: 'REFUSE', motif: 'NOM_INVALIDE' }
  }
  if (fichier.octets.byteLength > TAILLE_MAX_OCTETS) {
    return { nom, statut: 'REFUSE', motif: 'FICHIER_TROP_VOLUMINEUX' }
  }
  try {
    const verdict = await antivirus.analyser(fichier.octets)
    if (verdict.verdict === 'INFECTE') {
      return { nom, statut: 'REFUSE', motif: 'INFECTE', detail: verdict.signature }
    }
  } catch (erreur) {
    if (erreur instanceof ErreurAntivirus) {
      return { nom, statut: 'REFUSE', motif: 'ANTIVIRUS_INDISPONIBLE' }
    }
    throw erreur
  }
  try {
    const extrait = await extraireTexte(nom, fichier.octets)
    const texte = normaliserTexteSource(extrait.texte)
    if (texte.length === 0) return { nom, statut: 'REFUSE', motif: 'TEXTE_ABSENT' }
    return { statut: 'ACCEPTE', nom, octets: fichier.octets, format: extrait.format, texte }
  } catch (erreur) {
    if (erreur instanceof ErreurExtraction) return { nom, statut: 'REFUSE', motif: erreur.code }
    throw erreur
  }
}

export async function deposerFichiers(
  acteur: Acteur,
  dependances: DependancesEntree,
  communicationId: string,
  fichiers: readonly FichierDepose[],
  options: { confidentialite: string | undefined; agents?: Partial<AgentsSource> | undefined },
): Promise<ResultatDepot> {
  exigerDroit(acteur.utilisateur, 'EDITER')
  if (fichiers.length === 0 || fichiers.length > FICHIERS_PAR_DEPOT) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'Nombre de fichiers hors limites', {
      champs: { fichiers: fichiers.length === 0 ? 'requis' : 'trop_nombreux' },
    })
  }
  const volume = fichiers.reduce((total, f) => total + f.octets.byteLength, 0)
  if (volume > TAILLE_MAX_DEPOT_OCTETS) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'Dépôt trop volumineux', {
      champs: { fichiers: 'trop_volumineux' },
    })
  }
  const confidentialite = NIVEAUX.find((n) => n === options.confidentialite)
  if (confidentialite === undefined) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'Confidentialité inconnue', {
      champs: { confidentialite: 'invalide' },
    })
  }
  const communication = await communicationOuverte(acteur.contexte, communicationId)

  const analyses = await Promise.all(
    fichiers.map((fichier) => analyserFichier(dependances.antivirus, fichier)),
  )

  // Doublons : déjà présents dans la communication, ou répétés dans ce dépôt.
  const vues = await empreintesExistantes(acteur, communicationId)
  const resultats: ResultatFichier[] = []
  const preparees: (SourcePreparee & { octets: Uint8Array; format: FormatSource })[] = []
  for (const analyse of analyses) {
    if (analyse.statut === 'REFUSE') {
      resultats.push(analyse)
      continue
    }
    const somme = empreinteTexte(analyse.texte)
    if (vues.has(somme)) {
      resultats.push({ nom: analyse.nom, statut: 'REFUSE', motif: 'EN_DOUBLE' })
      continue
    }
    vues.add(somme)
    const id = nouvelIdentifiantSource()
    preparees.push({
      id,
      nom: analyse.nom,
      type: 'FICHIER',
      contenuTexte: analyse.texte,
      empreinte: somme,
      langue: detecterLangue(analyse.texte),
      confidentialite,
      cheminStockage: cleSource(communication.organisationId, id, analyse.nom),
      octets: analyse.octets,
      format: analyse.format,
    })
    resultats.push({
      nom: analyse.nom,
      statut: 'DEPOSE',
      sourceId: id,
      faitsProposes: 0,
      langue: null,
    })
  }

  if (preparees.length > 0) {
    // Le fichier d'abord, la ligne ensuite : une source en base a toujours son fichier.
    await Promise.all(
      preparees.map((source) =>
        dependances.stockage.deposer(
          source.cheminStockage ?? '',
          source.octets,
          TYPES_MIME[source.format],
        ),
      ),
    )
    let faitsParSource: Map<string, number>
    try {
      faitsParSource = await enregistrerSources(acteur, communicationId, preparees, {
        ...fabriqueAgents().agents,
        ...options.agents,
      })
    } catch (erreur) {
      await Promise.allSettled(
        preparees.map((source) => dependances.stockage.supprimer(source.cheminStockage ?? '')),
      )
      throw erreur
    }
    for (const [indice, resultat] of resultats.entries()) {
      if (resultat.statut !== 'DEPOSE') continue
      const source = preparees.find((p) => p.id === resultat.sourceId)
      resultats[indice] = {
        ...resultat,
        faitsProposes: faitsParSource.get(resultat.sourceId) ?? 0,
        langue: source?.langue ?? null,
      }
    }
  }

  return { fichiers: resultats, analyseAntivirale: dependances.antivirus.mode }
}

// ---------------------------------------------------------------------------
// Mode TEXTE_SAISI
// ---------------------------------------------------------------------------

const SchemaTexteSaisi = z.object({
  titre: z
    .string({ error: 'requis' })
    .trim()
    .min(1, { error: 'requis' })
    .max(200, { error: 'trop_long' }),
  texte: z
    .string({ error: 'requis' })
    .max(TAILLE_MAX_TEXTE, { error: 'trop_long' })
    .refine((t) => normaliserTexteSource(t).length > 0, { error: 'requis' }),
  confidentialite: z.enum(NIVEAUX, { error: 'invalide' }),
})

/** Entrée brute d'un formulaire : des chaînes, validées ici. */
export type EntreeTexteSaisi = Partial<
  Record<keyof z.input<typeof SchemaTexteSaisi>, string | undefined>
>

export async function saisirTexte(
  acteur: Acteur,
  communicationId: string,
  entree: EntreeTexteSaisi,
  options: { agents?: Partial<AgentsSource> | undefined } = {},
): Promise<{ sourceId: string; faitsProposes: number; langue: string | null }> {
  exigerDroit(acteur.utilisateur, 'EDITER')
  const analyse = SchemaTexteSaisi.safeParse(entree)
  if (!analyse.success) {
    const champs: Record<string, string> = {}
    for (const issue of analyse.error.issues) champs[String(issue.path[0])] ??= issue.message
    throw new ErreurMetier('DONNEES_INVALIDES', 'Texte saisi invalide', { champs })
  }
  await communicationOuverte(acteur.contexte, communicationId)

  const contenuTexte = normaliserTexteSource(analyse.data.texte)
  const somme = empreinteTexte(contenuTexte)
  if ((await empreintesExistantes(acteur, communicationId)).has(somme)) {
    throw new ErreurMetier('SOURCE_EN_DOUBLE', 'Ce texte est déjà une source de la communication', {
      champs: { texte: 'en_double' },
    })
  }
  const source: SourcePreparee = {
    id: nouvelIdentifiantSource(),
    nom: analyse.data.titre,
    type: 'TEXTE_SAISI',
    contenuTexte,
    empreinte: somme,
    langue: detecterLangue(contenuTexte),
    confidentialite: analyse.data.confidentialite,
    cheminStockage: null,
  }
  const faitsParSource = await enregistrerSources(acteur, communicationId, [source], {
    ...fabriqueAgents().agents,
    ...options.agents,
  })
  return {
    sourceId: source.id,
    faitsProposes: faitsParSource.get(source.id) ?? 0,
    langue: source.langue,
  }
}
