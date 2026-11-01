import {
  type ConfigConnecteur,
  ConnecteurMock,
  type ConnecteurItsm,
  ErreurItsm,
  type FiltresTickets,
  type PageDemandee,
} from '@comgen/connecteurs'
import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ErreurAutorisation } from '@/server/auth/droits'

import { creerCommunication } from './communications'
import { ErreurMetier } from './erreurs'
import {
  type DependancesItsm,
  apercuSourceItsm,
  enregistrerConfigItsm,
  itsmDisponible,
  lireEtatItsm,
  listerTickets,
  testerConfigItsm,
} from './itsm'
import { type Organisation, organisation, utilisateurAvecRoles } from './test/outils'

let connexion: Connexion
let org: Organisation
let autre: Organisation
let admin: Organisation['redacteur']
let ticketId: string

beforeAll(async () => {
  connexion = ouvrirConnexion({ url: URL_BASE_DE_TEST, connexionsMax: 4 })
  org = await organisation(connexion)
  autre = await organisation(connexion)
  admin = await utilisateurAvecRoles(connexion, org, ['ADMINISTRATEUR'])
  const premier = await new ConnecteurMock().lister({}, { page: 1, taille: 1 })
  ticketId = premier.tickets[0]?.idExterne ?? ''
})

afterAll(async () => {
  await connexion.fermer()
})

const SECRET = 'secret-de-test-tres-confidentiel-123456'
const REF_SECRET = 'ITSM_SERVICENOW_SECRET'

const CONFIG = {
  systeme: 'servicenow',
  urlInstance: 'https://acme.service-now.com',
  methodeAuth: 'oauth2',
  identifiantPublic: 'comgen',
  refSecret: REF_SECRET,
  masquage: {
    courriel: true,
    telephone: true,
    identifiants: [],
    termes: [],
    champs: ['demandeur'],
  },
  actif: true,
} as const

function dependances(surcharge: Partial<DependancesItsm> = {}): DependancesItsm {
  return {
    reglages: { mode: 'servicenow', hotesAutorises: [] },
    env: { [REF_SECRET]: SECRET },
    fabrique: () => new ConnecteurMock(),
    ...surcharge,
  }
}

const mock = (): DependancesItsm =>
  dependances({ reglages: { mode: 'mock', hotesAutorises: [] }, env: {} })

async function erreurMetier(promesse: Promise<unknown>): Promise<ErreurMetier> {
  try {
    await promesse
  } catch (erreur) {
    if (erreur instanceof ErreurMetier) return erreur
    throw erreur
  }
  throw new Error('La promesse aurait dû échouer')
}

async function erreurItsm(promesse: Promise<unknown>): Promise<ErreurItsm> {
  try {
    await promesse
  } catch (erreur) {
    if (erreur instanceof ErreurItsm) return erreur
    throw erreur
  }
  throw new Error('La promesse aurait dû échouer')
}

/** Un connecteur qui échoue comme le ferait une instance en panne. */
function enPanne(code: ErreurItsm['code']): ConnecteurItsm {
  const echec = () => Promise.reject(new ErreurItsm(code, `panne ${code}`))
  return { systeme: 'servicenow', tester: echec, lister: echec, lire: echec }
}

const refusConfig = async (surcharge: Record<string, unknown>, dep = dependances()) => {
  let appels = 0
  const erreur = await erreurMetier(
    testerConfigItsm(
      admin,
      { ...CONFIG, ...surcharge },
      {
        ...dep,
        fabrique: () => {
          appels += 1
          return new ConnecteurMock()
        },
      },
    ),
  )
  // Une configuration refusée n'ouvre aucune connexion : aucun secret ne part.
  expect(appels).toBe(0)
  return erreur
}

const refusFiltres = (filtres: Parameters<typeof listerTickets>[1]) =>
  erreurMetier(listerTickets(org.redacteur, filtres, mock()))

/** Une organisation isolée, avec sa propre configuration. */
async function organisationConfiguree(dep: DependancesItsm = dependances()) {
  const propre = await organisation(connexion)
  const administrateur = await utilisateurAvecRoles(connexion, propre, ['ADMINISTRATEUR'])
  await enregistrerConfigItsm(administrateur, CONFIG, dep)
  return { propre, administrateur }
}

// ---------------------------------------------------------------------------
// État
// ---------------------------------------------------------------------------

describe('lireEtatItsm', () => {
  it('dit que le connecteur est désactivé quand l’environnement le dit', async () => {
    const etat = await lireEtatItsm(
      org.redacteur,
      dependances({
        reglages: { mode: 'desactive', hotesAutorises: [] },
      }),
    )
    expect(etat).toEqual({ mode: 'desactive' })
    expect(itsmDisponible(etat)).toBe(false)
  })

  it('dit « démonstration » en mode mock, sans rien exiger de l’organisation', async () => {
    const etat = await lireEtatItsm(org.redacteur, mock())
    expect(etat).toEqual({ mode: 'mock' })
    expect(itsmDisponible(etat)).toBe(true)
  })

  it('dit « non configuré » tant que l’organisation n’a rien enregistré', async () => {
    const etat = await lireEtatItsm(autre.redacteur, dependances())
    expect(etat).toEqual({ mode: 'servicenow', configure: false })
    expect(itsmDisponible(etat)).toBe(false)
  })

  it('rend la configuration sans aucun secret, et dit seulement s’il est présent', async () => {
    const { propre } = await organisationConfiguree()
    const present = await lireEtatItsm(propre.redacteur, dependances())
    expect(present).toMatchObject({
      mode: 'servicenow',
      configure: true,
      config: { refSecret: REF_SECRET, secretPresent: true, actif: true },
    })
    expect(JSON.stringify(present)).not.toContain(SECRET)

    const absent = await lireEtatItsm(propre.redacteur, dependances({ env: {} }))
    expect(absent).toMatchObject({ config: { secretPresent: false } })
  })

  it('une configuration désactivée n’ouvre pas la source ITSM', async () => {
    const { propre, administrateur } = await organisationConfiguree()
    await enregistrerConfigItsm(administrateur, { ...CONFIG, actif: false }, dependances())
    expect(itsmDisponible(await lireEtatItsm(propre.redacteur, dependances()))).toBe(false)
  })

  it('l’état d’une organisation ne dépend jamais de celui d’une autre', async () => {
    await organisationConfiguree()
    expect(await lireEtatItsm(autre.redacteur, dependances())).toEqual({
      mode: 'servicenow',
      configure: false,
    })
  })
})

// ---------------------------------------------------------------------------
// Test de connexion et enregistrement
// ---------------------------------------------------------------------------

describe('testerConfigItsm', () => {
  it('est réservé à qui peut paramétrer', async () => {
    await expect(testerConfigItsm(org.redacteur, CONFIG, dependances())).rejects.toBeInstanceOf(
      ErreurAutorisation,
    )
  })

  it('rend le résultat du test, sans rien enregistrer', async () => {
    const propre = await organisation(connexion)
    const administrateur = await utilisateurAvecRoles(connexion, propre, ['ADMINISTRATEUR'])
    const resultat = await testerConfigItsm(administrateur, CONFIG, dependances())
    expect(resultat).toMatchObject({ ok: true })
    expect(
      await clientDeTest(connexion).connecteurItsm.count({
        where: { organisationId: propre.organisationId },
      }),
    ).toBe(0)
  })

  it('rend l’échec comme un résultat, avec son code, plutôt que de lever', async () => {
    const resultat = await testerConfigItsm(
      admin,
      CONFIG,
      dependances({ fabrique: () => enPanne('AUTH_REFUSEE') }),
    )
    expect(resultat).toMatchObject({ ok: false, code: 'AUTH_REFUSEE' })
  })

  it('confie au connecteur le secret résolu, et nulle part ailleurs', async () => {
    const recues: ConfigConnecteur[] = []
    const resultat = await testerConfigItsm(
      admin,
      CONFIG,
      dependances({
        fabrique: (config) => {
          recues.push(config)
          return new ConnecteurMock()
        },
      }),
    )
    expect(recues[0]).toMatchObject({
      systeme: 'servicenow',
      urlInstance: 'https://acme.service-now.com',
      identifiants: { methode: 'oauth2', clientId: 'comgen', clientSecret: SECRET },
    })
    expect(JSON.stringify(resultat)).not.toContain(SECRET)
  })

  it('passe l’utilisateur et le mot de passe en Basic', async () => {
    const recues: ConfigConnecteur[] = []
    await testerConfigItsm(
      admin,
      { ...CONFIG, methodeAuth: 'basic', identifiantPublic: 'svc-comgen' },
      dependances({
        fabrique: (config) => {
          recues.push(config)
          return new ConnecteurMock()
        },
      }),
    )
    expect(recues[0]).toMatchObject({
      identifiants: { methode: 'basic', utilisateur: 'svc-comgen', motDePasse: SECRET },
    })
  })

  describe('refuse avant de se connecter', () => {
    it('une adresse qui n’est pas https', async () => {
      const erreur = await refusConfig({ urlInstance: 'http://acme.service-now.com' })
      expect(erreur.code).toBe('DONNEES_INVALIDES')
      expect(erreur.details.champs).toMatchObject({ urlInstance: expect.any(String) })
    })

    it('un hôte qui n’est pas dans la liste autorisée', async () => {
      const erreur = await refusConfig({ urlInstance: 'https://evil.example' })
      expect(erreur.details.champs).toMatchObject({ urlInstance: expect.any(String) })
    })

    it('un hôte ajouté par l’environnement devient acceptable', async () => {
      const resultat = await testerConfigItsm(
        admin,
        { ...CONFIG, urlInstance: 'https://itsm.entreprise.example' },
        dependances({
          reglages: { mode: 'servicenow', hotesAutorises: ['itsm.entreprise.example'] },
        }),
      )
      expect(resultat).toMatchObject({ ok: true })
    })

    it.each(['AUTH_SECRET', 'DATABASE_URL', 'ANTHROPIC_API_KEY', 'itsm_minuscules', 'ITSM_', ''])(
      'une référence de secret « %s » qui n’est pas une variable ITSM_ dédiée',
      async (reference) => {
        const erreur = await refusConfig(
          { refSecret: reference },
          dependances({ env: { [reference]: SECRET, AUTH_SECRET: SECRET, DATABASE_URL: SECRET } }),
        )
        expect(erreur.details.champs).toMatchObject({ refSecret: expect.any(String) })
      },
    )

    it('un secret absent de l’environnement, en nommant la variable et pas autre chose', async () => {
      const erreur = await refusConfig({}, dependances({ env: {} }))
      expect(erreur.details.champs).toMatchObject({ refSecret: 'absent' })
    })

    it('une méthode ou un système inconnus', async () => {
      expect((await refusConfig({ methodeAuth: 'kerberos' })).details.champs).toMatchObject({
        methodeAuth: expect.any(String),
      })
      expect((await refusConfig({ systeme: 'jira' })).details.champs).toMatchObject({
        systeme: expect.any(String),
      })
    })

    it('un identifiant public vide', async () => {
      expect((await refusConfig({ identifiantPublic: '  ' })).details.champs).toMatchObject({
        identifiantPublic: expect.any(String),
      })
    })

    it('un masquage dont l’identifiant porte un préfixe de ticket', async () => {
      const erreur = await refusConfig({
        masquage: {
          ...CONFIG.masquage,
          identifiants: [{ prefixe: 'INC', chiffresMin: 1, chiffresMax: 9 }],
        },
      })
      expect(erreur.details.champs).toMatchObject({ masquage: expect.any(String) })
    })

    it('un masquage dont les bornes de chiffres sont inversées ou hors limites', async () => {
      for (const identifiant of [
        { prefixe: 'E', chiffresMin: 8, chiffresMax: 4 },
        { prefixe: 'E', chiffresMin: 0, chiffresMax: 4 },
        { prefixe: 'E', chiffresMin: 1, chiffresMax: 40 },
        { prefixe: 'E.', chiffresMin: 1, chiffresMax: 4 },
        { prefixe: '', chiffresMin: 1, chiffresMax: 4 },
      ]) {
        // eslint-disable-next-line no-await-in-loop -- un cas après l'autre
        const erreur = await refusConfig({
          masquage: { ...CONFIG.masquage, identifiants: [identifiant] },
        })
        expect(erreur.details.champs).toMatchObject({ masquage: expect.any(String) })
      }
    })

    it('un masquage dont un terme est trop court', async () => {
      const erreur = await refusConfig({ masquage: { ...CONFIG.masquage, termes: ['a'] } })
      expect(erreur.details.champs).toMatchObject({ masquage: expect.any(String) })
    })
  })
})

describe('enregistrerConfigItsm', () => {
  it('est réservé à qui peut paramétrer', async () => {
    await expect(
      enregistrerConfigItsm(org.redacteur, CONFIG, dependances()),
    ).rejects.toBeInstanceOf(ErreurAutorisation)
  })

  it('enregistre après un test réussi, avec la date du test', async () => {
    const propre = await organisation(connexion)
    const administrateur = await utilisateurAvecRoles(connexion, propre, ['ADMINISTRATEUR'])
    const avant = Date.now()
    await enregistrerConfigItsm(administrateur, CONFIG, dependances())

    const ligne = await clientDeTest(connexion).connecteurItsm.findUniqueOrThrow({
      where: { organisationId: propre.organisationId },
    })
    expect(ligne).toMatchObject({
      systeme: 'servicenow',
      urlInstance: 'https://acme.service-now.com',
      methodeAuth: 'oauth2',
      identifiantPublic: 'comgen',
      refSecret: REF_SECRET,
      actif: true,
    })
    expect(ligne.testeLe?.getTime()).toBeGreaterThanOrEqual(avant)
  })

  it('ne garde nulle part la valeur du secret', async () => {
    const propre = await organisation(connexion)
    const administrateur = await utilisateurAvecRoles(connexion, propre, ['ADMINISTRATEUR'])
    await enregistrerConfigItsm(administrateur, CONFIG, dependances())
    const ligne = await clientDeTest(connexion).connecteurItsm.findUniqueOrThrow({
      where: { organisationId: propre.organisationId },
    })
    expect(JSON.stringify(ligne)).not.toContain(SECRET)
  })

  it('n’enregistre rien quand le test échoue, et dit pourquoi', async () => {
    const propre = await organisation(connexion)
    const administrateur = await utilisateurAvecRoles(connexion, propre, ['ADMINISTRATEUR'])
    const erreur = await erreurItsm(
      enregistrerConfigItsm(
        administrateur,
        CONFIG,
        dependances({ fabrique: () => enPanne('AUTH_REFUSEE') }),
      ),
    )
    expect(erreur.code).toBe('AUTH_REFUSEE')
    expect(
      await clientDeTest(connexion).connecteurItsm.count({
        where: { organisationId: propre.organisationId },
      }),
    ).toBe(0)
  })

  it('un test qui échoue laisse intacte la configuration précédente', async () => {
    const { propre, administrateur } = await organisationConfiguree()
    await erreurItsm(
      enregistrerConfigItsm(
        administrateur,
        { ...CONFIG, urlInstance: 'https://autre.service-now.com' },
        dependances({ fabrique: () => enPanne('INDISPONIBLE') }),
      ),
    )
    const ligne = await clientDeTest(connexion).connecteurItsm.findUniqueOrThrow({
      where: { organisationId: propre.organisationId },
    })
    expect(ligne.urlInstance).toBe('https://acme.service-now.com')
  })

  it('met à jour la configuration existante au lieu d’en créer une seconde', async () => {
    const { propre, administrateur } = await organisationConfiguree()
    await enregistrerConfigItsm(
      administrateur,
      { ...CONFIG, urlInstance: 'https://nouvelle.service-now.com', methodeAuth: 'basic' },
      dependances(),
    )
    const lignes = await clientDeTest(connexion).connecteurItsm.findMany({
      where: { organisationId: propre.organisationId },
    })
    expect(lignes).toHaveLength(1)
    expect(lignes[0]).toMatchObject({
      urlInstance: 'https://nouvelle.service-now.com',
      methodeAuth: 'basic',
    })
  })

  it('ne touche pas à la configuration d’une autre organisation', async () => {
    const { propre } = await organisationConfiguree()
    const voisine = await organisation(connexion)
    const administrateurAutre = await utilisateurAvecRoles(connexion, voisine, ['ADMINISTRATEUR'])
    await enregistrerConfigItsm(
      administrateurAutre,
      { ...CONFIG, urlInstance: 'https://autre.service-now.com' },
      dependances(),
    )
    const ligne = await clientDeTest(connexion).connecteurItsm.findUniqueOrThrow({
      where: { organisationId: propre.organisationId },
    })
    expect(ligne.urlInstance).toBe('https://acme.service-now.com')
  })

  it('range l’adresse sous sa forme normalisée : l’origine seule', async () => {
    const propre = await organisation(connexion)
    const administrateur = await utilisateurAvecRoles(connexion, propre, ['ADMINISTRATEUR'])
    await enregistrerConfigItsm(
      administrateur,
      { ...CONFIG, urlInstance: 'https://ACME.service-now.com/nav_to.do?x=1' },
      dependances(),
    )
    const ligne = await clientDeTest(connexion).connecteurItsm.findUniqueOrThrow({
      where: { organisationId: propre.organisationId },
    })
    expect(ligne.urlInstance).toBe('https://acme.service-now.com')
  })
})

// ---------------------------------------------------------------------------
// Liste
// ---------------------------------------------------------------------------

describe('listerTickets', () => {
  it('est réservé à qui peut éditer : un administrateur ne parcourt pas les tickets', async () => {
    await expect(listerTickets(admin, {}, mock())).rejects.toBeInstanceOf(ErreurAutorisation)
  })

  it('liste les tickets en mode démonstration', async () => {
    const page = await listerTickets(org.redacteur, {}, mock())
    expect(page.tickets.length).toBe(20)
    expect(page).toMatchObject({ page: 1, taille: 20 })
    expect(page.total).toBeGreaterThan(20)
  })

  it('refuse quand aucun connecteur n’est disponible pour l’organisation', async () => {
    const erreur = await erreurMetier(listerTickets(autre.redacteur, {}, dependances()))
    expect(erreur.code).toBe('MODE_NON_DISPONIBLE')
    const desactive = await erreurMetier(
      listerTickets(
        org.redacteur,
        {},
        dependances({ reglages: { mode: 'desactive', hotesAutorises: [] } }),
      ),
    )
    expect(desactive.code).toBe('MODE_NON_DISPONIBLE')
  })

  it('n’utilise pas la configuration d’une autre organisation', async () => {
    await organisationConfiguree()
    const erreur = await erreurMetier(listerTickets(autre.redacteur, {}, dependances()))
    expect(erreur.code).toBe('MODE_NON_DISPONIBLE')
  })

  it('n’utilise pas une configuration désactivée', async () => {
    const { propre, administrateur } = await organisationConfiguree()
    await enregistrerConfigItsm(administrateur, { ...CONFIG, actif: false }, dependances())
    const erreur = await erreurMetier(listerTickets(propre.redacteur, {}, dependances()))
    expect(erreur.code).toBe('MODE_NON_DISPONIBLE')
  })

  it('traduit les filtres reçus d’une URL avant de les confier au connecteur', async () => {
    const recus: { filtres: FiltresTickets; page: PageDemandee }[] = []
    const { propre } = await organisationConfiguree()
    await listerTickets(
      propre.redacteur,
      {
        statuts: ['EN_COURS', 'NOUVEAU'],
        priorites: ['1', '2'],
        groupe: '  Support N2 ',
        du: '2026-10-01',
        au: '2026-10-31',
        page: '3',
      },
      dependances({
        fabrique: () => ({
          systeme: 'mock',
          tester: () => Promise.resolve({ ok: true, systeme: 'mock', detail: '' }),
          lire: () => Promise.reject(new Error('non utilisé')),
          lister: (filtres, page) => {
            recus.push({ filtres, page })
            return Promise.resolve({ tickets: [], total: 0, page: page.page, taille: page.taille })
          },
        }),
      }),
    )
    expect(recus[0]).toEqual({
      filtres: {
        statuts: ['EN_COURS', 'NOUVEAU'],
        priorites: [1, 2],
        groupe: 'Support N2',
        ouvertApres: new Date('2026-10-01T00:00:00Z'),
        ouvertAvant: new Date('2026-10-31T23:59:59Z'),
      },
      page: { page: 3, taille: 20 },
    })
  })

  it('ignore un filtre laissé vide', async () => {
    const page = await listerTickets(org.redacteur, { groupe: '', du: '', au: '' }, mock())
    expect(page.tickets.length).toBeGreaterThan(0)
  })

  describe('refuse des filtres qui n’en sont pas', () => {
    it('un statut inconnu', async () => {
      expect((await refusFiltres({ statuts: ['EXPLOSE'] })).details.champs).toMatchObject({
        statut: expect.any(String),
      })
    })

    it('une priorité hors échelle ou qui n’est pas un nombre', async () => {
      expect((await refusFiltres({ priorites: ['9'] })).details.champs).toMatchObject({
        priorite: expect.any(String),
      })
      expect((await refusFiltres({ priorites: ['haute'] })).details.champs).toMatchObject({
        priorite: expect.any(String),
      })
    })

    it('un groupe qui porte le séparateur d’une requête', async () => {
      expect(
        (await refusFiltres({ groupe: 'Support^ORactive=true' })).details.champs,
      ).toMatchObject({
        groupe: expect.any(String),
      })
    })

    it('une date qui n’en est pas une, ou qui n’existe pas', async () => {
      expect((await refusFiltres({ du: '12/10/2026' })).details.champs).toMatchObject({
        du: expect.any(String),
      })
      expect((await refusFiltres({ au: '2026-02-31' })).details.champs).toMatchObject({
        au: expect.any(String),
      })
    })

    it('une période à l’envers', async () => {
      const erreur = await refusFiltres({ du: '2026-10-31', au: '2026-10-01' })
      expect(erreur.details.champs).toMatchObject({ au: expect.any(String) })
    })

    it('une page qui n’est pas un entier positif', async () => {
      for (const page of ['0', '-1', 'x', '1.5']) {
        // eslint-disable-next-line no-await-in-loop -- un cas après l'autre
        expect((await refusFiltres({ page })).details.champs).toMatchObject({
          page: expect.any(String),
        })
      }
    })
  })

  it('laisse remonter la panne du connecteur, avec son code', async () => {
    const { propre } = await organisationConfiguree()
    for (const code of ['AUTH_EXPIREE', 'QUOTA', 'DELAI_DEPASSE', 'REPONSE_INVALIDE'] as const) {
      // eslint-disable-next-line no-await-in-loop -- un code après l'autre
      const erreur = await erreurItsm(
        listerTickets(propre.redacteur, {}, dependances({ fabrique: () => enPanne(code) })),
      )
      expect(erreur.code).toBe(code)
    }
  })
})

// ---------------------------------------------------------------------------
// Aperçu : ce que les agents liront
// ---------------------------------------------------------------------------

describe('apercuSourceItsm', () => {
  const CADRAGE = {
    titre: 'Incident portail',
    nature: 'INCIDENT',
    criticite: 'IMPORTANTE',
    portee: 'INTERNE',
    langue: 'fr',
    modeEntree: 'CONNECTEUR',
  } as const

  async function communication(langue: 'fr' | 'en' = 'fr') {
    const { id } = await creerCommunication(org.redacteur, { ...CADRAGE, langue })
    return id
  }

  it('est réservé à qui peut éditer', async () => {
    const id = await communication()
    await expect(
      apercuSourceItsm(
        admin,
        { communicationId: id, idExterne: ticketId, avecNotes: false },
        mock(),
      ),
    ).rejects.toBeInstanceOf(ErreurAutorisation)
  })

  it('rend le texte MASQUÉ : ni courriel ni téléphone du ticket n’en sortent', async () => {
    const id = await communication()
    const apercu = await apercuSourceItsm(
      org.redacteur,
      { communicationId: id, idExterne: ticketId, avecNotes: true },
      mock(),
    )
    expect(apercu.texte).not.toMatch(/@/u)
    expect(apercu.texte).not.toMatch(/0\d(?: ?\d{2}){4}/u)
    expect(apercu.texte).toContain('[COURRIEL]')
    expect(JSON.stringify(apercu)).not.toMatch(/@exemple\.test/u)
  })

  it('compte ce qui a été masqué, pour que l’écran puisse le dire', async () => {
    const id = await communication()
    const apercu = await apercuSourceItsm(
      org.redacteur,
      { communicationId: id, idExterne: ticketId, avecNotes: true },
      mock(),
    )
    const total = Object.values(apercu.masquages).reduce((somme, n) => somme + n, 0)
    expect(total).toBeGreaterThan(0)
  })

  it('garde les valeurs que la communication doit citer', async () => {
    const id = await communication()
    const apercu = await apercuSourceItsm(
      org.redacteur,
      { communicationId: id, idExterne: ticketId, avecNotes: false },
      mock(),
    )
    expect(apercu.texte).toMatch(/INC\d{7}/u)
    expect(apercu.texte).toMatch(/CHG-2026-\d{4}|\d+ minutes|\d{1,2} \p{L}+ 2026/u)
  })

  it('retire le demandeur par défaut', async () => {
    const id = await communication()
    const apercu = await apercuSourceItsm(
      org.redacteur,
      { communicationId: id, idExterne: ticketId, avecNotes: false },
      mock(),
    )
    expect(apercu.texte).not.toContain('Demandeur')
    expect(apercu.texte).not.toContain('Camille Renard')
  })

  it('n’inclut les notes de travail que sur demande', async () => {
    const id = await communication()
    const sans = await apercuSourceItsm(
      org.redacteur,
      { communicationId: id, idExterne: ticketId, avecNotes: false },
      mock(),
    )
    const avec = await apercuSourceItsm(
      org.redacteur,
      { communicationId: id, idExterne: ticketId, avecNotes: true },
      mock(),
    )
    expect(sans.texte).not.toContain('Notes de travail')
    expect(avec.texte).toContain('Notes de travail')
    expect(sans.avecNotes).toBe(false)
    expect(avec.avecNotes).toBe(true)
  })

  it('écrit les libellés et les dates en anglais pour une communication en anglais', async () => {
    const id = await communication('en')
    const apercu = await apercuSourceItsm(
      org.redacteur,
      { communicationId: id, idExterne: ticketId, avecNotes: true },
      mock(),
    )
    expect(apercu.texte).toContain('Opened on')
    expect(apercu.texte).toContain('Work notes:')
    expect(apercu.texte).toMatch(
      /(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 20\d{2}/u,
    )
    // Les jetons de masquage suivent la langue.
    expect(apercu.texte).not.toContain('[COURRIEL]')
  })

  it('applique le masquage propre à l’organisation', async () => {
    const { propre, administrateur } = await organisationConfiguree()
    await enregistrerConfigItsm(
      administrateur,
      {
        ...CONFIG,
        masquage: {
          ...CONFIG.masquage,
          termes: ['Passerelle API Meridian', 'Atlas'],
          identifiants: [{ prefixe: 'E', chiffresMin: 6, chiffresMax: 7 }],
        },
      },
      dependances(),
    )
    const { id } = await creerCommunication(propre.redacteur, CADRAGE)
    const resume = await new ConnecteurMock().lister({}, { page: 1, taille: 100 })
    const avecPasserelle = resume.tickets.find((t) => t.titre.includes('Passerelle API Meridian'))
    const apercu = await apercuSourceItsm(
      propre.redacteur,
      { communicationId: id, idExterne: avecPasserelle?.idExterne ?? '', avecNotes: true },
      dependances(),
    )
    expect(apercu.texte).not.toContain('Passerelle API Meridian')
    expect(apercu.texte).toContain('[MASQUÉ]')
    expect(apercu.texte).not.toMatch(/\bE\d{6,7}\b/u)
  })

  it('un demandeur peut être conservé si l’organisation le décide', async () => {
    const { propre, administrateur } = await organisationConfiguree()
    await enregistrerConfigItsm(
      administrateur,
      { ...CONFIG, masquage: { ...CONFIG.masquage, champs: [] } },
      dependances(),
    )
    const { id } = await creerCommunication(propre.redacteur, CADRAGE)
    const apercu = await apercuSourceItsm(
      propre.redacteur,
      { communicationId: id, idExterne: ticketId, avecNotes: false },
      dependances(),
    )
    expect(apercu.texte).toContain('Demandeur')
  })

  it('refuse une configuration de masquage illisible, plutôt que de masquer moins', async () => {
    const propre = await organisation(connexion)
    await clientDeTest(connexion).connecteurItsm.create({
      data: {
        organisationId: propre.organisationId,
        systeme: 'servicenow',
        urlInstance: 'https://acme.service-now.com',
        methodeAuth: 'oauth2',
        identifiantPublic: 'comgen',
        refSecret: REF_SECRET,
        masquage: { courriel: 'oui' },
      },
    })
    const { id } = await creerCommunication(propre.redacteur, CADRAGE)
    const erreur = await erreurItsm(
      apercuSourceItsm(
        propre.redacteur,
        { communicationId: id, idExterne: ticketId, avecNotes: false },
        dependances(),
      ),
    )
    expect(erreur.code).toBe('CONFIG')
  })

  it('rend une empreinte du texte vu : stable, et différente quand le texte change', async () => {
    const id = await communication()
    const entree = { communicationId: id, idExterne: ticketId }
    const a = await apercuSourceItsm(org.redacteur, { ...entree, avecNotes: false }, mock())
    const b = await apercuSourceItsm(org.redacteur, { ...entree, avecNotes: false }, mock())
    const c = await apercuSourceItsm(org.redacteur, { ...entree, avecNotes: true }, mock())
    expect(a.empreinte).toMatch(/^[0-9a-f]{64}$/u)
    expect(b.empreinte).toBe(a.empreinte)
    expect(c.empreinte).not.toBe(a.empreinte)
  })

  it('décrit d’où vient la source, sans le ticket brut', async () => {
    const id = await communication()
    const apercu = await apercuSourceItsm(
      org.redacteur,
      { communicationId: id, idExterne: ticketId, avecNotes: false },
      mock(),
    )
    expect(apercu.origine).toMatchObject({
      systeme: 'mock',
      idExterne: ticketId,
      avecNotes: false,
    })
    expect(apercu.origine.numero).toMatch(/^INC\d{7}$/u)
    expect(apercu.nom).toContain(apercu.origine.numero)
    expect(Object.keys(apercu.origine).toSorted()).toEqual([
      'avecNotes',
      'idExterne',
      'instance',
      'lien',
      'masquages',
      'numero',
      'recupereLe',
      'systeme',
    ])
  })

  it('refuse une communication dont les sources sont figées', async () => {
    const id = await communication()
    await clientDeTest(connexion).communication.update({
      where: { id },
      data: { etat: 'EN_CONTROLE' },
    })
    const erreur = await erreurMetier(
      apercuSourceItsm(
        org.redacteur,
        { communicationId: id, idExterne: ticketId, avecNotes: false },
        mock(),
      ),
    )
    expect(erreur.code).toBe('ETAT_INCOMPATIBLE')
  })

  it('ne voit pas la communication d’une autre organisation', async () => {
    const { id } = await creerCommunication(autre.redacteur, CADRAGE)
    const erreur = await erreurMetier(
      apercuSourceItsm(
        org.redacteur,
        { communicationId: id, idExterne: ticketId, avecNotes: false },
        mock(),
      ),
    )
    expect(erreur.code).toBe('INTROUVABLE')
  })

  it('dit introuvable une communication qui n’existe pas', async () => {
    const erreur = await erreurMetier(
      apercuSourceItsm(
        org.redacteur,
        { communicationId: 'nulle-part', idExterne: ticketId, avecNotes: false },
        mock(),
      ),
    )
    expect(erreur.code).toBe('INTROUVABLE')
  })

  it('laisse remonter un ticket introuvable ou un identifiant invalide', async () => {
    const id = await communication()
    const inconnu = await erreurItsm(
      apercuSourceItsm(
        org.redacteur,
        { communicationId: id, idExterne: 'f'.repeat(32), avecNotes: false },
        mock(),
      ),
    )
    expect(inconnu.code).toBe('INTROUVABLE')
    const invalide = await erreurItsm(
      apercuSourceItsm(
        org.redacteur,
        { communicationId: id, idExterne: '../x', avecNotes: false },
        mock(),
      ),
    )
    expect(invalide.code).toBe('CONFIG')
  })

  it('refuse sans connecteur disponible', async () => {
    const { id } = await creerCommunication(autre.redacteur, CADRAGE)
    const erreur = await erreurMetier(
      apercuSourceItsm(
        autre.redacteur,
        { communicationId: id, idExterne: ticketId, avecNotes: false },
        dependances(),
      ),
    )
    expect(erreur.code).toBe('MODE_NON_DISPONIBLE')
  })
})
