/**
 * Adaptateur Anthropic (spécification §5.2). Seul fichier du dépôt autorisé
 * à importer `@anthropic-ai/sdk` : tout le reste ne voit que
 * `FournisseurModele`.
 *
 * Choix tenus ici :
 * - la clé est résolue au premier appel, jamais à la construction, et ne
 *   quitte pas cette fermeture ; toute chaîne qui sort (message d'erreur,
 *   réponse brute) est passée au masque ;
 * - `maxRetries: 0` : les nouvelles tentatives sont une décision
 *   d'orchestration (§8, « réessayée deux fois puis marquée en échec »),
 *   pas un comportement caché de l'adaptateur ;
 * - la sortie structurée passe par un appel d'outil forcé ; si le modèle
 *   répond autrement, c'est un échec `SORTIE_NON_STRUCTUREE`, jamais une
 *   tentative de lecture du texte libre (§8, §19).
 */

import Anthropic, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  type ClientOptions,
  RateLimitError,
} from '@anthropic-ai/sdk'

import type { ResolveurSecret } from '../secrets/index.ts'
import { masquerSecret, masquerSecretDansValeur } from '../secrets/index.ts'
import type {
  Capacites,
  CauseErreurFournisseur,
  EtatSante,
  FournisseurModele,
  MessageModele,
  RaisonArret,
  ReponseModele,
  RequeteModele,
} from './types.ts'
import { ErreurFournisseur } from './types.ts'

export interface ConfigAnthropic {
  id: string
  /** Nom exact demandé au fournisseur (`ModeleEnregistre.identifiantModele`). */
  identifiantModele: string
  /** Clé dans le coffre, jamais la valeur (`ModeleEnregistre.referenceSecret`). */
  referenceSecret: string
  /** URL de base ; permet de viser une passerelle interne ou un faux serveur de test. */
  pointEntree?: string
  capacites: Capacites
  versionApi?: string
  delaiMsParDefaut?: number
}

export interface DependancesAnthropic {
  resolveurSecret: ResolveurSecret
  /** Injecté par les tests pour viser un serveur local sans réseau. */
  fetch?: typeof fetch
  horloge?: () => number
}

const POINT_ENTREE_PAR_DEFAUT = 'https://api.anthropic.com'
const VERSION_API_PAR_DEFAUT = '2023-06-01'
const DELAI_MS_PAR_DEFAUT = 60_000
const TEMPERATURE_PAR_DEFAUT = 0

type ParametresCreation = Anthropic.Messages.MessageCreateParamsNonStreaming
type MessageAnthropic = Anthropic.Messages.Message
type MessageParametre = Anthropic.Messages.MessageParam
type OutilAnthropic = Anthropic.Messages.Tool

function traduireRole(role: MessageModele['role']): MessageParametre['role'] {
  return role === 'utilisateur' ? 'user' : 'assistant'
}

function traduireRaisonArret(raison: MessageAnthropic['stop_reason']): RaisonArret {
  switch (raison) {
    case 'end_turn':
    case 'stop_sequence':
      return 'fin'
    case 'max_tokens':
    case 'model_context_window_exceeded':
      return 'longueur'
    case 'tool_use':
      return 'outil'
    default:
      return 'autre'
  }
}

function extraireTexte(reponse: MessageAnthropic): string | null {
  const fragments = reponse.content.flatMap((contenu) =>
    contenu.type === 'text' ? [contenu.text] : [],
  )
  return fragments.length === 0 ? null : fragments.join('')
}

export function creerFournisseurAnthropic(
  config: ConfigAnthropic,
  dependances: DependancesAnthropic,
): FournisseurModele {
  const pointEntree = config.pointEntree ?? POINT_ENTREE_PAR_DEFAUT
  const versionApi = config.versionApi ?? VERSION_API_PAR_DEFAUT
  const delaiMsParDefaut = config.delaiMsParDefaut ?? DELAI_MS_PAR_DEFAUT
  const horloge = dependances.horloge ?? Date.now

  // Le secret et le client vivent dans cette fermeture et nulle part ailleurs.
  let secret: string | null = null
  let client: Anthropic | null = null

  function masquer(texte: string): string {
    return secret === null ? texte : masquerSecret(texte, secret)
  }

  async function obtenirClient(): Promise<Anthropic> {
    if (client !== null) {
      return client
    }
    try {
      secret = await dependances.resolveurSecret.resoudre(config.referenceSecret)
    } catch (erreur) {
      // L'erreur du résolveur nomme la référence, pas la valeur : on la
      // rattache au fournisseur sans en changer le sens.
      const message =
        erreur instanceof Error
          ? erreur.message
          : `Résolution du secret « ${config.referenceSecret} » impossible.`
      throw new ErreurFournisseur('CONFIG', message, {
        fournisseurId: config.id,
        cause: { nom: erreur instanceof Error ? erreur.name : 'inconnue', message },
      })
    }
    const options: ClientOptions = {
      apiKey: secret,
      baseURL: pointEntree,
      maxRetries: 0,
      timeout: delaiMsParDefaut,
      defaultHeaders: { 'anthropic-version': versionApi },
    }
    if (dependances.fetch !== undefined) {
      options.fetch = dependances.fetch
    }
    client = new Anthropic(options)
    return client
  }

  function traduireErreur(erreur: unknown): ErreurFournisseur {
    if (erreur instanceof ErreurFournisseur) {
      return erreur
    }
    const nom = erreur instanceof Error ? erreur.name : 'inconnue'
    const message = masquer(erreur instanceof Error ? erreur.message : String(erreur))
    const cause: CauseErreurFournisseur = { nom, message }
    const construire = (code: ErreurFournisseur['code']): ErreurFournisseur =>
      new ErreurFournisseur(code, message, { fournisseurId: config.id, cause })

    // Du plus spécifique au plus général : le délai est une erreur de connexion pour le SDK.
    if (erreur instanceof APIConnectionTimeoutError) {
      return construire('DELAI')
    }
    if (erreur instanceof APIConnectionError) {
      return construire('RESEAU')
    }
    if (erreur instanceof AuthenticationError) {
      cause.statut = erreur.status
      return construire('AUTHENTIFICATION')
    }
    if (erreur instanceof RateLimitError) {
      cause.statut = erreur.status
      return construire('QUOTA')
    }
    if (erreur instanceof APIError && typeof erreur.status === 'number') {
      cause.statut = erreur.status
    }
    return construire('FOURNISSEUR')
  }

  function construireParametres(requete: RequeteModele): ParametresCreation {
    const parametres: ParametresCreation = {
      model: config.identifiantModele,
      max_tokens: requete.maxJetonsSortie ?? config.capacites.sortieMax,
      temperature: requete.temperature ?? TEMPERATURE_PAR_DEFAUT,
      messages: requete.messages.map((message): MessageParametre => ({
        role: traduireRole(message.role),
        content: message.contenu,
      })),
    }
    if (requete.systeme !== undefined) {
      parametres.system = requete.systeme
    }
    if (requete.schemaSortie !== undefined) {
      const outil: OutilAnthropic = {
        name: requete.schemaSortie.nomSortie,
        description: `Sortie structurée « ${requete.schemaSortie.nomSortie} ».`,
        input_schema: {
          ...requete.schemaSortie.schema,
          type: 'object',
        },
      }
      parametres.tools = [outil]
      parametres.tool_choice = {
        type: 'tool',
        name: requete.schemaSortie.nomSortie,
        disable_parallel_tool_use: true,
      }
    }
    return parametres
  }

  function extraireStructure(reponse: MessageAnthropic, nomSortie: string): unknown {
    const bloc = reponse.content.find(
      (contenu) => contenu.type === 'tool_use' && contenu.name === nomSortie,
    )
    if (bloc === undefined || bloc.type !== 'tool_use') {
      const types = reponse.content.map((contenu) => contenu.type).join(', ') || 'aucun bloc'
      throw new ErreurFournisseur(
        'SORTIE_NON_STRUCTUREE',
        `Le modèle n'a pas produit la sortie structurée « ${nomSortie} » (blocs reçus : ${types}).`,
        { fournisseurId: config.id },
      )
    }
    return bloc.input
  }

  async function appeler(requete: RequeteModele): Promise<ReponseModele> {
    if (requete.graine !== undefined) {
      // L'API Anthropic n'a pas de graine : l'ignorer serait un repli silencieux.
      throw new ErreurFournisseur(
        'CONFIG',
        `Le fournisseur « ${config.id} » ne prend pas en charge la graine (API Anthropic sans paramètre de graine).`,
        { fournisseurId: config.id },
      )
    }
    const clientPret = await obtenirClient()
    const parametres = construireParametres(requete)
    const debut = horloge()
    let reponse: MessageAnthropic
    try {
      reponse = await clientPret.messages.create(parametres, {
        timeout: requete.delaiMs ?? delaiMsParDefaut,
      })
    } catch (erreur) {
      throw traduireErreur(erreur)
    }
    const dureeMs = horloge() - debut

    const structure =
      requete.schemaSortie === undefined
        ? null
        : extraireStructure(reponse, requete.schemaSortie.nomSortie)

    return {
      texte: requete.schemaSortie === undefined ? extraireTexte(reponse) : null,
      structure,
      modele: reponse.model,
      jetonsEntree: reponse.usage.input_tokens,
      jetonsSortie: reponse.usage.output_tokens,
      dureeMs,
      raisonArret: traduireRaisonArret(reponse.stop_reason),
      brut: masquerSecretDansValeur(reponse, secret ?? ''),
    }
  }

  async function sante(): Promise<EtatSante> {
    const verifieLe = new Date().toISOString()
    const debut = horloge()
    try {
      const clientPret = await obtenirClient()
      await clientPret.messages.create(
        {
          model: config.identifiantModele,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        },
        { timeout: delaiMsParDefaut },
      )
      return { disponible: true, latenceMs: horloge() - debut, verifieLe }
    } catch (erreur) {
      const traduite = traduireErreur(erreur)
      return {
        disponible: false,
        latenceMs: null,
        verifieLe,
        erreur: `${traduite.code} : ${traduite.message}`,
      }
    }
  }

  return {
    id: config.id,
    appeler,
    capacites: () => ({ ...config.capacites, langues: [...config.capacites.langues] }),
    sante,
  }
}
