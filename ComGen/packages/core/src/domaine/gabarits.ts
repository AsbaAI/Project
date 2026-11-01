import type { FormatTemplate } from './enumerations.ts'

/**
 * Gabarits : la vérification d'un corps, et un catalogue d'exemples prêts
 * à l'emploi.
 *
 * Un gabarit est une mise en page à trous. Les trous (`emplacements`) sont
 * déclarés à côté du corps ; le corps les appelle par `{{cle}}`. Les deux
 * doivent coïncider, sinon la mise en page ment : un emplacement obligatoire
 * absent du corps ne sera jamais rempli, et un `{{trou}}` que personne ne
 * déclare restera écrit tel quel dans la communication envoyée.
 *
 * `verifierGabarit` est du code pur : elle ne juge pas le goût, elle
 * constate ces deux désaccords, plus les trous vides.
 */

export interface EmplacementGabarit {
  cle: string
  description: string
  obligatoire: boolean
  longueurMax: number
}

export const CLE_EMPLACEMENT = /^[a-zA-Z][a-zA-Z0-9]{0,39}$/u
const APPEL = /\{\{\s*([^{}]{0,80}?)\s*\}\}/gu

export type CodeGabarit =
  /** Un emplacement obligatoire n'est appelé nulle part dans le corps. */
  | 'EMPLACEMENT_ABSENT'
  /** Le corps appelle un `{{trou}}` qui n'est pas déclaré. */
  | 'APPEL_INCONNU'
  /** Une clé d'emplacement ne respecte pas la forme admise. */
  | 'CLE_INVALIDE'
  /** Le corps est vide. */
  | 'CORPS_VIDE'

export interface ConstatGabarit {
  code: CodeGabarit
  /** La clé concernée, quand il y en a une. */
  cle?: string
}

/** Les clés appelées par un corps, dans l'ordre, sans doublon. */
export function appelsDuCorps(corps: string): string[] {
  const vues = new Set<string>()
  for (const trouve of corps.matchAll(APPEL)) {
    const cle = trouve[1] ?? ''
    if (cle !== '') vues.add(cle)
  }
  return [...vues]
}

export function verifierGabarit(
  corps: string,
  emplacements: readonly EmplacementGabarit[],
): ConstatGabarit[] {
  const constats: ConstatGabarit[] = []
  if (corps.trim() === '') constats.push({ code: 'CORPS_VIDE' })

  for (const emplacement of emplacements) {
    if (!CLE_EMPLACEMENT.test(emplacement.cle)) {
      constats.push({ code: 'CLE_INVALIDE', cle: emplacement.cle })
    }
  }

  const declarees = new Set(emplacements.map((e) => e.cle))
  const appelees = new Set(appelsDuCorps(corps))
  for (const emplacement of emplacements) {
    if (emplacement.obligatoire && !appelees.has(emplacement.cle)) {
      constats.push({ code: 'EMPLACEMENT_ABSENT', cle: emplacement.cle })
    }
  }
  for (const appel of appelees) {
    if (!declarees.has(appel)) constats.push({ code: 'APPEL_INCONNU', cle: appel })
  }
  return constats
}

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

/**
 * Exemples prêts à l'emploi.
 *
 * Ce sont des DÉPARTS, pas une norme : une organisation les installe puis
 * les modifie. Ils n'ont ni logo, ni couleur, ni nom d'entreprise — une
 * mise en page qui porterait une marque qui n'est pas la vôtre serait à
 * refaire avant le premier envoi. Les textes fixes sont neutres et les
 * trous portent ce qui change.
 *
 * Quatre emplacements reviennent partout, parce que le domaine les pose :
 * `objet`, `mentionReprise` (« annule et remplace », écrite par le code
 * pour un correctif), `corps`, `signature`.
 */
export interface ModeleGabarit {
  /** Identifiant stable du modèle ; sert à dire ce qui est déjà installé. */
  cle: string
  format: FormatTemplate
  langue: 'fr' | 'en'
  corps: string
  emplacements: readonly EmplacementGabarit[]
}

const OBJET = (max: number, description: string): EmplacementGabarit => ({
  cle: 'objet',
  description,
  obligatoire: true,
  longueurMax: max,
})
const REPRISE = (max: number, description: string): EmplacementGabarit => ({
  cle: 'mentionReprise',
  description,
  obligatoire: false,
  longueurMax: max,
})
const CORPS = (max: number, description: string): EmplacementGabarit => ({
  cle: 'corps',
  description,
  obligatoire: true,
  longueurMax: max,
})
const SIGNATURE = (max: number, description: string): EmplacementGabarit => ({
  cle: 'signature',
  description,
  obligatoire: true,
  longueurMax: max,
})

const REPRISE_FR = 'Mention « annule et remplace », écrite par le code pour un correctif'
const REPRISE_EN = 'Supersedes notice, written by code for a corrective communication'

export const MODELES_GABARIT: readonly ModeleGabarit[] = [
  {
    cle: 'courriel-html-fr',
    format: 'MAIL_HTML',
    langue: 'fr',
    corps: [
      '<!DOCTYPE html>',
      '<html lang="fr">',
      '  <head>',
      '    <meta charset="utf-8" />',
      '    <title>{{objet}}</title>',
      '  </head>',
      '  <body>',
      '    <header>',
      '      <p>{{emetteur}}</p>',
      '      <h1>{{objet}}</h1>',
      '    </header>',
      '    <p class="mention-reprise">{{mentionReprise}}</p>',
      '    <main>{{corps}}</main>',
      '    <footer>',
      '      <p>{{signature}}</p>',
      '      <p class="desinscription">{{desinscription}}</p>',
      '    </footer>',
      '  </body>',
      '</html>',
    ].join('\n'),
    emplacements: [
      OBJET(120, 'Objet du message'),
      {
        cle: 'emetteur',
        description: 'Entité qui écrit (service, direction)',
        obligatoire: true,
        longueurMax: 120,
      },
      REPRISE(200, REPRISE_FR),
      CORPS(4000, 'Corps du message'),
      SIGNATURE(300, 'Signature de l’expéditeur'),
      {
        cle: 'desinscription',
        description: 'Mention de désinscription ou de contact',
        obligatoire: false,
        longueurMax: 200,
      },
    ],
  },
  {
    cle: 'courriel-texte-fr',
    format: 'MAIL_TEXTE',
    langue: 'fr',
    corps: [
      'Objet : {{objet}}',
      '',
      '{{mentionReprise}}',
      '',
      '{{corps}}',
      '',
      '-- ',
      '{{signature}}',
    ].join('\n'),
    emplacements: [
      OBJET(120, 'Objet du message'),
      REPRISE(200, REPRISE_FR),
      CORPS(4000, 'Corps du message, en texte brut'),
      SIGNATURE(300, 'Signature de l’expéditeur'),
    ],
  },
  {
    cle: 'newsletter-fr',
    format: 'NEWSLETTER',
    langue: 'fr',
    corps: [
      '<!DOCTYPE html>',
      '<html lang="fr">',
      '  <head>',
      '    <meta charset="utf-8" />',
      '    <title>{{objet}}</title>',
      '  </head>',
      '  <body>',
      '    <header>',
      '      <p>{{periode}}</p>',
      '      <h1>{{objet}}</h1>',
      '      <p>{{chapeau}}</p>',
      '    </header>',
      '    <p class="mention-reprise">{{mentionReprise}}</p>',
      '    <main>{{corps}}</main>',
      '    <section class="a-retenir">{{aRetenir}}</section>',
      '    <footer>',
      '      <p>{{signature}}</p>',
      '      <p class="desinscription">{{desinscription}}</p>',
      '    </footer>',
      '  </body>',
      '</html>',
    ].join('\n'),
    emplacements: [
      OBJET(120, 'Titre de l’édition'),
      {
        cle: 'periode',
        description: 'Période couverte (« Octobre 2026 »)',
        obligatoire: true,
        longueurMax: 60,
      },
      {
        cle: 'chapeau',
        description: 'Chapeau : deux phrases qui annoncent l’édition',
        obligatoire: false,
        longueurMax: 400,
      },
      REPRISE(200, REPRISE_FR),
      CORPS(8000, 'Articles de l’édition'),
      {
        cle: 'aRetenir',
        description: 'Encadré « à retenir » : les décisions et les dates',
        obligatoire: false,
        longueurMax: 800,
      },
      SIGNATURE(300, 'Rédaction'),
      {
        cle: 'desinscription',
        description: 'Mention de désinscription ou de contact',
        obligatoire: false,
        longueurMax: 200,
      },
    ],
  },
  {
    cle: 'note-interne-fr',
    format: 'PDF',
    langue: 'fr',
    corps: [
      '<article class="note">',
      '  <header>',
      '    <p class="reference">{{reference}}</p>',
      '    <h1>{{objet}}</h1>',
      '    <dl class="entete">',
      '      <dt>Émetteur</dt><dd>{{emetteur}}</dd>',
      '      <dt>Destinataires</dt><dd>{{destinataires}}</dd>',
      '      <dt>Date d’effet</dt><dd>{{dateEffet}}</dd>',
      '    </dl>',
      '    <p class="mention-reprise">{{mentionReprise}}</p>',
      '  </header>',
      '  <section>{{corps}}</section>',
      '  <footer>',
      '    <p>{{signature}}</p>',
      '  </footer>',
      '</article>',
    ].join('\n'),
    emplacements: [
      OBJET(120, 'Titre de la note'),
      {
        cle: 'reference',
        description: 'Référence de la communication (COM-AAAA-NNNN)',
        obligatoire: true,
        longueurMax: 40,
      },
      {
        cle: 'emetteur',
        description: 'Entité qui émet la note',
        obligatoire: true,
        longueurMax: 120,
      },
      {
        cle: 'destinataires',
        description: 'Audience de la note, en clair',
        obligatoire: false,
        longueurMax: 200,
      },
      {
        cle: 'dateEffet',
        description: 'Date d’effet, écrite par le code depuis le cadrage',
        obligatoire: false,
        longueurMax: 60,
      },
      REPRISE(200, REPRISE_FR),
      CORPS(8000, 'Corps de la note'),
      SIGNATURE(300, 'Émetteur et date de signature'),
    ],
  },
  {
    cle: 'message-instantane-fr',
    format: 'MESSAGE_INSTANTANE',
    langue: 'fr',
    corps: ['*{{objet}}*', '{{mentionReprise}}', '{{corps}}', '_{{signature}}_'].join('\n'),
    emplacements: [
      OBJET(80, 'Titre court'),
      REPRISE(120, REPRISE_FR),
      CORPS(1200, 'Message, trois phrases au plus'),
      SIGNATURE(80, 'Émetteur'),
    ],
  },
  {
    cle: 'article-portail-fr',
    format: 'ARTICLE',
    langue: 'fr',
    corps: [
      '<article class="portail">',
      '  <header>',
      '    <p class="rubrique">{{rubrique}}</p>',
      '    <h1>{{objet}}</h1>',
      '    <p class="chapeau">{{chapeau}}</p>',
      '    <p class="mention-reprise">{{mentionReprise}}</p>',
      '  </header>',
      '  <section>{{corps}}</section>',
      '  <footer><p>{{signature}}</p></footer>',
      '</article>',
    ].join('\n'),
    emplacements: [
      OBJET(120, 'Titre de l’article'),
      {
        cle: 'rubrique',
        description: 'Rubrique du portail',
        obligatoire: true,
        longueurMax: 60,
      },
      {
        cle: 'chapeau',
        description: 'Chapeau : ce qu’il faut retenir en deux phrases',
        obligatoire: false,
        longueurMax: 400,
      },
      REPRISE(200, REPRISE_FR),
      CORPS(8000, 'Corps de l’article'),
      SIGNATURE(300, 'Auteur et service'),
    ],
  },
  {
    cle: 'courriel-html-en',
    format: 'MAIL_HTML',
    langue: 'en',
    corps: [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '  <head>',
      '    <meta charset="utf-8" />',
      '    <title>{{objet}}</title>',
      '  </head>',
      '  <body>',
      '    <header>',
      '      <p>{{emetteur}}</p>',
      '      <h1>{{objet}}</h1>',
      '    </header>',
      '    <p class="mention-reprise">{{mentionReprise}}</p>',
      '    <main>{{corps}}</main>',
      '    <footer><p>{{signature}}</p></footer>',
      '  </body>',
      '</html>',
    ].join('\n'),
    emplacements: [
      OBJET(120, 'Subject line'),
      {
        cle: 'emetteur',
        description: 'Sending team or department',
        obligatoire: true,
        longueurMax: 120,
      },
      REPRISE(200, REPRISE_EN),
      CORPS(4000, 'Message body'),
      SIGNATURE(300, 'Sender signature'),
    ],
  },
  {
    cle: 'note-interne-en',
    format: 'PDF',
    langue: 'en',
    corps: [
      '<article class="note">',
      '  <header>',
      '    <p class="reference">{{reference}}</p>',
      '    <h1>{{objet}}</h1>',
      '    <p class="mention-reprise">{{mentionReprise}}</p>',
      '  </header>',
      '  <section>{{corps}}</section>',
      '  <footer><p>{{signature}}</p></footer>',
      '</article>',
    ].join('\n'),
    emplacements: [
      OBJET(120, 'Note title'),
      {
        cle: 'reference',
        description: 'Communication reference (COM-YYYY-NNNN)',
        obligatoire: true,
        longueurMax: 40,
      },
      REPRISE(200, REPRISE_EN),
      CORPS(8000, 'Note body'),
      SIGNATURE(300, 'Issuer and date'),
    ],
  },
]

export function modeleGabarit(cle: string): ModeleGabarit | null {
  return MODELES_GABARIT.find((modele) => modele.cle === cle) ?? null
}
