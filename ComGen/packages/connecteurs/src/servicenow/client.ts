/* oxlint-disable eslint/no-await-in-loop -- la lecture d'un corps de réponse est séquentielle par nature : chaque bloc dépend du précédent. */
import { ErreurItsm, estErreurItsm } from '../erreurs.ts'
import {
  type ConnecteurItsm,
  type FiltresTickets,
  type PageDemandee,
  type PageTickets,
  type ResultatTest,
  type TicketItsm,
} from '../types.ts'

import {
  lireListe,
  lireUn,
  normaliserDetail,
  normaliserNotes,
  normaliserResume,
} from './normalisation.ts'
import { DUREE_PAR_DEFAUT_S, FournisseurJeton, type JetonObtenu } from './oauth.ts'
import {
  CHEMIN_JOURNAL,
  CHEMIN_LISTE,
  cheminTicket,
  requeteListe,
  requeteNotes,
  requeteTicket,
} from './requetes.ts'

/**
 * Adaptateur ServiceNow : l'API Table REST, en lecture seule.
 *
 * Ce que ce fichier garantit, indépendamment de l'instance en face :
 * - les identifiants ne partent que vers l'instance configurée, et jamais
 *   ailleurs : une redirection n'est pas suivie ;
 * - aucun message d'erreur ne contient de secret, d'en-tête d'autorisation
 *   ou de morceau de réponse — une réponse peut porter des données de
 *   ticket, et un message d'erreur finit dans les journaux ;
 * - une réponse trop grosse, vide ou illisible est une erreur nommée, pas
 *   une liste vide.
 *
 * Le jugement sur l'adresse de l'instance (https, hôtes autorisés) se fait
 * AVANT, par `verifierUrlInstance` : ce client suppose une adresse déjà
 * admise, ce qui le laisse testable contre un serveur local.
 */

export type Identifiants =
  | { methode: 'oauth2'; clientId: string; clientSecret: string }
  | { methode: 'basic'; utilisateur: string; motDePasse: string }

export interface ConfigServiceNow {
  urlInstance: string
  identifiants: Identifiants
  /** Délai par requête, en millisecondes. Défaut : 10 s. */
  delaiMs?: number
  /** Taille maximale d'une réponse, en octets. Défaut : 5 Mo. */
  tailleReponseMaxOctets?: number
}

export interface DependancesServiceNow {
  fetch?: typeof fetch
  /** Horloge, injectable pour tester l'expiration des jetons. */
  maintenant?: () => number
}

const DELAI_PAR_DEFAUT_MS = 10_000
const TAILLE_PAR_DEFAUT = 5_000_000

interface ReponseBrute {
  statut: number
  entetes: Headers
  texte: string
}

/** Retry-After en secondes ; une date HTTP n'est pas lue. */
function lireRetryApres(entetes: Headers): number | undefined {
  const brut = entetes.get('retry-after')
  if (brut === null) return undefined
  const secondes = Number.parseInt(brut, 10)
  return Number.isInteger(secondes) && secondes >= 0 && String(secondes) === brut.trim()
    ? secondes
    : undefined
}

/** L'erreur que mérite un statut HTTP — sans jamais citer le corps de la réponse. */
function erreurDeStatut(statut: number, entetes: Headers): ErreurItsm {
  if (statut === 401 || statut === 403) {
    return new ErreurItsm('AUTH_REFUSEE', `Accès refusé par l'instance (${String(statut)})`, {
      statutHttp: statut,
    })
  }
  if (statut === 404) {
    return new ErreurItsm('INTROUVABLE', 'Ressource introuvable sur l’instance (404)', {
      statutHttp: statut,
    })
  }
  if (statut === 429) {
    const retryApresSecondes = lireRetryApres(entetes)
    return new ErreurItsm('QUOTA', 'Trop de requêtes vers l’instance (429)', {
      statutHttp: statut,
      ...(retryApresSecondes === undefined ? {} : { retryApresSecondes }),
    })
  }
  if (statut >= 500) {
    return new ErreurItsm('INDISPONIBLE', `Instance indisponible (${String(statut)})`, {
      statutHttp: statut,
    })
  }
  return new ErreurItsm('REPONSE_INVALIDE', `Requête refusée par l'instance (${String(statut)})`, {
    statutHttp: statut,
  })
}

async function lireCorps(reponse: Response, maximum: number): Promise<string> {
  const annonce = Number(reponse.headers.get('content-length'))
  if (Number.isFinite(annonce) && annonce > maximum) {
    await reponse.body?.cancel()
    throw new ErreurItsm('REPONSE_INVALIDE', 'Réponse de l’instance trop volumineuse')
  }
  if (reponse.body === null) return ''

  const lecteur = reponse.body.getReader()
  const decodeur = new TextDecoder()
  let total = 0
  let texte = ''
  for (;;) {
    const { done, value } = await lecteur.read()
    if (done) break
    total += value.byteLength
    if (total > maximum) {
      await lecteur.cancel()
      throw new ErreurItsm('REPONSE_INVALIDE', 'Réponse de l’instance trop volumineuse')
    }
    texte += decodeur.decode(value, { stream: true })
  }
  return texte + decodeur.decode()
}

function lireJson(texte: string): unknown {
  if (texte.trim() === '') {
    throw new ErreurItsm('REPONSE_INVALIDE', 'Réponse vide de l’instance')
  }
  try {
    return JSON.parse(texte)
  } catch {
    throw new ErreurItsm('REPONSE_INVALIDE', 'Réponse de l’instance illisible (JSON attendu)')
  }
}

function lireTotal(entetes: Headers): number | null {
  const brut = entetes.get('x-total-count')
  if (brut === null) return null
  const total = Number.parseInt(brut, 10)
  return Number.isInteger(total) && total >= 0 ? total : null
}

export class ConnecteurServiceNow implements ConnecteurItsm {
  readonly systeme = 'servicenow' as const

  private readonly origine: string
  private readonly identifiants: Identifiants
  private readonly delaiMs: number
  private readonly tailleMax: number
  private readonly appelHttp: typeof fetch
  private readonly jetons: FournisseurJeton | null

  constructor(config: ConfigServiceNow, dependances: DependancesServiceNow = {}) {
    try {
      this.origine = new URL(config.urlInstance).origin
    } catch {
      throw new ErreurItsm('CONFIG', 'Adresse d’instance illisible')
    }
    this.identifiants = config.identifiants
    this.delaiMs = config.delaiMs ?? DELAI_PAR_DEFAUT_MS
    this.tailleMax = config.tailleReponseMaxOctets ?? TAILLE_PAR_DEFAUT
    this.appelHttp = dependances.fetch ?? fetch
    this.jetons =
      config.identifiants.methode === 'oauth2'
        ? new FournisseurJeton(() => this.demanderJeton(), dependances.maintenant ?? Date.now)
        : null
  }

  // -------------------------------------------------------------------------
  // Transport
  // -------------------------------------------------------------------------

  /**
   * Une requête, et rien d'autre : pas d'interprétation du statut. Les
   * pannes de réseau et de délai deviennent des erreurs nommées ; leur cause
   * reste attachée pour le journal, jamais dans le message.
   */
  private async requete(
    chemin: string,
    parametres: URLSearchParams | null,
    options: { methode: 'GET' | 'POST'; entetes: Record<string, string>; corps?: string },
  ): Promise<ReponseBrute> {
    const url = `${this.origine}${chemin}${parametres === null ? '' : `?${parametres.toString()}`}`
    try {
      const reponse = await this.appelHttp(url, {
        method: options.methode,
        headers: options.entetes,
        ...(options.corps === undefined ? {} : { body: options.corps }),
        // Une redirection emporterait l'en-tête d'autorisation vers un autre hôte.
        redirect: 'error',
        signal: AbortSignal.timeout(this.delaiMs),
      })
      const texte = await lireCorps(reponse, this.tailleMax)
      return { statut: reponse.status, entetes: reponse.headers, texte }
    } catch (erreur) {
      if (estErreurItsm(erreur)) throw erreur
      if (
        erreur instanceof Error &&
        (erreur.name === 'TimeoutError' || erreur.name === 'AbortError')
      ) {
        throw new ErreurItsm('DELAI_DEPASSE', 'L’instance n’a pas répondu à temps', {
          cause: erreur,
        })
      }
      throw new ErreurItsm('INDISPONIBLE', 'Instance injoignable', { cause: erreur })
    }
  }

  // -------------------------------------------------------------------------
  // Authentification
  // -------------------------------------------------------------------------

  private async demanderJeton(): Promise<JetonObtenu> {
    if (this.identifiants.methode !== 'oauth2') {
      throw new ErreurItsm('CONFIG', 'Jeton demandé sans OAuth configuré')
    }
    const corps = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.identifiants.clientId,
      client_secret: this.identifiants.clientSecret,
    }).toString()
    const reponse = await this.requete('/oauth_token.do', null, {
      methode: 'POST',
      entetes: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      corps,
    })
    if (reponse.statut === 400 || reponse.statut === 401 || reponse.statut === 403) {
      throw new ErreurItsm('AUTH_REFUSEE', 'Identifiants OAuth refusés par l’instance', {
        statutHttp: reponse.statut,
      })
    }
    if (reponse.statut < 200 || reponse.statut > 299) {
      throw erreurDeStatut(reponse.statut, reponse.entetes)
    }

    const json = lireJson(reponse.texte)
    const jeton =
      typeof json === 'object' && json !== null
        ? (json as Record<string, unknown>)['access_token']
        : undefined
    if (typeof jeton !== 'string' || jeton === '') {
      throw new ErreurItsm('REPONSE_INVALIDE', 'Réponse de jeton sans access_token')
    }
    const duree = (json as Record<string, unknown>)['expires_in']
    return {
      jeton,
      expireDansSecondes:
        typeof duree === 'number' && Number.isFinite(duree) && duree > 0
          ? duree
          : DUREE_PAR_DEFAUT_S,
    }
  }

  private async entetesAutorises(): Promise<Record<string, string>> {
    if (this.identifiants.methode === 'basic') {
      const brut = Buffer.from(
        `${this.identifiants.utilisateur}:${this.identifiants.motDePasse}`,
      ).toString('base64')
      return { Accept: 'application/json', Authorization: `Basic ${brut}` }
    }
    const jeton = await (this.jetons?.obtenir() ??
      Promise.reject(new ErreurItsm('CONFIG', 'OAuth')))
    return { Accept: 'application/json', Authorization: `Bearer ${jeton}` }
  }

  // -------------------------------------------------------------------------
  // Lecture
  // -------------------------------------------------------------------------

  /**
   * Une lecture authentifiée. Un 401 avec OAuth renouvelle le jeton UNE fois :
   * s'il persiste, l'authentification a expiré pour de bon.
   */
  private async lireJsonAuthentifie(
    chemin: string,
    parametres: URLSearchParams,
  ): Promise<{ json: unknown; entetes: Headers }> {
    const essayer = async () =>
      this.requete(chemin, parametres, { methode: 'GET', entetes: await this.entetesAutorises() })

    let reponse = await essayer()
    if (reponse.statut === 401 && this.jetons !== null) {
      this.jetons.invalider()
      reponse = await essayer()
      if (reponse.statut === 401) {
        throw new ErreurItsm('AUTH_EXPIREE', 'Authentification expirée, renouvellement refusé', {
          statutHttp: 401,
        })
      }
    }
    if (reponse.statut < 200 || reponse.statut > 299) {
      throw erreurDeStatut(reponse.statut, reponse.entetes)
    }
    return { json: lireJson(reponse.texte), entetes: reponse.entetes }
  }

  async tester(): Promise<ResultatTest> {
    try {
      await this.lister({}, { page: 1, taille: 1 })
      return { ok: true, systeme: 'servicenow', detail: 'incident' }
    } catch (erreur) {
      if (estErreurItsm(erreur)) return { ok: false, code: erreur.code, message: erreur.message }
      throw erreur
    }
  }

  async lister(filtres: FiltresTickets, page: PageDemandee): Promise<PageTickets> {
    // La requête est construite — donc validée — avant qu'un seul octet ne parte.
    const parametres = requeteListe(filtres, page)
    const { json, entetes } = await this.lireJsonAuthentifie(CHEMIN_LISTE, parametres)
    return {
      tickets: lireListe(json).map((ligne) => normaliserResume(ligne)),
      total: lireTotal(entetes),
      page: page.page,
      taille: page.taille,
    }
  }

  async lire(idExterne: string, options: { avecNotes?: boolean } = {}): Promise<TicketItsm> {
    const chemin = cheminTicket(idExterne)
    const { json } = await this.lireJsonAuthentifie(chemin, requeteTicket())
    const detail = normaliserDetail(lireUn(json))

    // Des notes qu'on n'a pas pu lire ne se présentent pas comme « aucune note » :
    // si on les a demandées et que la lecture échoue, tout échoue.
    let notesDeTravail: TicketItsm['notesDeTravail'] = []
    if (options.avecNotes === true) {
      const journal = await this.lireJsonAuthentifie(CHEMIN_JOURNAL, requeteNotes(idExterne))
      notesDeTravail = normaliserNotes(lireListe(journal.json))
    }

    return {
      ...detail.resume,
      description: detail.description,
      resoluLe: detail.resoluLe,
      notesDeTravail,
      lien: `${this.origine}/nav_to.do?uri=incident.do%3Fsys_id%3D${idExterne}`,
    }
  }
}
