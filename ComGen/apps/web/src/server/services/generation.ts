import { type EtapeOrchestration, agentsSimules, estErreurOrchestration } from '@comgen/agents'
import {
  type EtatVariante,
  type FaitInjectable,
  type LangueDetectable,
  type RoleAgent,
  type SegmentRedige,
  type Verdict,
  choisirGabarit,
  injecter,
  texteDuDocument,
  verifierValeursInjectees,
} from '@comgen/core'
import { z } from 'zod'

import { exigerDroit } from '@/server/auth/droits'

import { type Acteur, ErreurMetier, introuvable } from './erreurs'

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
}

/** Personas de l'organisation, avec ce qui empêcherait de les retenir. */
export async function listerPersonas(
  acteur: Acteur,
  communicationId: string,
): Promise<PersonaDisponible[]> {
  exigerDroit(acteur.utilisateur, 'CONSULTER')
  const [personas, gabarits, variantes] = await Promise.all([
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
  ])
  const retenus = new Set(variantes.map((variante) => variante.personaId))

  return personas.map((persona) => ({
    id: persona.id,
    nom: persona.nom,
    canal: persona.canalDefaut,
    gabaritDisponible: choisirGabarit(persona.canalDefaut, gabarits) !== null,
    retenu: retenus.has(persona.id),
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

    return { retenus: personaIds.length }
  })
}

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------

export interface RapportGeneration {
  varianteId: string
  personaNom: string
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
  texte: string
  references: readonly string[]
}

function documentTipTap(paragraphes: readonly ParagrapheRendu[]) {
  return {
    type: 'doc',
    content: paragraphes.map((paragraphe) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: paragraphe.texte }],
    })),
  }
}

/**
 * Génère le texte d'une variante. La communication doit être
 * `PRETE_A_GENERER` : la garde du domaine l'a déjà établi, on ne la
 * recalcule pas ici, on refuse simplement tout autre état.
 */
export async function genererVariante(
  acteur: Acteur,
  entree: { varianteId: string },
  options: { attendre?: (ms: number) => Promise<void> } = {},
): Promise<RapportGeneration> {
  exigerDroit(acteur.utilisateur, 'GENERER')

  const variante = await acteur.contexte.variante.findUnique({
    where: { id: entree.varianteId },
    select: {
      id: true,
      communicationId: true,
      persona: { select: { nom: true } },
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

  const agents = agentsSimules()
  const etapes: EtapeOrchestration[] = []

  const contexteAgent = options.attendre === undefined ? {} : { attendre: options.attendre }

  let redige
  try {
    redige = await agents.redacteur.executer(
      {
        faits: injectables.map((fait) => ({
          reference: fait.reference,
          valeur: fait.valeur,
          citation: fait.citation,
        })),
        langue,
        persona: variante.persona.nom,
      },
      contexteAgent,
    )
  } catch (erreur) {
    throw enErreurMetier(erreur)
  }
  etapes.push({ role: 'REDACTEUR', version: agents.redacteur.version, etat: 'TERMINEE' })

  // Injection : hors agent, par du code. Un refus ici est un refus de
  // produire, pas un avertissement — la valeur n'aurait pas été vérifiable.
  const paragraphes: ParagrapheRendu[] = []
  for (const paragraphe of redige.sortie.paragraphes) {
    const resultat = injecter(paragraphe.segments as SegmentRedige[], injectables, langue)
    if (!resultat.ok) {
      throw new ErreurMetier('GENERATION_REFUSEE', resultat.detail)
    }
    paragraphes.push({ texte: resultat.texte, references: resultat.referencesUtilisees })
  }

  const texteComplet = paragraphes.map((paragraphe) => paragraphe.texte).join('\n')
  const attendues = injectables
    .filter((fait) => paragraphes.some((p) => p.references.includes(fait.reference)))
    .flatMap((fait) =>
      fait.valeur === null ? [] : [{ reference: fait.reference, attendue: fait.valeur }],
    )
  const rapportValeurs = verifierValeursInjectees(texteComplet, attendues)
  if (!rapportValeurs.conforme) {
    throw new ErreurMetier(
      'GENERATION_REFUSEE',
      `Valeur absente du texte final : ${rapportValeurs.manquantes
        .map((valeur) => `${valeur.reference} « ${valeur.attendue} »`)
        .join(', ')}`,
    )
  }

  let verifie
  try {
    verifie = await agents.verificateur.executer(
      {
        affirmations: paragraphes.map((paragraphe) => paragraphe.texte),
        faits: injectables.map((fait) => ({
          reference: fait.reference,
          citation: fait.citation,
          valeur: fait.valeur,
        })),
      },
      contexteAgent,
    )
  } catch (erreur) {
    throw enErreurMetier(erreur)
  }
  etapes.push({ role: 'VERIFICATEUR', version: agents.verificateur.version, etat: 'TERMINEE' })

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

    // `longueurMots` est posé par la couche données depuis le document
    // lui-même : on ne le recompte pas ici, deux comptes finiraient par
    // diverger.
    await tx.variante.update({
      where: { id: variante.id },
      data: {
        etat: verifie.sortie.bloquant ? 'A_REVOIR' : 'CONFORME',
        score: verifie.sortie.score,
      },
    })

    await tx.execution.createMany({
      data: [redige.trace, verifie.trace].map((trace) => ({
        organisationId: acteur.utilisateur.organisationId,
        varianteId: variante.id,
        communicationId: variante.communicationId,
        agent: trace.role,
        modele: trace.modele ?? 'simulation',
        promptVersion: trace.prompt,
        parametres: { simule: trace.simule },
        jetonsEntree: trace.jetonsEntree,
        jetonsSortie: trace.jetonsSortie,
        dureeMs: trace.dureeMs,
        coutCentimes: 0,
        succes: true,
      })),
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
    score: verifie.sortie.score,
    bloquant: verifie.sortie.bloquant,
    etapes,
    affirmations: verifie.sortie.affirmations,
  }
}

/** Une panne d'agent reste une erreur métier nommée, jamais une trace brute. */
function enErreurMetier(erreur: unknown): ErreurMetier {
  if (estErreurOrchestration(erreur)) {
    return new ErreurMetier('GENERATION_REFUSEE', erreur.message)
  }
  if (erreur instanceof Error) return new ErreurMetier('GENERATION_REFUSEE', erreur.message)
  return new ErreurMetier('GENERATION_REFUSEE', 'Génération impossible')
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
          select: { id: true, agent: true, dureeMs: true, parametres: true },
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
      executions: variante.executions.map((execution) => ({
        id: execution.id,
        agent: execution.agent,
        dureeMs: execution.dureeMs,
        // `parametres.simule` est posé à l'écriture ; on ne le devine pas.
        simule:
          typeof execution.parametres === 'object' &&
          execution.parametres !== null &&
          'simule' in execution.parametres &&
          execution.parametres.simule === true,
      })),
    }
  })

  return {
    variantes: lues,
    resteARediger: lues.some((variante) => variante.etat === 'EN_GENERATION'),
    bloquee: lues.some((variante) => variante.blocages.length > 0),
  }
}
