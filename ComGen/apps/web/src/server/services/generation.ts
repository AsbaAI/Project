import { randomUUID } from 'node:crypto'

import {
  type ContexteAgent,
  ErreurAgent,
  type ErreurOrchestration,
  type EtapeOrchestration,
  type EvenementOrchestration,
  type JeuAgents,
  type MotifSimulation,
  type SortieRedacteur,
  type SortieVerificateur,
  estErreurOrchestration,
  etape,
  fabriqueAgents,
  orchestrer,
} from '@comgen/agents'
import {
  type EtatVariante,
  type FaitInjectable,
  type LangueDetectable,
  type RoleAgent,
  type RoleParagraphe,
  type SegmentRedige,
  type Verdict,
  choisirGabarit,
  injecter,
  paragraphesDuDocument,
  personasCorrespondants,
  texteDuDocument,
  verifierValeursInjectees,
  ECART_LONGUEUR_TOLERE,
  type Voix,
  compterMotsDocument,
  ecartDeLongueur,
  gardien,
  lireGardeFous,
  lireJargon,
  lireVoix,
} from '@comgen/core'
import { z } from 'zod'

import { exigerDroit } from '@/server/auth/droits'

import { type Acteur, ErreurMetier, introuvable } from './erreurs'
import { ligneEchouee, ligneReussie, lireParametre } from './executions'

/**
 * Génération d'une variante (spécification §8, §12), et choix des
 * destinataires qui la précède (§9).
 *
 * Le chemin est toujours le même, et aucune étape n'est sautable :
 *
 *   REDACTEUR → injection (code) → VERIFICATEUR → écriture
 *
 * Le rédacteur rend des segments, jamais du texte : il ne PEUT pas écrire
 * une valeur. `injecter` remet les valeurs de la source et refuse tout
 * segment libre qui en contiendrait une. `verifierValeursInjectees` relit
 * le texte final par comparaison de chaînes, hors de tout appel d'agent.
 * Le vérificateur se prononce ensuite sur chaque affirmation.
 *
 * Une affirmation factuelle sans appui ne fait pas échouer la génération :
 * elle pose un **contrôle bloquant**, que la garde `APPROUVEE` lit. Le
 * texte existe, il est montré, et il ne peut pas partir. Masquer le
 * résultat empêcherait le relecteur de corriger ; le laisser partir
 * violerait la contrainte cardinale.
 */

// ---------------------------------------------------------------------------
// Destinataires
// ---------------------------------------------------------------------------

/**
 * États où la liste de destinataires est encore ouverte. Aucun d'eux ne
 * peut porter une variante rédigée : la génération ne part que de
 * PRETE_A_GENERER, et en sort aussitôt.
 */
const ETATS_LISTE_OUVERTE: ReadonlySet<string> = new Set([
  'BROUILLON',
  'FAITS_A_VALIDER',
  'PRETE_A_GENERER',
])

const schemaDestinataires = z.object({
  communicationId: z.string().min(1),
  personaIds: z.array(z.string().min(1)).min(1, 'AU_MOINS_UN_PERSONA'),
})

export interface PersonaDisponible {
  id: string
  nom: string
  canal: string
  /** `false` quand aucun gabarit de l'organisation ne sert son canal. */
  gabaritDisponible: boolean
  /** Vrai quand la communication le retient déjà. */
  retenu: boolean
  /** La phrase de la source qui désigne ce persona, quand l'analyste en a trouvé une. */
  suggestion: { justification: string; extrait: string } | null
}

/** Une audience que la source nomme, telle que l'analyste d'impact l'a rangée. */
interface AudienceNommee {
  id: string
  dimension: string
  justification: string
  extrait: string
}

/**
 * Les audiences que la source nomme, de la plus pertinente à la moins
 * pertinente. Une suggestion sans dimension (elle viendrait d'un annuaire
 * qu'aucun agent ne lit encore) n'a rien à rapprocher d'un persona.
 */
async function lireAudiencesNommees(
  acteur: Acteur,
  communicationId: string,
): Promise<AudienceNommee[]> {
  const lignes = await acteur.contexte.suggestionAudience.findMany({
    where: { communicationId, origine: 'MOT_CLE' },
    orderBy: [{ pertinence: 'desc' }, { creeLe: 'asc' }],
    select: { id: true, dimension: true, justification: true, extrait: true },
  })
  return lignes.flatMap((ligne) =>
    ligne.dimension === null ? [] : [{ ...ligne, dimension: ligne.dimension }],
  )
}

/**
 * Les audiences que la source nomme et qu'aucun persona ne désigne : elles
 * se disent, au lieu de disparaître. Le rédacteur apprend ainsi que la
 * source parle de quelqu'un pour qui aucun destinataire n'existe.
 */
export async function listerAudiencesSansPersona(
  acteur: Acteur,
  communicationId: string,
): Promise<{ dimension: string; justification: string; extrait: string }[]> {
  exigerDroit(acteur.utilisateur, 'CONSULTER')
  const [personas, audiences] = await Promise.all([
    acteur.contexte.persona.findMany({ where: { actif: true }, select: { id: true, nom: true } }),
    lireAudiencesNommees(acteur, communicationId),
  ])
  return audiences
    .filter((audience) => personasCorrespondants(audience.dimension, personas).length === 0)
    .map(({ dimension, justification, extrait }) => ({ dimension, justification, extrait }))
}

/** Personas de l'organisation, avec ce qui empêcherait de les retenir. */
export async function listerPersonas(
  acteur: Acteur,
  communicationId: string,
): Promise<PersonaDisponible[]> {
  exigerDroit(acteur.utilisateur, 'CONSULTER')
  const [personas, gabarits, variantes, audiences] = await Promise.all([
    acteur.contexte.persona.findMany({
      where: { actif: true },
      select: { id: true, nom: true, canalDefaut: true },
      orderBy: { nom: 'asc' },
    }),
    acteur.contexte.template.findMany({
      where: { actif: true },
      select: { id: true, format: true },
    }),
    acteur.contexte.variante.findMany({
      where: { communicationId },
      select: { personaId: true },
    }),
    lireAudiencesNommees(acteur, communicationId),
  ])
  const retenus = new Set(variantes.map((variante) => variante.personaId))

  // Les audiences arrivent de la plus pertinente à la moins pertinente : si
  // deux désignent un même persona, c'est la première qui parle pour lui.
  const suggestions = new Map<string, { justification: string; extrait: string }>()
  for (const audience of audiences) {
    for (const personaId of personasCorrespondants(audience.dimension, personas)) {
      if (!suggestions.has(personaId)) {
        suggestions.set(personaId, {
          justification: audience.justification,
          extrait: audience.extrait,
        })
      }
    }
  }

  return personas.map((persona) => ({
    id: persona.id,
    nom: persona.nom,
    canal: persona.canalDefaut,
    gabaritDisponible: choisirGabarit(persona.canalDefaut, gabarits) !== null,
    retenu: retenus.has(persona.id),
    suggestion: suggestions.get(persona.id) ?? null,
  }))
}

/**
 * Retient des personas pour cette communication : une variante vide est
 * créée pour chacun, et celles qui ne sont plus retenues disparaissent.
 *
 * Possible tant que rien n'est rédigé — jusqu'à PRETE_A_GENERER inclus.
 * Dès que la génération commence, la liste est figée : retirer un persona
 * dont la variante porte du texte reviendrait à effacer ce texte, et aucun
 * écran ne doit pouvoir le faire par inadvertance. C'est l'état qui le
 * garantit, pas une vérification du contenu : il n'existe pas d'état où
 * une variante est rédigée ET où la liste est encore ouverte.
 */
export async function choisirDestinataires(
  acteur: Acteur,
  entree: { communicationId: string; personaIds: readonly string[] },
): Promise<{ retenus: number }> {
  exigerDroit(acteur.utilisateur, 'GENERER')
  const analyse = schemaDestinataires.safeParse(entree)
  if (!analyse.success) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'Sélection de destinataires invalide', {
      champs: { personaIds: 'AU_MOINS_UN_PERSONA' },
    })
  }
  const { communicationId, personaIds } = analyse.data

  return acteur.contexte.$transaction(async (tx) => {
    const communication = await tx.communication.findUnique({
      where: { id: communicationId },
      select: { id: true, etat: true, regionId: true },
    })
    if (communication === null) throw introuvable('Communication', communicationId)
    if (!ETATS_LISTE_OUVERTE.has(communication.etat)) {
      throw new ErreurMetier(
        'ETAT_INCOMPATIBLE',
        'Les destinataires se figent dès que la génération commence',
      )
    }

    const [personas, gabarits, existantes] = await Promise.all([
      tx.persona.findMany({
        where: { id: { in: [...personaIds] }, actif: true },
        select: { id: true, canalDefaut: true },
      }),
      tx.template.findMany({ where: { actif: true }, select: { id: true, format: true } }),
      tx.variante.findMany({
        where: { communicationId },
        select: { id: true, personaId: true },
      }),
    ])
    if (personas.length !== personaIds.length) throw introuvable('Persona', personaIds.join(', '))

    const aRetirer = existantes.filter((variante) => !personaIds.includes(variante.personaId))
    if (aRetirer.length > 0) {
      await tx.variante.deleteMany({ where: { id: { in: aRetirer.map((v) => v.id) } } })
    }

    const dejaLa = new Set(existantes.map((variante) => variante.personaId))
    const aCreer = personas.filter((persona) => !dejaLa.has(persona.id))
    for (const persona of aCreer) {
      const gabarit = choisirGabarit(persona.canalDefaut, gabarits)
      if (gabarit === null) {
        throw new ErreurMetier(
          'DONNEES_INVALIDES',
          `Aucun gabarit ne sert le canal ${persona.canalDefaut}`,
          { motifs: ['PERSONA_SANS_TEMPLATE'] },
        )
      }
      // eslint-disable-next-line no-await-in-loop -- une variante par persona, en série dans la même transaction
      await tx.variante.create({
        data: {
          organisationId: acteur.utilisateur.organisationId,
          communicationId,
          personaId: persona.id,
          templateId: gabarit.id,
          templateVersion: 1,
          contenu: { type: 'doc', content: [] },
          etat: 'EN_GENERATION',
          longueurMots: 0,
        },
      })
    }

    // Chaque suggestion reçoit la décision que la liste enregistrée lui donne :
    // acceptée si le persona qu'elle désigne est retenu, refusée sinon. Celle
    // qui ne désigne aucun persona reste en attente — rien ne permet de dire
    // qu'on l'a écartée.
    const [tous, nommees] = await Promise.all([
      tx.persona.findMany({ where: { actif: true }, select: { id: true, nom: true } }),
      tx.suggestionAudience.findMany({
        where: { communicationId, origine: 'MOT_CLE' },
        select: { id: true, dimension: true },
      }),
    ])
    const decisions = nommees.flatMap((suggestion) => {
      if (suggestion.dimension === null) return []
      const designes = personasCorrespondants(suggestion.dimension, tous)
      if (designes.length === 0) return []
      return [
        {
          id: suggestion.id,
          decision: designes.some((id) => personaIds.includes(id)) ? 'ACCEPTEE' : 'REFUSEE',
        } as const,
      ]
    })
    await Promise.all(
      decisions.map(({ id, decision }) =>
        tx.suggestionAudience.update({ where: { id }, data: { decision } }),
      ),
    )

    return { retenus: personaIds.length }
  })
}

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------

export interface RapportGeneration {
  varianteId: string
  personaNom: string
  /** Qui a répondu : la fabrique le dit, l'écran l'affiche, personne ne le devine. */
  mode: JeuAgents['mode']
  motif?: MotifSimulation | undefined
  /** Part des affirmations factuelles qui sont appuyées, entre 0 et 1. */
  score: number
  /** Vrai dès qu'une affirmation factuelle n'est pas appuyée. */
  bloquant: boolean
  etapes: readonly EtapeOrchestration[]
  affirmations: readonly {
    texte: string
    verdict: string
    appuis: readonly string[]
    explication: string
  }[]
}

/** Paragraphe rendu : le texte après injection, avec ce qui l'a produit. */
interface ParagrapheRendu {
  role: RoleParagraphe
  texte: string
  references: readonly string[]
}

/*
 * Le rôle du paragraphe est écrit dans le document, pas jeté à la porte :
 * sans lui, l'écran ne peut plus distinguer une ouverture d'un fait, et
 * rend la communication comme un bloc indistinct.
 */
function documentTipTap(paragraphes: readonly ParagrapheRendu[]) {
  return {
    type: 'doc',
    content: paragraphes.map((paragraphe) => ({
      type: 'paragraph',
      attrs: { role: paragraphe.role },
      content: [{ type: 'text', text: paragraphe.texte }],
    })),
  }
}

/** Ce que les étapes se transmettent : chacune lit ce que la précédente a écrit. */
interface DossierGeneration {
  injectables: readonly FaitInjectable[]
  langue: LangueDetectable
  persona: string
  voix: Voix
  jargon: readonly string[]
  /** Vide jusqu'à ce que le rédacteur ait rendu sa sortie et que le code l'ait injectée. */
  paragraphes: readonly ParagrapheRendu[]
  verifie: SortieVerificateur | null
}

/**
 * Injection des valeurs, hors agent, par du code — et relecture par
 * comparaison de chaînes. Un refus ici est celui du rédacteur : sa sortie
 * n'était pas recevable, il échoue, on ne rafistole pas.
 *
 * Elle fait partie de l'étape du rédacteur et non d'une étape à part : un
 * rédacteur dont la sortie est refusée a échoué, la chronologie doit le
 * dire sur son nom.
 */
function injecterParagraphes(
  sortie: SortieRedacteur,
  injectables: readonly FaitInjectable[],
  langue: LangueDetectable,
): readonly ParagrapheRendu[] {
  const paragraphes: ParagrapheRendu[] = []
  for (const paragraphe of sortie.paragraphes) {
    const resultat = injecter(paragraphe.segments as SegmentRedige[], injectables, langue)
    if (!resultat.ok) throw new ErreurAgent('SORTIE_INVALIDE', 'REDACTEUR', resultat.detail)
    paragraphes.push({
      role: paragraphe.role,
      texte: resultat.texte,
      references: resultat.referencesUtilisees,
    })
  }

  const texteComplet = paragraphes.map((paragraphe) => paragraphe.texte).join('\n')
  const attendues = injectables
    .filter((fait) => paragraphes.some((p) => p.references.includes(fait.reference)))
    .flatMap((fait) =>
      fait.valeur === null ? [] : [{ reference: fait.reference, attendue: fait.valeur }],
    )
  const rapportValeurs = verifierValeursInjectees(texteComplet, attendues)
  if (!rapportValeurs.conforme) {
    throw new ErreurAgent(
      'SORTIE_INVALIDE',
      'REDACTEUR',
      `Valeur absente du texte final : ${rapportValeurs.manquantes
        .map((valeur) => `${valeur.reference} « ${valeur.attendue} »`)
        .join(', ')}`,
    )
  }
  return paragraphes
}

/**
 * Une génération qui échoue laisse quand même une trace : les agents qui
 * ont tourné ont coûté du travail, et celui qui a échoué doit se retrouver
 * dans l'historique avec sa raison. Ce qu'elle n'écrit pas, c'est le
 * texte : un résultat partiel ne devient jamais un contenu.
 *
 * Une étape annulée n'a pas tourné (l'annulation est vérifiée avant le
 * départ d'un agent) : elle ne laisse rien.
 */
async function tracerEchec(
  acteur: Acteur,
  variante: { id: string; communicationId: string },
  echec: ErreurOrchestration,
  mode: JeuAgents['mode'],
  serie: string,
): Promise<void> {
  const echouee = echec.etapes.find((e) => e.etat === 'ECHOUEE')
  const lignes = [
    ...echec.traces.map((trace) => ligneReussie(trace, serie)),
    ...(echouee === undefined
      ? []
      : [ligneEchouee(echouee, mode, serie, echouee.message ?? echec.message)]),
  ]
  if (lignes.length === 0) return
  await acteur.contexte.execution.createMany({
    data: lignes.map((ligne) =>
      Object.assign({}, ligne, {
        organisationId: acteur.utilisateur.organisationId,
        varianteId: variante.id,
        communicationId: variante.communicationId,
      }),
    ),
  })
}

/** Qui répondra, et pourquoi : lu à la fabrique, jamais déduit ailleurs. */
export function modeDesAgents(): { mode: JeuAgents['mode']; motif?: MotifSimulation | undefined } {
  const { mode, motif } = fabriqueAgents()
  return { mode, motif }
}

export interface OptionsGeneration {
  attendre?: ((ms: number) => Promise<void>) | undefined
  /** Annulation : la chaîne s'arrête avant le prochain agent, sans rien écrire. */
  signal?: AbortSignal | undefined
  /** Appelé à chaque changement d'état d'un agent : c'est la chronologie en direct. */
  surEvenement?: ((evenement: EvenementOrchestration) => void) | undefined
  /** Remplace un agent de la fabrique. Pour les tests ; aucune route ne le renseigne. */
  agents?: Partial<JeuAgents['agents']> | undefined
}

/**
 * Génère le texte d'une variante. La communication doit être
 * `PRETE_A_GENERER` : la garde du domaine l'a déjà établi, on ne la
 * recalcule pas ici, on refuse simplement tout autre état.
 */
export async function genererVariante(
  acteur: Acteur,
  entree: { varianteId: string },
  options: OptionsGeneration = {},
): Promise<RapportGeneration> {
  exigerDroit(acteur.utilisateur, 'GENERER')

  const variante = await acteur.contexte.variante.findUnique({
    where: { id: entree.varianteId },
    select: {
      id: true,
      communicationId: true,
      persona: { select: { nom: true, voix: true, lexique: true, gardeFous: true } },
      communication: { select: { id: true, etat: true, langue: true, criticite: true } },
    },
  })
  if (variante === null) throw introuvable('Variante', entree.varianteId)
  const communication = variante.communication
  if (communication.etat !== 'PRETE_A_GENERER' && communication.etat !== 'EN_GENERATION') {
    throw new ErreurMetier(
      'ETAT_INCOMPATIBLE',
      'La fiche de faits doit être revue avant génération',
    )
  }

  const faits = await acteur.contexte.fait.findMany({
    where: { communicationId: variante.communicationId, statut: { in: ['CONFIRME', 'DECLARE'] } },
    select: { reference: true, valeur: true, typeValeur: true, citation: true },
    orderBy: { reference: 'asc' },
  })
  const langue: LangueDetectable = communication.langue === 'en' ? 'en' : 'fr'
  const injectables: FaitInjectable[] = faits.map((fait) => ({
    reference: fait.reference,
    valeur: fait.valeur,
    typeValeur: fait.typeValeur,
    citation: fait.citation,
    // La fiche de faits n'est jamais traduite : la citation est dans la
    // langue de sa source, qui est celle de la communication.
    langueSource: langue,
  }))

  /*
   * La fabrique est le seul endroit qui décide entre agents réels et
   * simulés, et elle nomme sa raison. On ne la contourne pas, même quand
   * elle ne peut aujourd'hui répondre que « simulation » : le jour où un
   * agent réel existe, aucune couche au-dessus n'a à changer.
   */
  const jeu = fabriqueAgents()
  const agents = { ...jeu.agents, ...options.agents }
  // Les exécutions d'une même génération partagent une série : c'est ce qui
  // permet à l'écran de ne montrer que les agents du texte qu'il affiche.
  const serie = randomUUID()
  const contexteAgent: ContexteAgent = { attendre: options.attendre, signal: options.signal }

  /*
   * La voix du persona et ses mots : des consignes de forme, pas des
   * valeurs. Illisibles, on refuse de générer — on ne devine pas comment
   * cette audience veut être adressée.
   */
  const voix = lireVoix(variante.persona.voix)
  const jargon = lireJargon(variante.persona.lexique, langue)
  if (voix === null || jargon === null) {
    throw new ErreurMetier(
      'GENERATION_REFUSEE',
      `Les réglages d’écriture du persona ${variante.persona.nom} sont illisibles`,
    )
  }

  let resultat
  try {
    resultat = await orchestrer<DossierGeneration>({
      dossier: {
        injectables,
        langue,
        persona: variante.persona.nom,
        voix,
        jargon,
        paragraphes: [],
        verifie: null,
      },
      contexte: contexteAgent,
      surEvenement: options.surEvenement,
      etapes: [
        etape(
          agents.redacteur,
          (dossier) => ({
            faits: dossier.injectables.map((fait) => ({
              reference: fait.reference,
              valeur: fait.valeur,
              citation: fait.citation,
            })),
            langue: dossier.langue,
            persona: dossier.persona,
            voix: dossier.voix,
            jargon: dossier.jargon,
          }),
          (dossier, sortie) => ({
            ...dossier,
            paragraphes: injecterParagraphes(sortie, dossier.injectables, dossier.langue),
          }),
        ),
        etape(
          agents.verificateur,
          (dossier) => ({
            affirmations: dossier.paragraphes.map((paragraphe) => paragraphe.texte),
            faits: dossier.injectables.map((fait) => ({
              reference: fait.reference,
              citation: fait.citation,
              valeur: fait.valeur,
            })),
          }),
          (dossier, sortie) => ({ ...dossier, verifie: sortie }),
        ),
      ],
    })
  } catch (erreur) {
    if (estErreurOrchestration(erreur)) await tracerEchec(acteur, variante, erreur, jeu.mode, serie)
    throw enErreurMetier(erreur)
  }
  const { paragraphes, verifie: sortieVerifiee } = resultat.dossier
  // `verifie` n'est nul que si l'étape n'a pas tourné, et alors l'orchestrateur a levé.
  if (sortieVerifiee === null) {
    throw new ErreurMetier('GENERATION_REFUSEE', 'Le vérificateur n’a rendu aucune sortie')
  }
  const verifie = { sortie: sortieVerifiee }
  const etapes: readonly EtapeOrchestration[] = resultat.etapes

  const idsParReference = await acteur.contexte.fait.findMany({
    where: { communicationId: variante.communicationId },
    select: { id: true, reference: true },
  })
  const faitIdParReference = new Map(idsParReference.map((fait) => [fait.reference, fait.id]))

  /*
   * Le contenu passe par `ecrireContenuVariante` : c'est la seule porte, la
   * couche données refuse toute autre écriture. Elle trace la version,
   * remet la variante à revoir et annule ses approbations — y compris une
   * régénération, qui est bien une écriture de contenu comme une autre.
   *
   * Elle ouvre sa propre transaction : la vérification s'écrit donc juste
   * après, et c'est le bon ordre — on repart du texte réellement écrit.
   */
  await acteur.contexte.ecrireContenuVariante({
    varianteId: variante.id,
    contenu: documentTipTap(paragraphes),
    origine: 'GENEREE',
  })

  await acteur.contexte.$transaction(async (tx) => {
    await tx.affirmation.deleteMany({ where: { varianteId: variante.id } })
    await tx.controle.deleteMany({ where: { varianteId: variante.id } })

    let position = 0
    const lignes = verifie.sortie.affirmations.map((affirmation) => {
      const offsetDebut = position
      position += affirmation.texte.length + 1
      return {
        organisationId: acteur.utilisateur.organisationId,
        varianteId: variante.id,
        texte: affirmation.texte,
        position: { offsetDebut, offsetFin: offsetDebut + affirmation.texte.length },
        verdict: affirmation.verdict,
        // Dédoublonné : le vérificateur peut citer deux fois la même
        // référence quand une phrase porte deux valeurs du même fait.
        faitIds: [...new Set(affirmation.appuis)].flatMap((reference) => {
          const id = faitIdParReference.get(reference)
          return id === undefined ? [] : [id]
        }),
        explication: affirmation.explication,
      }
    })
    await tx.affirmation.createMany({ data: lignes })

    // Un contrôle bloquant par affirmation sans appui : c'est lui qui
    // empêchera l'approbation, pas une variable en mémoire.
    const sansAppui = verifie.sortie.affirmations.filter(
      (a) => a.verdict !== 'SOUTENUE' && a.verdict !== 'NON_FACTUELLE',
    )
    if (sansAppui.length > 0) {
      await tx.controle.createMany({
        data: sansAppui.map((affirmation) => ({
          organisationId: acteur.utilisateur.organisationId,
          varianteId: variante.id,
          type: 'ANCRAGE' as const,
          bloquant: true,
          gravite: 'ERREUR' as const,
          message: affirmation.explication,
        })),
      })
    }

    /*
     * GARDIEN : les garde-fous du persona, appliqués par du code après la
     * vérification des affirmations. Une configuration illisible bloque
     * aussi — on ne devine pas ce que le persona interdisait.
     */
    const garde = lireGardeFous(variante.persona.lexique, variante.persona.gardeFous, langue)
    let constatsGardien: { type: 'TON' | 'CONFIDENTIALITE_PERSONA'; message: string }[]
    if (garde === null) {
      constatsGardien = [
        {
          type: 'CONFIDENTIALITE_PERSONA',
          message:
            'Les garde-fous de ce persona sont illisibles : le texte ne peut pas être contrôlé.',
        },
      ]
    } else {
      const referencesCitees = new Set(lignes.flatMap((ligne) => ligne.faitIds))
      const niveaux = await tx.fait.findMany({
        where: { id: { in: [...referencesCitees] } },
        select: { reference: true, confidentialite: true },
      })
      constatsGardien = gardien(texteDuDocument(documentTipTap(paragraphes)), garde, niveaux)
    }
    /*
     * Longueur : un écart à la cible du persona est un avertissement de
     * forme, pas un blocage — le texte reste vrai, il est seulement trop
     * long ou trop court. Sans cible, pas de contrôle.
     */
    const mots = compterMotsDocument(documentTipTap(paragraphes))
    const ecart = ecartDeLongueur(mots, voix.longueurCible)
    if (ecart !== null && ecart > ECART_LONGUEUR_TOLERE && voix.longueurCible !== null) {
      await tx.controle.create({
        data: {
          organisationId: acteur.utilisateur.organisationId,
          varianteId: variante.id,
          type: 'LONGUEUR',
          bloquant: false,
          gravite: 'AVERTISSEMENT',
          message: `${String(mots)} mots pour une cible de ${String(voix.longueurCible)}.`,
        },
      })
    }

    if (constatsGardien.length > 0) {
      await tx.controle.createMany({
        data: constatsGardien.map((constat) => ({
          organisationId: acteur.utilisateur.organisationId,
          varianteId: variante.id,
          type: constat.type,
          bloquant: true,
          gravite: 'ERREUR' as const,
          message: constat.message,
        })),
      })
    }

    // `longueurMots` est posé par la couche données depuis le document
    // lui-même : on ne le recompte pas ici, deux comptes finiraient par
    // diverger.
    await tx.variante.update({
      where: { id: variante.id },
      data: {
        etat: verifie.sortie.bloquant || constatsGardien.length > 0 ? 'A_REVOIR' : 'CONFORME',
        score: verifie.sortie.score,
      },
    })

    await tx.execution.createMany({
      data: resultat.traces.map((trace) =>
        Object.assign({}, ligneReussie(trace, serie), {
          organisationId: acteur.utilisateur.organisationId,
          varianteId: variante.id,
          communicationId: variante.communicationId,
        }),
      ),
    })

    // L'état de la communication suit celui de ses variantes : tant qu'une
    // seule reste à rédiger, on ne la dit pas en contrôle.
    const restantes = await tx.variante.count({
      where: { communicationId: variante.communicationId, etat: 'EN_GENERATION' },
    })
    await tx.communication.update({
      where: { id: variante.communicationId },
      data: { etat: restantes > 0 ? 'EN_GENERATION' : 'EN_CONTROLE' },
    })
  })

  return {
    varianteId: variante.id,
    personaNom: variante.persona.nom,
    mode: jeu.mode,
    motif: jeu.motif,
    score: verifie.sortie.score,
    bloquant: verifie.sortie.bloquant,
    etapes,
    affirmations: verifie.sortie.affirmations,
  }
}

/**
 * Une panne d'agent reste une erreur métier nommée, jamais une trace brute.
 *
 * La cause d'une exception étrangère ne sort pas d'ici : elle va au journal
 * du serveur. Ce qui n'est PAS une orchestration en échec est un défaut du
 * programme, pas un refus de génération : il remonte tel quel.
 */
function enErreurMetier(erreur: unknown): ErreurMetier {
  if (!estErreurOrchestration(erreur)) throw erreur
  if (erreur.cause !== undefined && !(erreur.cause instanceof ErreurAgent)) {
    console.error('[génération] cause de l’échec :', erreur.cause)
  }
  return new ErreurMetier('GENERATION_REFUSEE', erreur.message)
}

// ---------------------------------------------------------------------------
// Lecture de l'écran de génération
// ---------------------------------------------------------------------------

export interface AffirmationLue {
  id: string
  texte: string
  verdict: Verdict
  explication: string | null
  /** Références `F-nn` des faits d'appui, pas leurs identifiants techniques. */
  appuis: readonly string[]
}

export interface VarianteLue {
  id: string
  personaNom: string
  etat: EtatVariante
  score: number | null
  longueurMots: number
  texte: string
  /** La communication elle-même, paragraphe par paragraphe, pour l'affichage. */
  paragraphes: readonly { role: RoleParagraphe; texte: string }[]
  affirmations: readonly AffirmationLue[]
  /** Contrôles bloquants non résolus : ce qui empêche l'approbation. */
  blocages: readonly { id: string; message: string }[]
  executions: readonly { id: string; agent: RoleAgent; dureeMs: number; simule: boolean }[]
}

export interface EcranGeneration {
  variantes: readonly VarianteLue[]
  /** Vrai quand au moins une variante reste à rédiger. */
  resteARediger: boolean
  /** Vrai quand au moins un blocage subsiste : l'envoi est impossible. */
  bloquee: boolean
}

interface ExecutionLue {
  id: string
  agent: RoleAgent
  dureeMs: number
  parametres: unknown
  succes: boolean
  creeLe: Date
}

/**
 * Les agents qui ont produit le texte affiché : ceux de la dernière
 * génération réussie.
 *
 * Une génération qui a échoué laisse ses exécutions dans l'historique —
 * elles ont coûté du travail — mais elles ne s'affichent pas ici : montrer
 * « Rédacteur » à côté d'une variante dont le texte n'a pas été écrit
 * laisserait croire qu'il en a produit un. De même, un essai raté avant la
 * génération réussie ne s'empile pas avec elle.
 *
 * Les exécutions d'une même génération partagent une série. Celles qui n'en
 * portent pas (jeu de démonstration, anciennes lignes) forment à elles
 * toutes une seule série.
 */
function executionsDuTexte(executions: readonly ExecutionLue[]): readonly ExecutionLue[] {
  const series = new Map<string, ExecutionLue[]>()
  for (const execution of executions) {
    const brute = lireParametre(execution.parametres, 'serie')
    const serie = typeof brute === 'string' ? brute : ''
    series.set(serie, [...(series.get(serie) ?? []), execution])
  }
  const reussies = [...series.values()].filter((groupe) => groupe.every((e) => e.succes))
  const derniere = reussies
    .map((groupe) => ({ groupe, fin: Math.max(...groupe.map((e) => e.creeLe.getTime())) }))
    .toSorted((a, b) => b.fin - a.fin)[0]
  return derniere?.groupe ?? []
}

export async function chargerGeneration(
  acteur: Acteur,
  communicationId: string,
): Promise<EcranGeneration> {
  exigerDroit(acteur.utilisateur, 'CONSULTER')

  const [variantes, faits] = await Promise.all([
    acteur.contexte.variante.findMany({
      where: { communicationId },
      orderBy: { creeLe: 'asc' },
      select: {
        id: true,
        etat: true,
        score: true,
        longueurMots: true,
        contenu: true,
        persona: { select: { nom: true } },
        affirmations: {
          select: { id: true, texte: true, verdict: true, explication: true, faitIds: true },
        },
        controles: {
          where: { bloquant: true, resoluLe: null },
          select: { id: true, message: true },
        },
        executions: {
          select: {
            id: true,
            agent: true,
            dureeMs: true,
            parametres: true,
            succes: true,
            creeLe: true,
          },
          orderBy: { creeLe: 'asc' },
        },
      },
    }),
    acteur.contexte.fait.findMany({
      where: { communicationId },
      select: { id: true, reference: true },
    }),
  ])
  const referenceParId = new Map(faits.map((fait) => [fait.id, fait.reference]))

  const lues = variantes.map((variante): VarianteLue => {
    return {
      id: variante.id,
      personaNom: variante.persona.nom,
      etat: variante.etat,
      score: variante.score,
      longueurMots: variante.longueurMots,
      texte: texteDuDocument(variante.contenu),
      paragraphes: paragraphesDuDocument(variante.contenu),
      affirmations: variante.affirmations.map((affirmation) => ({
        id: affirmation.id,
        texte: affirmation.texte,
        verdict: affirmation.verdict,
        explication: affirmation.explication,
        appuis: [...new Set(affirmation.faitIds)].flatMap((id) => {
          const reference = referenceParId.get(id)
          return reference === undefined ? [] : [reference]
        }),
      })),
      blocages: variante.controles,
      executions: executionsDuTexte(variante.executions).map((execution) => ({
        id: execution.id,
        agent: execution.agent,
        dureeMs: execution.dureeMs,
        // `parametres.simule` est posé à l'écriture ; on ne le devine pas.
        simule: lireParametre(execution.parametres, 'simule') === true,
      })),
    }
  })

  return {
    variantes: lues,
    resteARediger: lues.some((variante) => variante.etat === 'EN_GENERATION'),
    bloquee: lues.some((variante) => variante.blocages.length > 0),
  }
}
