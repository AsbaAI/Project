/* oxlint-disable eslint/no-await-in-loop -- chaque panne se rejoue l'une après l'autre : elles partagent le même faux serveur et son comportement courant. */
import {
  type IncomingHttpHeaders,
  type IncomingMessage,
  type Server,
  type ServerResponse,
  createServer,
} from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ErreurItsm } from '../erreurs.ts'

import { ConnecteurServiceNow } from './client.ts'
import type { ConfigServiceNow } from './client.ts'

/*
 * Le connecteur est testé contre un vrai serveur HTTP local, pas contre un
 * `fetch` simulé : ce qui part sur le réseau (en-têtes, requête encodée,
 * corps du jeton) est précisément ce qu'on veut vérifier.
 */

interface RequeteVue {
  methode: string
  chemin: string
  requete: URLSearchParams
  entetes: IncomingHttpHeaders
  corps: string
}
type Comportement = (vue: RequeteVue, reponse: ServerResponse) => void | Promise<void>

let serveur: Server
let autre: Server
let base: string
let vues: RequeteVue[]
let vuesAutre: RequeteVue[]
let comportement: Comportement

function lireCorps(requete: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const morceaux: Buffer[] = []
    requete.on('data', (morceau: Buffer) => morceaux.push(morceau))
    requete.on('end', () => resolve(Buffer.concat(morceaux).toString('utf8')))
    requete.on('error', reject)
  })
}

function json(
  reponse: ServerResponse,
  statut: number,
  corps: unknown,
  entetes: Record<string, string> = {},
) {
  reponse.writeHead(statut, { 'Content-Type': 'application/json', ...entetes })
  reponse.end(JSON.stringify(corps))
}

async function demarrer(
  surRequete: (vue: RequeteVue, reponse: ServerResponse) => void | Promise<void>,
  enregistrement: RequeteVue[],
): Promise<Server> {
  const s = createServer((requete, reponse) => {
    void (async () => {
      const corps = await lireCorps(requete)
      const url = new URL(requete.url ?? '/', 'http://local')
      const vue: RequeteVue = {
        methode: requete.method ?? 'GET',
        chemin: url.pathname,
        requete: url.searchParams,
        entetes: requete.headers,
        corps,
      }
      enregistrement.push(vue)
      await surRequete(vue, reponse)
    })()
  })
  await new Promise<void>((resolve) => s.listen(0, '127.0.0.1', resolve))
  return s
}

const adresse = (s: Server) => `http://127.0.0.1:${(s.address() as AddressInfo).port}`

beforeAll(async () => {
  vues = []
  vuesAutre = []
  serveur = await demarrer((vue, reponse) => comportement(vue, reponse), vues)
  autre = await demarrer((_vue, reponse) => json(reponse, 200, { result: [] }), vuesAutre)
  base = adresse(serveur)
})

afterAll(async () => {
  await new Promise<void>((resolve) => serveur.close(() => resolve()))
  await new Promise<void>((resolve) => autre.close(() => resolve()))
})

beforeEach(() => {
  vues.length = 0
  vuesAutre.length = 0
  comportement = (_vue, reponse) => json(reponse, 500, {})
})

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------

const ID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
const SECRET = 'secret-tres-confidentiel-9f8e7d'
const MOT_DE_PASSE = 'motdepasse-tres-confidentiel-1a2b'

const champ = (value: string, display = value) => ({ value, display_value: display })

function incident(surcharge: Record<string, unknown> = {}) {
  return {
    sys_id: champ(ID),
    number: champ('INC0012345'),
    short_description: champ('Portail client indisponible'),
    description: champ('Le portail ne répond plus depuis 08h30.'),
    state: champ('2', 'In Progress'),
    priority: champ('2', '2 - High'),
    caller_id: champ('u1', 'Marie Dupont'),
    assignment_group: champ('g1', 'Support N2'),
    opened_at: champ('2026-10-12 08:30:00', '12/10/2026 10:30:00'),
    sys_updated_on: champ('2026-10-12 09:45:10', '12/10/2026 11:45:10'),
    resolved_at: champ('', ''),
    closed_at: champ('', ''),
    ...surcharge,
  }
}

const oauth = (url = base): ConfigServiceNow => ({
  urlInstance: url,
  identifiants: { methode: 'oauth2', clientId: 'comgen', clientSecret: SECRET },
})
const basique = (url = base): ConfigServiceNow => ({
  urlInstance: url,
  identifiants: { methode: 'basic', utilisateur: 'svc-comgen', motDePasse: MOT_DE_PASSE },
})

/** Une instance qui délivre un jeton et répond aux lectures. */
function instanceNormale(
  options: { incidents?: unknown[]; total?: string; expiresIn?: number } = {},
): Comportement {
  return (vue, reponse) => {
    if (vue.chemin === '/oauth_token.do') {
      json(reponse, 200, {
        access_token: `jeton-${String(vues.filter((v) => v.chemin === '/oauth_token.do').length)}`,
        token_type: 'Bearer',
        expires_in: options.expiresIn ?? 3600,
      })
      return
    }
    json(
      reponse,
      200,
      { result: options.incidents ?? [incident()] },
      options.total === undefined ? {} : { 'X-Total-Count': options.total },
    )
  }
}

const lectures = () => vues.filter((v) => v.chemin !== '/oauth_token.do')
const jetons = () => vues.filter((v) => v.chemin === '/oauth_token.do')

async function echec(promesse: Promise<unknown>): Promise<ErreurItsm> {
  try {
    await promesse
  } catch (erreur) {
    if (erreur instanceof ErreurItsm) return erreur
    throw erreur
  }
  throw new Error('La promesse aurait dû échouer')
}

const PAGE = { page: 1, taille: 20 }

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------

describe('authentification OAuth 2.0', () => {
  it('demande un jeton par client_credentials, puis s’en sert comme porteur', async () => {
    comportement = instanceNormale()
    await new ConnecteurServiceNow(oauth()).lister({}, PAGE)

    const requeteJeton = jetons()[0]
    expect(requeteJeton?.methode).toBe('POST')
    expect(requeteJeton?.entetes['content-type']).toContain('application/x-www-form-urlencoded')
    const formulaire = new URLSearchParams(requeteJeton?.corps)
    expect(formulaire.get('grant_type')).toBe('client_credentials')
    expect(formulaire.get('client_id')).toBe('comgen')
    expect(formulaire.get('client_secret')).toBe(SECRET)

    expect(lectures()[0]?.entetes['authorization']).toBe('Bearer jeton-1')
  })

  it('garde le jeton : deux lectures, une seule demande de jeton', async () => {
    comportement = instanceNormale()
    const connecteur = new ConnecteurServiceNow(oauth())
    await connecteur.lister({}, PAGE)
    await connecteur.lister({}, PAGE)
    expect(jetons()).toHaveLength(1)
  })

  it('une rafale de lectures ne demande qu’un seul jeton', async () => {
    comportement = instanceNormale()
    const connecteur = new ConnecteurServiceNow(oauth())
    await Promise.all([connecteur.lister({}, PAGE), connecteur.lister({}, PAGE)])
    expect(jetons()).toHaveLength(1)
  })

  it('renouvelle le jeton un peu avant son expiration', async () => {
    comportement = instanceNormale({ expiresIn: 3600 })
    let maintenant = 1_000_000
    const connecteur = new ConnecteurServiceNow(oauth(), { maintenant: () => maintenant })
    await connecteur.lister({}, PAGE)

    maintenant += 3_500_000 // 3 500 s : il reste 100 s, la marge de 60 s n'est pas entamée
    await connecteur.lister({}, PAGE)
    expect(jetons()).toHaveLength(1)

    maintenant += 50_000 // 3 550 s : il reste 50 s, moins que la marge
    await connecteur.lister({}, PAGE)
    expect(jetons()).toHaveLength(2)
  })

  it('un 401 sur la lecture renouvelle le jeton une fois, puis réussit', async () => {
    let lecturesVues = 0
    comportement = (vue, reponse) => {
      if (vue.chemin === '/oauth_token.do') {
        json(reponse, 200, { access_token: `jeton-${String(jetons().length)}`, expires_in: 3600 })
        return
      }
      lecturesVues += 1
      if (lecturesVues === 1) json(reponse, 401, { error: { message: 'User Not Authenticated' } })
      else json(reponse, 200, { result: [incident()] })
    }
    const page = await new ConnecteurServiceNow(oauth()).lister({}, PAGE)
    expect(page.tickets).toHaveLength(1)
    expect(jetons()).toHaveLength(2)
    expect(lectures()[1]?.entetes['authorization']).toBe('Bearer jeton-2')
  })

  it('un 401 qui persiste après renouvellement est une authentification expirée', async () => {
    comportement = (vue, reponse) => {
      if (vue.chemin === '/oauth_token.do') {
        json(reponse, 200, { access_token: 'jeton', expires_in: 3600 })
        return
      }
      json(reponse, 401, { error: { message: 'User Not Authenticated' } })
    }
    const erreur = await echec(new ConnecteurServiceNow(oauth()).lister({}, PAGE))
    expect(erreur.code).toBe('AUTH_EXPIREE')
    // Un seul renouvellement : on ne boucle pas.
    expect(jetons()).toHaveLength(2)
  })

  it('des identifiants refusés par le point d’émission du jeton sont une authentification refusée', async () => {
    comportement = (_vue, reponse) => json(reponse, 401, { error: 'invalid_client' })
    const erreur = await echec(new ConnecteurServiceNow(oauth()).lister({}, PAGE))
    expect(erreur.code).toBe('AUTH_REFUSEE')
    expect(lectures()).toHaveLength(0)
  })

  it('une réponse de jeton sans access_token est une réponse invalide', async () => {
    comportement = (_vue, reponse) => json(reponse, 200, { token_type: 'Bearer' })
    const erreur = await echec(new ConnecteurServiceNow(oauth()).lister({}, PAGE))
    expect(erreur.code).toBe('REPONSE_INVALIDE')
  })
})

describe('authentification Basic (repli)', () => {
  it('envoie l’en-tête Basic et ne demande aucun jeton', async () => {
    comportement = instanceNormale()
    await new ConnecteurServiceNow(basique()).lister({}, PAGE)
    expect(jetons()).toHaveLength(0)
    const attendu = `Basic ${Buffer.from(`svc-comgen:${MOT_DE_PASSE}`).toString('base64')}`
    expect(lectures()[0]?.entetes['authorization']).toBe(attendu)
  })

  it('un 401 est une authentification refusée, sans renouvellement possible', async () => {
    comportement = (_vue, reponse) => json(reponse, 401, {})
    const erreur = await echec(new ConnecteurServiceNow(basique()).lister({}, PAGE))
    expect(erreur.code).toBe('AUTH_REFUSEE')
    expect(lectures()).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Liste
// ---------------------------------------------------------------------------

describe('lister', () => {
  it('lit la table incident, avec les libellés et sans lien de référence', async () => {
    comportement = instanceNormale()
    await new ConnecteurServiceNow(basique()).lister({}, PAGE)

    const vue = lectures()[0]
    expect(vue?.methode).toBe('GET')
    expect(vue?.chemin).toBe('/api/now/table/incident')
    expect(vue?.entetes['accept']).toContain('application/json')
    expect(vue?.requete.get('sysparm_display_value')).toBe('all')
    expect(vue?.requete.get('sysparm_exclude_reference_link')).toBe('true')
    expect(vue?.requete.get('sysparm_fields')?.split(',')).toEqual(
      expect.arrayContaining(['sys_id', 'number', 'short_description', 'state', 'priority']),
    )
  })

  it('pagine par limite et décalage, du plus récemment mis à jour au plus ancien', async () => {
    comportement = instanceNormale()
    await new ConnecteurServiceNow(basique()).lister({}, { page: 3, taille: 25 })
    const requete = lectures()[0]?.requete
    expect(requete?.get('sysparm_limit')).toBe('25')
    expect(requete?.get('sysparm_offset')).toBe('50')
    expect(requete?.get('sysparm_query')).toContain('ORDERBYDESCsys_updated_on')
  })

  it('traduit chaque filtre en requête encodée', async () => {
    comportement = instanceNormale()
    await new ConnecteurServiceNow(basique()).lister(
      {
        statuts: ['NOUVEAU', 'EN_COURS', 'EN_ATTENTE', 'RESOLU', 'CLOS', 'ANNULE'],
        priorites: [1, 2],
        groupe: 'Support N2',
        ouvertApres: new Date('2026-10-01T00:00:00Z'),
        ouvertAvant: new Date('2026-10-31T00:00:00Z'),
      },
      PAGE,
    )
    const requete = lectures()[0]?.requete.get('sysparm_query') ?? ''
    expect(requete).toContain('stateIN1,2,3,6,7,8')
    expect(requete).toContain('priorityIN1,2')
    expect(requete).toContain('assignment_group.name=Support N2')
    expect(requete).toContain('opened_at>=2026-10-01 00:00:00')
    expect(requete).toContain('opened_at<=2026-10-31 00:00:00')
  })

  it('sans filtre, n’envoie que l’ordre', async () => {
    comportement = instanceNormale()
    await new ConnecteurServiceNow(basique()).lister({}, PAGE)
    expect(lectures()[0]?.requete.get('sysparm_query')).toBe('ORDERBYDESCsys_updated_on')
  })

  it('refuse un nom de groupe qui contient le séparateur, sans rien envoyer', async () => {
    // Le `^` sépare les conditions d'une requête encodée : un nom qui en porte
    // un pourrait en glisser une autre.
    comportement = instanceNormale()
    const erreur = await echec(
      new ConnecteurServiceNow(basique()).lister({ groupe: 'Support^ORactive=true' }, PAGE),
    )
    expect(erreur.code).toBe('CONFIG')
    expect(vues).toHaveLength(0)
  })

  it('refuse les caractères de contrôle dans le nom de groupe', async () => {
    comportement = instanceNormale()
    const erreur = await echec(
      new ConnecteurServiceNow(basique()).lister({ groupe: 'Support\nN2' }, PAGE),
    )
    expect(erreur.code).toBe('CONFIG')
    expect(vues).toHaveLength(0)
  })

  it('refuse une page ou une taille hors limites, sans rien envoyer', async () => {
    comportement = instanceNormale()
    const connecteur = new ConnecteurServiceNow(basique())
    expect((await echec(connecteur.lister({}, { page: 0, taille: 20 }))).code).toBe('CONFIG')
    expect((await echec(connecteur.lister({}, { page: 1, taille: 0 }))).code).toBe('CONFIG')
    expect((await echec(connecteur.lister({}, { page: 1, taille: 101 }))).code).toBe('CONFIG')
    expect(vues).toHaveLength(0)
  })

  it('normalise un incident : numéro, libellés, personnes, dates en UTC', async () => {
    comportement = instanceNormale()
    const page = await new ConnecteurServiceNow(basique()).lister({}, PAGE)
    expect(page.tickets[0]).toEqual({
      systeme: 'servicenow',
      idExterne: ID,
      numero: 'INC0012345',
      titre: 'Portail client indisponible',
      statut: { code: 'EN_COURS', libelle: 'In Progress' },
      priorite: { niveau: 2, libelle: '2 - High' },
      demandeur: 'Marie Dupont',
      groupe: 'Support N2',
      ouvertLe: new Date('2026-10-12T08:30:00Z'),
      misAJourLe: new Date('2026-10-12T09:45:10Z'),
    })
  })

  it('range chaque état ServiceNow connu', async () => {
    const etats: [string, string][] = [
      ['1', 'NOUVEAU'],
      ['2', 'EN_COURS'],
      ['3', 'EN_ATTENTE'],
      ['6', 'RESOLU'],
      ['7', 'CLOS'],
      ['8', 'ANNULE'],
    ]
    comportement = instanceNormale({
      incidents: etats.map(([code]) => incident({ state: champ(code, `etat ${code}`) })),
    })
    const page = await new ConnecteurServiceNow(basique()).lister({}, PAGE)
    expect(page.tickets.map((t) => t.statut.code)).toEqual(etats.map(([, attendu]) => attendu))
  })

  it('dit « AUTRE » d’un état propre à l’instance, avec son libellé d’origine', async () => {
    comportement = instanceNormale({
      incidents: [incident({ state: champ('10', 'Attente fournisseur') })],
    })
    const page = await new ConnecteurServiceNow(basique()).lister({}, PAGE)
    expect(page.tickets[0]?.statut).toEqual({ code: 'AUTRE', libelle: 'Attente fournisseur' })
  })

  it('donne null à un demandeur ou à un groupe absent', async () => {
    comportement = instanceNormale({
      incidents: [incident({ caller_id: champ('', ''), assignment_group: champ('', '') })],
    })
    const page = await new ConnecteurServiceNow(basique()).lister({}, PAGE)
    expect(page.tickets[0]).toMatchObject({ demandeur: null, groupe: null })
  })

  it('accepte aussi les valeurs sans libellé séparé', async () => {
    comportement = instanceNormale({
      incidents: [
        incident({
          number: 'INC0000001',
          short_description: 'Titre simple',
          state: '1',
          priority: '3',
          caller_id: '',
          assignment_group: '',
          sys_id: ID,
          opened_at: '2026-10-12 08:30:00',
          sys_updated_on: '2026-10-12 08:30:00',
        }),
      ],
    })
    const page = await new ConnecteurServiceNow(basique()).lister({}, PAGE)
    expect(page.tickets[0]).toMatchObject({
      numero: 'INC0000001',
      titre: 'Titre simple',
      statut: { code: 'NOUVEAU' },
      priorite: { niveau: 3 },
    })
  })

  it('lit le total dans X-Total-Count, ou dit null s’il manque', async () => {
    comportement = instanceNormale({ total: '42' })
    const connecteur = new ConnecteurServiceNow(basique())
    expect((await connecteur.lister({}, PAGE)).total).toBe(42)

    comportement = instanceNormale()
    expect((await connecteur.lister({}, PAGE)).total).toBeNull()
  })

  it('rend la page et la taille demandées', async () => {
    comportement = instanceNormale()
    const page = await new ConnecteurServiceNow(basique()).lister({}, { page: 2, taille: 10 })
    expect(page).toMatchObject({ page: 2, taille: 10 })
  })

  it('une liste vide est un résultat valide, pas une erreur', async () => {
    comportement = instanceNormale({ incidents: [], total: '0' })
    const page = await new ConnecteurServiceNow(basique()).lister({}, PAGE)
    expect(page).toMatchObject({ tickets: [], total: 0 })
  })

  it('une priorité hors de l’échelle fait échouer toute la page', async () => {
    // Pas de page « presque complète » : une ligne qu'on ne sait pas lire
    // ne se saute pas en silence.
    comportement = instanceNormale({
      incidents: [incident(), incident({ priority: champ('9', 'Custom') })],
    })
    const erreur = await echec(new ConnecteurServiceNow(basique()).lister({}, PAGE))
    expect(erreur.code).toBe('REPONSE_INVALIDE')
  })
})

// ---------------------------------------------------------------------------
// Lecture d'un ticket
// ---------------------------------------------------------------------------

function instanceAvecNotes(): Comportement {
  return (vue, reponse) => {
    if (vue.chemin === `/api/now/table/incident/${ID}`) {
      json(reponse, 200, {
        result: incident({
          description: champ('Le portail ne répond plus.\nVersion 4.2.1 concernée.'),
          resolved_at: champ('2026-10-12 11:00:00', ''),
        }),
      })
      return
    }
    if (vue.chemin === '/api/now/table/sys_journal_field') {
      json(reponse, 200, {
        result: [
          { value: 'Redémarrage du service.', sys_created_on: '2026-10-12 09:00:00' },
          { value: 'Service rétabli.', sys_created_on: '2026-10-12 10:30:00' },
        ],
      })
      return
    }
    json(reponse, 404, {})
  }
}

describe('lire', () => {
  it('lit le ticket en entier, avec son lien dans l’outil', async () => {
    comportement = instanceAvecNotes()
    const ticket = await new ConnecteurServiceNow(basique()).lire(ID)
    expect(ticket).toMatchObject({
      numero: 'INC0012345',
      description: 'Le portail ne répond plus.\nVersion 4.2.1 concernée.',
      resoluLe: new Date('2026-10-12T11:00:00Z'),
      lien: `${base}/nav_to.do?uri=incident.do%3Fsys_id%3D${ID}`,
    })
  })

  it('ne lit pas le journal tant qu’on ne demande pas les notes', async () => {
    comportement = instanceAvecNotes()
    const ticket = await new ConnecteurServiceNow(basique()).lire(ID)
    expect(ticket.notesDeTravail).toEqual([])
    expect(vues.map((v) => v.chemin)).not.toContain('/api/now/table/sys_journal_field')
  })

  it('lit les notes de travail, de la plus ancienne à la plus récente, sans leur auteur', async () => {
    comportement = instanceAvecNotes()
    const ticket = await new ConnecteurServiceNow(basique()).lire(ID, { avecNotes: true })
    expect(ticket.notesDeTravail).toEqual([
      { date: new Date('2026-10-12T09:00:00Z'), texte: 'Redémarrage du service.' },
      { date: new Date('2026-10-12T10:30:00Z'), texte: 'Service rétabli.' },
    ])
    const journal = vues.find((v) => v.chemin === '/api/now/table/sys_journal_field')
    const requete = journal?.requete.get('sysparm_query') ?? ''
    expect(requete).toContain(`element_id=${ID}`)
    expect(requete).toContain('element=work_notes')
    expect(requete).toContain('ORDERBYsys_created_on')
    // L'auteur d'une note est une personne : on ne le demande pas.
    expect(journal?.requete.get('sysparm_fields')).not.toContain('sys_created_by')
  })

  it('refuse un identifiant qui n’est pas un sys_id, sans rien envoyer', async () => {
    comportement = instanceAvecNotes()
    const connecteur = new ConnecteurServiceNow(basique())
    for (const mauvais of ['../sys_user', `${ID}/../x`, 'INC0012345', '', `${ID}?x=1`]) {
      expect((await echec(connecteur.lire(mauvais))).code).toBe('CONFIG')
    }
    expect(vues).toHaveLength(0)
  })

  it('un ticket inconnu est introuvable', async () => {
    comportement = (_vue, reponse) => json(reponse, 404, { error: { message: 'No Record found' } })
    const erreur = await echec(new ConnecteurServiceNow(basique()).lire(ID))
    expect(erreur.code).toBe('INTROUVABLE')
  })

  it('une réponse sans résultat est invalide', async () => {
    comportement = (_vue, reponse) => json(reponse, 200, {})
    const erreur = await echec(new ConnecteurServiceNow(basique()).lire(ID))
    expect(erreur.code).toBe('REPONSE_INVALIDE')
  })

  it('un journal illisible fait échouer la lecture quand on a demandé les notes', async () => {
    // Des notes qu'on n'a pas pu lire ne se présentent pas comme « aucune note ».
    comportement = (vue, reponse) => {
      if (vue.chemin === `/api/now/table/incident/${ID}`) json(reponse, 200, { result: incident() })
      else json(reponse, 403, {})
    }
    const erreur = await echec(new ConnecteurServiceNow(basique()).lire(ID, { avecNotes: true }))
    expect(erreur.code).toBe('AUTH_REFUSEE')
  })
})

// ---------------------------------------------------------------------------
// Pannes
// ---------------------------------------------------------------------------

describe('pannes', () => {
  it('un 403 est une authentification refusée : le droit de lire manque', async () => {
    comportement = (_vue, reponse) => json(reponse, 403, {})
    expect((await echec(new ConnecteurServiceNow(basique()).lister({}, PAGE))).code).toBe(
      'AUTH_REFUSEE',
    )
  })

  it('un 429 est un quota, avec le délai que l’outil annonce', async () => {
    comportement = (_vue, reponse) => json(reponse, 429, {}, { 'Retry-After': '30' })
    const erreur = await echec(new ConnecteurServiceNow(basique()).lister({}, PAGE))
    expect(erreur.code).toBe('QUOTA')
    expect(erreur.retryApresSecondes).toBe(30)
  })

  it('un 429 sans délai annoncé reste un quota', async () => {
    comportement = (_vue, reponse) => json(reponse, 429, {})
    const erreur = await echec(new ConnecteurServiceNow(basique()).lister({}, PAGE))
    expect(erreur.code).toBe('QUOTA')
    expect(erreur.retryApresSecondes).toBeUndefined()
  })

  it('une erreur du serveur est une indisponibilité', async () => {
    comportement = (_vue, reponse) => json(reponse, 503, {})
    const erreur = await echec(new ConnecteurServiceNow(basique()).lister({}, PAGE))
    expect(erreur.code).toBe('INDISPONIBLE')
    expect(erreur.statutHttp).toBe(503)
  })

  it('un serveur injoignable est une indisponibilité', async () => {
    const mort = createServer()
    await new Promise<void>((resolve) => mort.listen(0, '127.0.0.1', resolve))
    const url = adresse(mort)
    await new Promise<void>((resolve) => mort.close(() => resolve()))
    const erreur = await echec(new ConnecteurServiceNow(basique(url)).lister({}, PAGE))
    expect(erreur.code).toBe('INDISPONIBLE')
  })

  it('un serveur qui ne répond pas dépasse le délai', async () => {
    comportement = () => new Promise<void>(() => undefined)
    const connecteur = new ConnecteurServiceNow({ ...basique(), delaiMs: 80 })
    const erreur = await echec(connecteur.lister({}, PAGE))
    expect(erreur.code).toBe('DELAI_DEPASSE')
  })

  it('un corps vide est une réponse invalide, à ne pas confondre avec une liste vide', async () => {
    comportement = (_vue, reponse) => {
      reponse.writeHead(200)
      reponse.end()
    }
    const erreur = await echec(new ConnecteurServiceNow(basique()).lister({}, PAGE))
    expect(erreur.code).toBe('REPONSE_INVALIDE')
  })

  it('un corps qui n’est pas du JSON est une réponse invalide', async () => {
    comportement = (_vue, reponse) => {
      reponse.writeHead(200, { 'Content-Type': 'text/html' })
      reponse.end('<html>Instance hibernating</html>')
    }
    const erreur = await echec(new ConnecteurServiceNow(basique()).lister({}, PAGE))
    expect(erreur.code).toBe('REPONSE_INVALIDE')
  })

  it('une réponse sans « result » est invalide', async () => {
    comportement = (_vue, reponse) => json(reponse, 200, { donnees: [] })
    const erreur = await echec(new ConnecteurServiceNow(basique()).lister({}, PAGE))
    expect(erreur.code).toBe('REPONSE_INVALIDE')
  })

  it('refuse une réponse plus grosse que la limite', async () => {
    comportement = (_vue, reponse) =>
      json(reponse, 200, { result: [], remplissage: 'x'.repeat(2000) })
    const connecteur = new ConnecteurServiceNow({ ...basique(), tailleReponseMaxOctets: 1000 })
    const erreur = await echec(connecteur.lister({}, PAGE))
    expect(erreur.code).toBe('REPONSE_INVALIDE')
  })

  it('ne suit pas une redirection : les identifiants n’iront pas ailleurs', async () => {
    comportement = (_vue, reponse) => {
      reponse.writeHead(302, { Location: `${adresse(autre)}/api/now/table/incident` })
      reponse.end()
    }
    const erreur = await echec(new ConnecteurServiceNow(basique()).lister({}, PAGE))
    expect(erreur.code).toBe('INDISPONIBLE')
    expect(vuesAutre).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Test de connexion
// ---------------------------------------------------------------------------

describe('tester', () => {
  it('réussit quand l’accès fonctionne, par une lecture d’une seule ligne', async () => {
    comportement = instanceNormale()
    const resultat = await new ConnecteurServiceNow(oauth()).tester()
    expect(resultat).toMatchObject({ ok: true, systeme: 'servicenow' })
    expect(lectures()[0]?.requete.get('sysparm_limit')).toBe('1')
  })

  it('rend l’échec comme un résultat — avec son code — plutôt que de lever', async () => {
    comportement = (_vue, reponse) => json(reponse, 403, {})
    const resultat = await new ConnecteurServiceNow(basique()).tester()
    expect(resultat).toMatchObject({ ok: false, code: 'AUTH_REFUSEE' })
  })

  it('une instance sans aucun incident passe le test : la table se lit, elle est vide', async () => {
    comportement = instanceNormale({ incidents: [] })
    expect(await new ConnecteurServiceNow(basique()).tester()).toMatchObject({ ok: true })
  })
})

// ---------------------------------------------------------------------------
// Secrets
// ---------------------------------------------------------------------------

describe('secrets', () => {
  it('aucune panne ne laisse un secret, un en-tête ou un morceau de réponse dans son message', async () => {
    const pannes: Comportement[] = [
      (_vue, reponse) => json(reponse, 401, { error: { message: `secret ${SECRET}` } }),
      (_vue, reponse) => json(reponse, 403, { detail: `mdp ${MOT_DE_PASSE}` }),
      (_vue, reponse) => json(reponse, 500, { trace: `Bearer ${SECRET}` }),
      (_vue, reponse) => json(reponse, 200, { donnees: 'INC0012345 Marie Dupont' }),
      (_vue, reponse) => {
        reponse.writeHead(200)
        reponse.end(`pas du json ${SECRET}`)
      },
    ]
    for (const panne of pannes) {
      for (const config of [oauth(), basique()]) {
        comportement = panne
        const erreur = await echec(new ConnecteurServiceNow(config).lister({}, PAGE))
        const trace = `${erreur.message} ${JSON.stringify(erreur)} ${erreur.stack ?? ''}`
        expect(trace).not.toContain(SECRET)
        expect(trace).not.toContain(MOT_DE_PASSE)
        expect(trace.toLowerCase()).not.toContain('authorization')
        expect(trace).not.toContain('Marie Dupont')
        expect(trace).not.toContain(Buffer.from(`svc-comgen:${MOT_DE_PASSE}`).toString('base64'))
      }
    }
  })
})
