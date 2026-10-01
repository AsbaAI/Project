import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { resolveurEnvironnement } from '../secrets/index.ts'
import { type ConfigAnthropic, creerFournisseurAnthropic } from './anthropic.ts'
import { type Capacites, ErreurFournisseur } from './types.ts'

/*
 * L'adaptateur est testé sans réseau, contre un faux serveur HTTP qui parle
 * la forme de l'API Messages d'Anthropic. Aucune clé réelle n'existe sur
 * cette machine (CLAUDE.md) : la clé est une valeur de test posée dans
 * l'environnement le temps de chaque cas, puis retirée.
 */

const NOM_VARIABLE = 'COMGEN_TEST_CLE_ANTHROPIC'
const CLE = 'sk-ant-test-0123456789abcdef'
const MODELE = 'claude-test-1'

type Scenario = { type: 'json'; statut: number; corps: unknown } | { type: 'silence' }

interface RequeteRecue {
  url: string | undefined
  entetes: IncomingMessage['headers']
  corps: CorpsMessages
}

/** Sous-ensemble du corps `POST /v1/messages` que les tests inspectent. */
interface CorpsMessages {
  model: string
  max_tokens: number
  temperature?: number
  system?: string
  messages: Array<{ role: string; content: string }>
  tools?: Array<{ name: string; input_schema: Record<string, unknown> }>
  tool_choice?: Record<string, unknown>
}

let serveur: Server
let pointEntree: string
let scenario: Scenario = { type: 'silence' }
const requetesRecues: RequeteRecue[] = []
const reponsesRetenues: ServerResponse[] = []

function reponseOutil(nom: string, entree: unknown): unknown {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: MODELE,
    content: [{ type: 'tool_use', id: 'toolu_test', name: nom, input: entree }],
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: { input_tokens: 12, output_tokens: 34 },
  }
}

function reponseTexte(texte: string): unknown {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: MODELE,
    content: [{ type: 'text', text: texte }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 5, output_tokens: 7 },
  }
}

function reponseErreur(type: string, message: string): unknown {
  return { type: 'error', error: { type, message } }
}

const CAPACITES: Capacites = {
  sortieStructuree: 'native',
  fenetreContexte: 200_000,
  sortieMax: 4096,
  langues: ['fr', 'en'],
  deterministe: true,
  coutParMillionEntree: 3,
  coutParMillionSortie: 15,
  famille: 'claude',
  heberge: 'externe',
}

function creerFournisseur(surcharges: Partial<ConfigAnthropic> = {}) {
  return creerFournisseurAnthropic(
    {
      id: 'anthropic-test',
      identifiantModele: MODELE,
      referenceSecret: NOM_VARIABLE,
      pointEntree,
      capacites: CAPACITES,
      ...surcharges,
    },
    { resolveurSecret: resolveurEnvironnement(), fetch },
  )
}

async function attendreErreur(promesse: Promise<unknown>): Promise<ErreurFournisseur> {
  try {
    await promesse
  } catch (erreur) {
    expect(erreur).toBeInstanceOf(ErreurFournisseur)
    return erreur as ErreurFournisseur
  }
  throw new Error('Une ErreurFournisseur était attendue.')
}

beforeAll(async () => {
  serveur = createServer((requete, reponse) => {
    let brut = ''
    requete.on('data', (morceau: Buffer) => {
      brut += morceau.toString('utf8')
    })
    requete.on('end', () => {
      requetesRecues.push({
        url: requete.url,
        entetes: requete.headers,
        corps: JSON.parse(brut) as CorpsMessages,
      })
      if (scenario.type === 'silence') {
        reponsesRetenues.push(reponse)
        return
      }
      reponse.writeHead(scenario.statut, { 'content-type': 'application/json' })
      reponse.end(JSON.stringify(scenario.corps))
    })
  })
  await new Promise<void>((resoudre) => serveur.listen(0, '127.0.0.1', resoudre))
  const adresse = serveur.address() as AddressInfo
  pointEntree = `http://127.0.0.1:${adresse.port}`
})

afterAll(async () => {
  for (const reponse of reponsesRetenues) {
    reponse.destroy()
  }
  serveur.closeAllConnections()
  await new Promise<void>((resoudre, rejeter) =>
    serveur.close((erreur) => (erreur ? rejeter(erreur) : resoudre())),
  )
})

beforeEach(() => {
  requetesRecues.length = 0
  process.env[NOM_VARIABLE] = CLE
})

afterEach(() => {
  delete process.env[NOM_VARIABLE]
})

describe('creerFournisseurAnthropic — appeler', () => {
  it('renvoie la structure produite par l’outil forcé et transmet le schéma, la température 0 et la clé', async () => {
    const entree = { faits: [{ reference: 'F-01' }] }
    scenario = { type: 'json', statut: 200, corps: reponseOutil('extraction', entree) }
    const schema = {
      type: 'object',
      properties: { faits: { type: 'array' } },
      required: ['faits'],
    }

    const reponse = await creerFournisseur().appeler({
      systeme: 'Tu extrais des faits.',
      messages: [{ role: 'utilisateur', contenu: '<source>Version 4.2.0</source>' }],
      schemaSortie: { nomSortie: 'extraction', schema },
    })

    expect(reponse.structure).toEqual(entree)
    expect(reponse.texte).toBeNull()
    expect(reponse.modele).toBe(MODELE)
    expect(reponse.jetonsEntree).toBe(12)
    expect(reponse.jetonsSortie).toBe(34)
    expect(reponse.raisonArret).toBe('outil')
    expect(reponse.dureeMs).toBeGreaterThanOrEqual(0)

    const recue = requetesRecues[0]!
    expect(recue.url).toBe('/v1/messages')
    expect(recue.entetes['x-api-key']).toBe(CLE)
    expect(recue.entetes['anthropic-version']).toBe('2023-06-01')
    expect(recue.corps.model).toBe(MODELE)
    expect(recue.corps.temperature).toBe(0)
    expect(recue.corps.max_tokens).toBe(CAPACITES.sortieMax)
    expect(recue.corps.system).toBe('Tu extrais des faits.')
    expect(recue.corps.messages).toEqual([
      { role: 'user', content: '<source>Version 4.2.0</source>' },
    ])
    expect(recue.corps.tools).toHaveLength(1)
    expect(recue.corps.tools![0]!.name).toBe('extraction')
    expect(recue.corps.tools![0]!.input_schema).toMatchObject(schema)
    expect(recue.corps.tool_choice).toEqual({
      type: 'tool',
      name: 'extraction',
      disable_parallel_tool_use: true,
    })
  })

  it('renvoie le texte quand aucun schéma n’est demandé', async () => {
    scenario = { type: 'json', statut: 200, corps: reponseTexte('Bonjour.') }

    const reponse = await creerFournisseur().appeler({
      messages: [{ role: 'utilisateur', contenu: 'Salue.' }],
      temperature: 0.3,
      maxJetonsSortie: 128,
    })

    expect(reponse.texte).toBe('Bonjour.')
    expect(reponse.structure).toBeNull()
    expect(reponse.raisonArret).toBe('fin')
    expect(requetesRecues[0]!.corps.temperature).toBe(0.3)
    expect(requetesRecues[0]!.corps.max_tokens).toBe(128)
    expect(requetesRecues[0]!.corps.tools).toBeUndefined()
  })

  it('échoue en SORTIE_NON_STRUCTUREE quand le modèle répond en texte à une demande de schéma', async () => {
    scenario = { type: 'json', statut: 200, corps: reponseTexte('{"faits": []}') }

    const erreur = await attendreErreur(
      creerFournisseur().appeler({
        messages: [{ role: 'utilisateur', contenu: 'Extrais.' }],
        schemaSortie: { nomSortie: 'extraction', schema: { type: 'object' } },
      }),
    )

    expect(erreur.code).toBe('SORTIE_NON_STRUCTUREE')
    expect(erreur.fournisseurId).toBe('anthropic-test')
  })

  it('traduit 401 en AUTHENTIFICATION', async () => {
    scenario = {
      type: 'json',
      statut: 401,
      corps: reponseErreur('authentication_error', 'invalid x-api-key'),
    }
    const erreur = await attendreErreur(
      creerFournisseur().appeler({ messages: [{ role: 'utilisateur', contenu: 'x' }] }),
    )
    expect(erreur.code).toBe('AUTHENTIFICATION')
    expect(erreur.cause?.statut).toBe(401)
  })

  it('traduit 429 en QUOTA', async () => {
    scenario = {
      type: 'json',
      statut: 429,
      corps: reponseErreur('rate_limit_error', 'rate limited'),
    }
    const erreur = await attendreErreur(
      creerFournisseur().appeler({ messages: [{ role: 'utilisateur', contenu: 'x' }] }),
    )
    expect(erreur.code).toBe('QUOTA')
  })

  it('traduit un serveur muet en DELAI après delaiMs', async () => {
    scenario = { type: 'silence' }
    const debut = Date.now()
    const erreur = await attendreErreur(
      creerFournisseur().appeler({
        messages: [{ role: 'utilisateur', contenu: 'x' }],
        delaiMs: 200,
      }),
    )
    expect(erreur.code).toBe('DELAI')
    expect(Date.now() - debut).toBeLessThan(5_000)
  })

  it('traduit une connexion refusée en RESEAU', async () => {
    const portFerme = await obtenirPortFerme()
    const erreur = await attendreErreur(
      creerFournisseur({ pointEntree: `http://127.0.0.1:${portFerme}` }).appeler({
        messages: [{ role: 'utilisateur', contenu: 'x' }],
      }),
    )
    expect(erreur.code).toBe('RESEAU')
  })

  it('refuse une graine plutôt que de l’ignorer', async () => {
    const erreur = await attendreErreur(
      creerFournisseur().appeler({
        messages: [{ role: 'utilisateur', contenu: 'x' }],
        graine: 42,
      }),
    )
    expect(erreur.code).toBe('CONFIG')
    expect(requetesRecues).toHaveLength(0)
  })
})

describe('creerFournisseurAnthropic — secrets', () => {
  it('échoue en CONFIG en nommant la référence, jamais la valeur, quand le secret manque', async () => {
    const erreur = await attendreErreur(
      creerFournisseur({ referenceSecret: 'COMGEN_TEST_CLE_ABSENTE' }).appeler({
        messages: [{ role: 'utilisateur', contenu: 'x' }],
      }),
    )
    expect(erreur.code).toBe('CONFIG')
    expect(erreur.fournisseurId).toBe('anthropic-test')
    expect(erreur.message).toContain('COMGEN_TEST_CLE_ABSENTE')
    expect(erreur.message).not.toContain(CLE)
    expect(requetesRecues).toHaveLength(0)
  })

  it('masque la clé dans le message d’erreur quand le serveur la renvoie en écho', async () => {
    scenario = {
      type: 'json',
      statut: 500,
      corps: reponseErreur('api_error', `clé reçue : ${CLE}`),
    }
    const erreur = await attendreErreur(
      creerFournisseur().appeler({ messages: [{ role: 'utilisateur', contenu: 'x' }] }),
    )
    expect(erreur.code).toBe('FOURNISSEUR')
    expect(erreur.message).not.toContain(CLE)
    expect(erreur.message).toContain('[secret masqué]')
    expect(JSON.stringify(erreur.cause)).not.toContain(CLE)
  })

  it('masque la clé dans la réponse brute', async () => {
    scenario = { type: 'json', statut: 200, corps: reponseTexte(`la clé est ${CLE}`) }
    const reponse = await creerFournisseur().appeler({
      messages: [{ role: 'utilisateur', contenu: 'x' }],
    })
    expect(JSON.stringify(reponse.brut)).not.toContain(CLE)
    expect(JSON.stringify(reponse.brut)).toContain('[secret masqué]')
  })
})

describe('creerFournisseurAnthropic — sante et capacites', () => {
  it('déclare le fournisseur disponible face au faux serveur', async () => {
    scenario = { type: 'json', statut: 200, corps: reponseTexte('.') }
    const etat = await creerFournisseur().sante()
    expect(etat.disponible).toBe(true)
    expect(etat.latenceMs).not.toBeNull()
    expect(Number.isNaN(Date.parse(etat.verifieLe))).toBe(false)
    expect(requetesRecues[0]!.corps.max_tokens).toBe(1)
  })

  it('déclare le fournisseur indisponible face à un port fermé, sans lever', async () => {
    const portFerme = await obtenirPortFerme()
    const etat = await creerFournisseur({ pointEntree: `http://127.0.0.1:${portFerme}` }).sante()
    expect(etat.disponible).toBe(false)
    expect(etat.latenceMs).toBeNull()
    expect(etat.erreur).toContain('RESEAU')
  })

  it('renvoie les capacités configurées, sans partager le tableau des langues', () => {
    const fournisseur = creerFournisseur()
    const capacites = fournisseur.capacites()
    expect(capacites).toEqual(CAPACITES)
    capacites.langues.push('de')
    expect(fournisseur.capacites().langues).toEqual(['fr', 'en'])
  })
})

/** Ouvre puis ferme un serveur pour obtenir un port sur lequel rien n'écoute. */
async function obtenirPortFerme(): Promise<number> {
  const temporaire = createServer()
  await new Promise<void>((resoudre) => temporaire.listen(0, '127.0.0.1', resoudre))
  const { port } = temporaire.address() as AddressInfo
  await new Promise<void>((resoudre, rejeter) =>
    temporaire.close((erreur) => (erreur ? rejeter(erreur) : resoudre())),
  )
  return port
}
