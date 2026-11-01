import { describe, expect, it } from 'vitest'

import {
  CONFIG_MASQUAGE_PAR_DEFAUT,
  type ConfigMasquage,
  PREFIXES_DE_TICKET,
  masquer,
} from './masquage.ts'

const defaut = (texte: string, langue: 'fr' | 'en' = 'fr') =>
  masquer(texte, CONFIG_MASQUAGE_PAR_DEFAUT, langue)

const avec = (surcharge: Partial<ConfigMasquage>): ConfigMasquage => ({
  ...CONFIG_MASQUAGE_PAR_DEFAUT,
  ...surcharge,
})

describe('courriels', () => {
  it('masque une adresse, le reste de la phrase intact', () => {
    expect(defaut('Contact : camille.renard@exemple.test pour toute question.').texte).toBe(
      'Contact : [COURRIEL] pour toute question.',
    )
  })

  it('ne prend pas le point qui clôt la phrase pour une partie de l’adresse', () => {
    expect(defaut('Écrire à camille.renard@exemple.test.').texte).toBe('Écrire à [COURRIEL].')
  })

  it('masque plusieurs adresses, avec plus, sous-domaines et accents', () => {
    const r = defaut('a+tag@mail.sous.exemple.test, inès.valmont@exemple.test ; x_y-z@a.io')
    expect(r.texte).toBe('[COURRIEL], [COURRIEL] ; [COURRIEL]')
    expect(r.remplacements.courriel).toBe(3)
  })

  it('ne masque pas un @ qui n’est pas une adresse', () => {
    expect(defaut('Le groupe @support est prévenu, comme user@ ou @domaine.').texte).toBe(
      'Le groupe @support est prévenu, comme user@ ou @domaine.',
    )
  })
})

describe('téléphones', () => {
  it.each(['06 12 34 56 78', '06.12.34.56.78', '06-12-34-56-78', '0612345678', '01 23 45 67 89'])(
    'masque le numéro français « %s »',
    (numero) => {
      const r = defaut(`Appeler le ${numero} avant midi.`)
      expect(r.texte).toBe('Appeler le [TÉLÉPHONE] avant midi.')
      expect(r.remplacements.telephone).toBe(1)
    },
  )

  it.each([
    '+33 6 12 34 56 78',
    '+33 (0)6 12 34 56 78',
    '+33612345678',
    '+1 514 555 0123',
    '+44 20 7946 0958',
  ])('masque le numéro international « %s »', (numero) => {
    expect(defaut(`Tél. ${numero}.`).texte).toBe('Tél. [TÉLÉPHONE].')
  })

  it.each(['514-555-0123', '(514) 555 0123', '514.555.0123'])(
    'masque le numéro nord-américain « %s »',
    (numero) => {
      expect(defaut(`Tel ${numero} today`, 'en').texte).toBe('Tel [PHONE] today')
    },
  )

  it('ne masque aucune valeur qu’une communication doit citer', () => {
    // Ce sont précisément les valeurs que la contrainte cardinale protège :
    // les masquer ferait dire à la communication autre chose que la source.
    const valeurs = [
      'La version 3.9.2 sera déployée le 12 novembre 2026.',
      'Le service sera interrompu pendant 45 minutes pour 4 500 utilisateurs.',
      'Le changement est suivi sous la référence CHG-2026-1168.',
      'Ticket INC0012345 — Portail indisponible',
      'Coût : 1 234,56 € le 20/10/2026 à 08h30.',
      'Ouvert le 2026-10-12 08:30:00 ; version 4.2.1 ; 2 112 utilisateurs.',
      'Réponse en 147 minutes, soit 2 h 27, sur 12 345 678 requêtes.',
    ]
    for (const valeur of valeurs) expect(defaut(valeur).texte).toBe(valeur)
  })

  it('ne confond pas un numéro avec ce qui le colle à un mot ou à un autre nombre', () => {
    expect(defaut('Réf. A0612345678 et 106 12 34 56 78 9').texte).toBe(
      'Réf. A0612345678 et 106 12 34 56 78 9',
    )
  })
})

describe('identifiants', () => {
  const matricules = avec({ identifiants: [{ prefixe: 'E', chiffresMin: 6, chiffresMax: 6 }] })

  it('masque les identifiants du motif configuré', () => {
    const r = masquer('Validé par E123456 puis par E654321.', matricules, 'fr')
    expect(r.texte).toBe('Validé par [IDENTIFIANT] puis par [IDENTIFIANT].')
    expect(r.remplacements.identifiant).toBe(2)
  })

  it('respecte les bornes de chiffres et ne coupe pas un mot', () => {
    const texte = 'E12345 (trop court), E1234567 (trop long), XE123456 (collé), e123456 (casse)'
    expect(masquer(texte, matricules, 'fr').texte).toBe(texte)
  })

  it('accepte une plage de chiffres', () => {
    const config = avec({ identifiants: [{ prefixe: 'USR', chiffresMin: 4, chiffresMax: 8 }] })
    expect(masquer('USR1234 USR12345678 USR123', config, 'fr').texte).toBe(
      '[IDENTIFIANT] [IDENTIFIANT] USR123',
    )
  })

  it('ne masque jamais un numéro de ticket, même si on le configure', () => {
    // Un numéro de ticket est une valeur que la communication cite.
    const config = avec({
      identifiants: PREFIXES_DE_TICKET.map((prefixe) => ({
        prefixe,
        chiffresMin: 1,
        chiffresMax: 12,
      })),
    })
    const texte = 'INC0012345 CHG0004321 RITM0001 PRB000123 TASK0009 REQ0000012'
    expect(masquer(texte, config, 'fr').texte).toBe(texte)
  })

  it('traite le préfixe comme du texte, pas comme un motif', () => {
    const config = avec({ identifiants: [{ prefixe: 'A.B', chiffresMin: 3, chiffresMax: 3 }] })
    expect(masquer('A.B123 AXB123', config, 'fr').texte).toBe('[IDENTIFIANT] AXB123')
  })
})

describe('termes', () => {
  const termes = avec({ termes: ['Marie Dupont', 'Atlas'] })

  it('masque un terme sans tenir compte de la casse ni des accents de saisie', () => {
    const r = masquer('Signalé par marie dupont et MARIE DUPONT.', termes, 'fr')
    expect(r.texte).toBe('Signalé par [MASQUÉ] et [MASQUÉ].')
    expect(r.remplacements.terme).toBe(2)
  })

  it('ne masque que le mot entier', () => {
    expect(masquer('Atlas, Atlassian, atlas-2 et Atlas.', termes, 'fr').texte).toBe(
      '[MASQUÉ], Atlassian, [MASQUÉ]-2 et [MASQUÉ].',
    )
  })

  it('traite un terme comme du texte, pas comme un motif', () => {
    const config = avec({ termes: ['a.c', '(x+)+y'] })
    expect(masquer('abc a.c (x+)+y xxxxxxxxxxxxxxxxxxxxxxxx', config, 'fr').texte).toBe(
      'abc [MASQUÉ] [MASQUÉ] xxxxxxxxxxxxxxxxxxxxxxxx',
    )
  })

  it('ignore un terme vide ou d’un seul caractère', () => {
    const config = avec({ termes: ['', ' ', 'a'] })
    expect(masquer('a b c', config, 'fr').texte).toBe('a b c')
  })
})

describe('configuration', () => {
  it('ne masque pas ce qu’on a désactivé', () => {
    const texte = 'camille@exemple.test, 06 12 34 56 78'
    expect(masquer(texte, avec({ courriel: false }), 'fr').texte).toBe(
      'camille@exemple.test, [TÉLÉPHONE]',
    )
    expect(masquer(texte, avec({ telephone: false }), 'fr').texte).toBe(
      '[COURRIEL], 06 12 34 56 78',
    )
  })

  it('masque courriels et téléphones par défaut', () => {
    expect(CONFIG_MASQUAGE_PAR_DEFAUT).toMatchObject({ courriel: true, telephone: true })
  })
})

describe('langue des jetons', () => {
  it('écrit les jetons en anglais pour une communication en anglais', () => {
    const config = avec({
      identifiants: [{ prefixe: 'E', chiffresMin: 6, chiffresMax: 6 }],
      termes: ['Dupont'],
    })
    expect(masquer('a@exemple.test 06 12 34 56 78 E123456 Dupont', config, 'en').texte).toBe(
      '[EMAIL] [PHONE] [ID] [MASKED]',
    )
  })
})

describe('comportement général', () => {
  it('rend le texte intact et les compteurs à zéro quand il n’y a rien à masquer', () => {
    const r = defaut('Le portail sera mis à jour le 12 novembre 2026.')
    expect(r.texte).toBe('Le portail sera mis à jour le 12 novembre 2026.')
    expect(r.remplacements).toEqual({ courriel: 0, telephone: 0, identifiant: 0, terme: 0 })
  })

  it('accepte un texte vide', () => {
    expect(defaut('').texte).toBe('')
  })

  it('garde les sauts de ligne et la ponctuation autour des remplacements', () => {
    expect(defaut('a@b.test,06 12 34 56 78;\n(c@d.test)\n').texte).toBe(
      '[COURRIEL],[TÉLÉPHONE];\n([COURRIEL])\n',
    )
  })

  it('ne remasque pas ce qu’il vient de produire', () => {
    // Un terme égal à un jeton ne doit pas manger le jeton qu'on vient de poser.
    const config = avec({ termes: ['COURRIEL'] })
    expect(masquer('a@b.test COURRIEL', config, 'fr').texte).toBe('[COURRIEL] [MASQUÉ]')
  })

  it('est idempotent', () => {
    const texte = 'a@b.test, 06 12 34 56 78, et E123456.'
    const config = avec({ identifiants: [{ prefixe: 'E', chiffresMin: 6, chiffresMax: 6 }] })
    const une = masquer(texte, config, 'fr').texte
    expect(masquer(une, config, 'fr').texte).toBe(une)
  })

  it('garde le motif qui commence le premier quand deux se chevauchent', () => {
    // Le terme « Dupont » est dans l'adresse : c'est l'adresse entière qui part.
    const config = avec({ termes: ['Dupont'] })
    const r = masquer('marie.dupont@exemple.test', config, 'fr')
    expect(r.texte).toBe('[COURRIEL]')
    expect(r.remplacements).toMatchObject({ courriel: 1, terme: 0 })
  })
})

describe('entrées pathologiques', () => {
  const config = avec({
    identifiants: [{ prefixe: 'E', chiffresMin: 1, chiffresMax: 12 }],
    termes: ['a'.repeat(30)],
  })

  it('ne s’emballe sur aucune entrée longue construite pour ralentir les motifs', () => {
    // Un texte de ticket vient de l'extérieur : un motif mal borné s'y
    // révélerait quadratique, et un seul ticket suffirait à bloquer le serveur.
    const entrees = [
      'a'.repeat(200_000),
      '0'.repeat(200_000),
      'a@'.repeat(100_000),
      'a@b.'.repeat(50_000),
      '+33 '.repeat(50_000),
      '06 '.repeat(70_000),
      '(514) '.repeat(40_000),
      `${'a.'.repeat(100_000)}@`,
      'E'.repeat(200_000),
    ]
    const debut = performance.now()
    for (const entree of entrees) masquer(entree, config, 'fr')
    expect(performance.now() - debut).toBeLessThan(3000)
  })
})
