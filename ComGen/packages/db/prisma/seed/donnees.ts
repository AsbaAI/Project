/**
 * Référentiel de démonstration (spécification §20) : organisations, régions,
 * sites, utilisateurs, personas, templates, canevas, entités et listes de
 * diffusion. Identifiants fixes et lisibles : le seed est rejouable et les
 * tests comme la documentation peuvent les citer.
 *
 * Les types sont ceux des `createMany` Prisma : une colonne obligatoire
 * oubliée est une erreur de compilation, pas une erreur à l'exécution.
 */

import type { Prisma, RoleUtilisateur } from '../../src/generated/client.ts'

/** Date figée de création du référentiel. */
export const CREE_LE = new Date('2026-09-01T08:00:00.000Z')

// ---------------------------------------------------------------------------
// Organisations, régions, sites
// ---------------------------------------------------------------------------

export const ORG_HELVEA = 'org_helvea'
export const ORG_KESTREL = 'org_kestrel'

export const REG_HELVEA_FRANCE = 'reg_helvea_france'
export const REG_HELVEA_AMERIQUE_NORD = 'reg_helvea_amerique_nord'
export const REG_KESTREL_UK = 'reg_kestrel_united_kingdom'

export const SITE_HELVEA_PARIS = 'site_helvea_paris_siege'
export const SITE_HELVEA_LYON = 'site_helvea_lyon_centre_services'
export const SITE_HELVEA_MONTREAL = 'site_helvea_montreal'
export const SITE_KESTREL_LONDON = 'site_kestrel_london_head_office'

export const ORGANISATIONS: Prisma.OrganisationCreateManyInput[] = [
  {
    id: ORG_HELVEA,
    nom: 'Helvéa Groupe',
    codePays: 'FR',
    fuseauHoraire: 'Europe/Paris',
    localeDefaut: 'fr',
    creeLe: CREE_LE,
  },
  {
    id: ORG_KESTREL,
    nom: 'Kestrel Logistics',
    codePays: 'GB',
    fuseauHoraire: 'Europe/London',
    localeDefaut: 'en',
    creeLe: CREE_LE,
  },
]

export const REGIONS: Prisma.RegionCreateManyInput[] = [
  {
    id: REG_HELVEA_FRANCE,
    organisationId: ORG_HELVEA,
    nom: 'France',
    localesAutorisees: ['fr', 'en'],
    residenceDonnees: 'UE',
    modelesAutorises: [],
  },
  {
    id: REG_HELVEA_AMERIQUE_NORD,
    organisationId: ORG_HELVEA,
    nom: 'Amérique du Nord',
    localesAutorisees: ['fr', 'en'],
    residenceDonnees: 'CA',
    modelesAutorises: [],
  },
  {
    id: REG_KESTREL_UK,
    organisationId: ORG_KESTREL,
    nom: 'United Kingdom',
    localesAutorisees: ['en'],
    residenceDonnees: 'UK',
    modelesAutorises: [],
  },
]

export const SITES: Prisma.SiteCreateManyInput[] = [
  {
    id: SITE_HELVEA_PARIS,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nom: 'Paris – Siège',
    fuseauHoraire: 'Europe/Paris',
  },
  {
    id: SITE_HELVEA_LYON,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nom: 'Lyon – Centre de services',
    fuseauHoraire: 'Europe/Paris',
  },
  {
    id: SITE_HELVEA_MONTREAL,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_AMERIQUE_NORD,
    nom: 'Montréal',
    fuseauHoraire: 'America/Toronto',
  },
  {
    id: SITE_KESTREL_LONDON,
    organisationId: ORG_KESTREL,
    regionId: REG_KESTREL_UK,
    nom: 'London – Head office',
    fuseauHoraire: 'Europe/London',
  },
]

// ---------------------------------------------------------------------------
// Utilisateurs (§16). `sujetOidc` simulé : `sim:<id>`.
// ---------------------------------------------------------------------------

export const USR_CLAIRE_FONTAINE = 'usr_claire_fontaine'
export const USR_MARC_DELAUNAY = 'usr_marc_delaunay'
export const USR_SOPHIE_MARCHAND = 'usr_sophie_marchand'
export const USR_JULIEN_TREMBLAY = 'usr_julien_tremblay'
export const USR_NADIA_BENALI = 'usr_nadia_benali'
export const USR_PAUL_GIRARD = 'usr_paul_girard'
export const USR_LEA_MOREAU = 'usr_lea_moreau'
export const USR_OLIVIA_HART = 'usr_olivia_hart'
export const USR_JAMES_WHITAKER = 'usr_james_whitaker'
export const USR_PRIYA_NAIR = 'usr_priya_nair'

function utilisateur(
  id: string,
  organisationId: string,
  regionId: string,
  siteId: string,
  nom: string,
  courriel: string,
  roles: RoleUtilisateur[],
): Prisma.UtilisateurCreateManyInput {
  return {
    id,
    organisationId,
    regionId,
    siteId,
    nom,
    courriel,
    sujetOidc: `sim:${id}`,
    roles,
    actif: true,
    creeLe: CREE_LE,
  }
}

export const UTILISATEURS: Prisma.UtilisateurCreateManyInput[] = [
  utilisateur(
    USR_CLAIRE_FONTAINE,
    ORG_HELVEA,
    REG_HELVEA_FRANCE,
    SITE_HELVEA_PARIS,
    'Claire Fontaine',
    'claire.fontaine@helvea.example',
    ['REDACTEUR'],
  ),
  utilisateur(
    USR_MARC_DELAUNAY,
    ORG_HELVEA,
    REG_HELVEA_FRANCE,
    SITE_HELVEA_LYON,
    'Marc Delaunay',
    'marc.delaunay@helvea.example',
    ['RELECTEUR'],
  ),
  utilisateur(
    USR_SOPHIE_MARCHAND,
    ORG_HELVEA,
    REG_HELVEA_FRANCE,
    SITE_HELVEA_PARIS,
    'Sophie Marchand',
    'sophie.marchand@helvea.example',
    ['APPROBATEUR'],
  ),
  utilisateur(
    USR_JULIEN_TREMBLAY,
    ORG_HELVEA,
    REG_HELVEA_AMERIQUE_NORD,
    SITE_HELVEA_MONTREAL,
    'Julien Tremblay',
    'julien.tremblay@helvea.example',
    ['APPROBATEUR'],
  ),
  utilisateur(
    USR_NADIA_BENALI,
    ORG_HELVEA,
    REG_HELVEA_FRANCE,
    SITE_HELVEA_PARIS,
    'Nadia Benali',
    'nadia.benali@helvea.example',
    ['ADMINISTRATEUR'],
  ),
  utilisateur(
    USR_PAUL_GIRARD,
    ORG_HELVEA,
    REG_HELVEA_FRANCE,
    SITE_HELVEA_PARIS,
    'Paul Girard',
    'paul.girard@helvea.example',
    ['AUDITEUR'],
  ),
  utilisateur(
    USR_LEA_MOREAU,
    ORG_HELVEA,
    REG_HELVEA_FRANCE,
    SITE_HELVEA_LYON,
    'Léa Moreau',
    'lea.moreau@helvea.example',
    ['REDACTEUR', 'RELECTEUR'],
  ),
  utilisateur(
    USR_OLIVIA_HART,
    ORG_KESTREL,
    REG_KESTREL_UK,
    SITE_KESTREL_LONDON,
    'Olivia Hart',
    'olivia.hart@kestrel.example',
    ['REDACTEUR'],
  ),
  utilisateur(
    USR_JAMES_WHITAKER,
    ORG_KESTREL,
    REG_KESTREL_UK,
    SITE_KESTREL_LONDON,
    'James Whitaker',
    'james.whitaker@kestrel.example',
    ['APPROBATEUR'],
  ),
  utilisateur(
    USR_PRIYA_NAIR,
    ORG_KESTREL,
    REG_KESTREL_UK,
    SITE_KESTREL_LONDON,
    'Priya Nair',
    'priya.nair@kestrel.example',
    ['ADMINISTRATEUR'],
  ),
]

// ---------------------------------------------------------------------------
// Personas (§9). Structure JSON :
//   voix      { registre, ton, personne, longueurCible (mots), structure[] }
//   lexique   { fr: { preferes[], interdits[] }, en: { preferes[], interdits[] } }
//   gardeFous { confidentialiteMax, sujetsInterdits[] }
// ---------------------------------------------------------------------------

export const PER_HELVEA_DIRECTION_GENERALE = 'per_helvea_direction_generale'
export const PER_HELVEA_EQUIPES_TECHNIQUES = 'per_helvea_equipes_techniques'
export const PER_HELVEA_CLIENTS_GRANDS_COMPTES = 'per_helvea_clients_grands_comptes'
export const PER_HELVEA_PARTENAIRES_INTEGRATEURS = 'per_helvea_partenaires_integrateurs'
export const PER_HELVEA_SUPPORT_CLIENT = 'per_helvea_support_client'
export const PER_HELVEA_FOURNISSEURS = 'per_helvea_fournisseurs'
export const PER_HELVEA_CLIENTS_AMERIQUE_NORD = 'per_helvea_clients_amerique_nord'
export const PER_KESTREL_CUSTOMERS = 'per_kestrel_customers'

export const PERSONAS: Prisma.PersonaCreateManyInput[] = [
  {
    id: PER_HELVEA_DIRECTION_GENERALE,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nom: 'Direction générale',
    actif: true,
    voix: {
      registre: 'soutenu',
      ton: 'synthétique, orienté décision, sans jargon technique',
      personne: 'nous',
      longueurCible: 150,
      structure: ['enjeu', 'décision ou changement', 'impact', 'prochaine étape'],
    },
    lexique: {
      fr: {
        preferes: ['enjeu', 'décision', 'impact métier', 'échéance', 'risque maîtrisé'],
        interdits: ['bug', 'crash', 'rollback', 'patch'],
      },
      en: {
        preferes: ['business impact', 'decision', 'milestone', 'mitigated risk'],
        interdits: ['bug', 'crash', 'rollback', 'patch'],
      },
    },
    gardeFous: {
      confidentialiteMax: 'RESTREINT',
      sujetsInterdits: ['données personnelles nominatives', 'rémunérations'],
    },
    exemples: [
      "La migration du portail client est planifiée dans une fenêtre nocturne d'une nuit ; l'impact commercial est limité à une interruption courte, annoncée aux clients cinq jours ouvrés à l'avance.",
      "L'incident du 15 septembre a été résolu le jour même sans perte de données ; une analyse post-incident est présentée au comité d'exploitation de la semaine prochaine.",
    ],
    canalDefaut: 'COURRIEL',
    approbateurIds: [USR_SOPHIE_MARCHAND],
  },
  {
    id: PER_HELVEA_EQUIPES_TECHNIQUES,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nom: 'Équipes techniques',
    actif: true,
    voix: {
      registre: 'professionnel',
      ton: 'précis, opérationnel, identifiants et horaires explicites',
      personne: 'vous',
      longueurCible: 250,
      structure: ['référence et périmètre', 'chronologie', 'actions attendues', 'contacts'],
    },
    lexique: {
      fr: {
        preferes: [
          'fenêtre d’intervention',
          'procédure de repli',
          'environnement de préproduction',
        ],
        interdits: ['petit souci', 'normalement'],
      },
      en: {
        preferes: ['maintenance window', 'rollback procedure', 'staging environment'],
        interdits: ['small glitch', 'should be fine'],
      },
    },
    gardeFous: {
      confidentialiteMax: 'RESTREINT',
      sujetsInterdits: ['mots de passe et secrets en clair'],
    },
    exemples: [
      "Intervention CHG-2026-0412 : bascule des serveurs LYO-APP-01 à LYO-APP-04 entre 22h00 et 02h00, interruption estimée à 45 minutes. Point d'avancement toutes les 30 minutes sur le canal dédié.",
      "Incident INC-2026-0187 : saturation du volume de journaux de la base de facturation, service rétabli après extension du volume. Analyse post-incident au comité d'exploitation du 22 septembre.",
    ],
    canalDefaut: 'MESSAGERIE_INSTANTANEE',
    approbateurIds: [USR_SOPHIE_MARCHAND],
  },
  {
    id: PER_HELVEA_CLIENTS_GRANDS_COMPTES,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nom: 'Clients grands comptes',
    actif: true,
    voix: {
      registre: 'soutenu',
      ton: 'courtois, rassurant, factuel ; jamais d’excuses excessives',
      personne: 'vous',
      longueurCible: 200,
      structure: ['ce qui change pour vous', 'quand', 'ce que nous faisons', 'votre interlocuteur'],
    },
    lexique: {
      fr: {
        preferes: ['votre portail', 'interruption programmée', 'votre interlocuteur dédié'],
        interdits: ['panne', 'bug', 'DSI', 'prod', 'rollback'],
      },
      en: {
        preferes: ['your portal', 'scheduled interruption', 'your dedicated contact'],
        interdits: ['outage', 'bug', 'prod', 'rollback'],
      },
    },
    gardeFous: {
      confidentialiteMax: 'PUBLIC',
      sujetsInterdits: ['architecture interne', 'noms de serveurs', 'causes internes détaillées'],
    },
    exemples: [
      "Votre Portail client Atlas évoluera vers la version 4.2.0 dans la nuit du 14 au 15 octobre 2026. L'accès sera interrompu pendant 45 minutes environ ; aucune action n'est attendue de votre part.",
      "Nous vous confirmons que l'accès à vos factures est rétabli. Toutes les factures dont l'émission avait été différée ont été mises à disposition le jour même.",
    ],
    canalDefaut: 'COURRIEL',
    approbateurIds: [USR_SOPHIE_MARCHAND],
  },
  {
    id: PER_HELVEA_PARTENAIRES_INTEGRATEURS,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nom: 'Partenaires intégrateurs',
    actif: true,
    voix: {
      registre: 'professionnel',
      ton: 'technique mais externe : API, versions, dates limites, sans détail d’infrastructure',
      personne: 'vous',
      longueurCible: 220,
      structure: ['changement d’interface', 'calendrier', 'actions attendues', 'support'],
    },
    lexique: {
      fr: {
        preferes: ['API Atlas', 'SDK', 'connecteur', 'date limite de mise à jour'],
        interdits: ['serveur', 'base de données', 'coffre', 'HSM'],
      },
      en: {
        preferes: ['Atlas API', 'SDK', 'connector', 'update deadline'],
        interdits: ['server', 'database', 'vault', 'HSM'],
      },
    },
    gardeFous: {
      confidentialiteMax: 'PUBLIC',
      sujetsInterdits: ['infrastructure interne', 'secrets', 'volumes commerciaux'],
    },
    exemples: [
      "L'API Atlas passe en version 4.2 le 14 octobre 2026. Les connecteurs doivent être recompilés avec le SDK 4.2 avant le 13 octobre 2026 ; le SDK 4.1 ne sera plus accepté après la migration.",
      "Pendant l'interruption programmée, les paiements par carte seront différés puis rejoués automatiquement : aucun traitement particulier n'est attendu côté connecteur.",
    ],
    canalDefaut: 'COURRIEL',
    approbateurIds: [USR_SOPHIE_MARCHAND],
  },
  {
    id: PER_HELVEA_SUPPORT_CLIENT,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nom: 'Support client',
    actif: true,
    voix: {
      registre: 'professionnel',
      ton: 'pratique : éléments de langage, questions probables, réponses courtes',
      personne: 'vous',
      longueurCible: 300,
      structure: [
        'résumé en trois lignes',
        'éléments de langage',
        'questions fréquentes',
        'escalade',
      ],
    },
    lexique: {
      fr: {
        preferes: ['éléments de langage', 'escalade', 'ticket', 'client concerné'],
        interdits: ['c’est la faute de', 'ils'],
      },
      en: {
        preferes: ['talking points', 'escalation', 'ticket', 'affected customer'],
        interdits: ['blame', 'they broke'],
      },
    },
    gardeFous: {
      confidentialiteMax: 'INTERNE',
      sujetsInterdits: ['secrets techniques', 'données d’autres clients'],
    },
    exemples: [
      "Si un client signale l'absence d'une facture du 15 septembre : les factures différées ont toutes été émises avant 17h00 le même jour ; inviter à rafraîchir l'espace Factures puis ouvrir un ticket si elle manque encore.",
      'Migration Atlas 4.2.0 : interruption de 45 minutes dans la nuit du 14 au 15 octobre. Aucune action client. Escalade vers le centre de services de Lyon en cas de blocage après 06h00.',
    ],
    canalDefaut: 'PORTAIL',
    approbateurIds: [USR_SOPHIE_MARCHAND],
  },
  {
    id: PER_HELVEA_FOURNISSEURS,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nom: 'Fournisseurs',
    actif: true,
    voix: {
      registre: 'formel',
      ton: 'contractuel, neutre, sans information sur les clients finaux',
      personne: 'vous',
      longueurCible: 180,
      structure: ['objet', 'obligation ou changement', 'échéance', 'contact achats'],
    },
    lexique: {
      fr: {
        preferes: ['prestation', 'contrat cadre', 'échéance contractuelle', 'service achats'],
        interdits: ['nos clients', 'chiffre d’affaires', 'marge'],
      },
      en: {
        preferes: ['service', 'framework agreement', 'contractual deadline', 'procurement'],
        interdits: ['our customers', 'revenue', 'margin'],
      },
    },
    gardeFous: {
      confidentialiteMax: 'PUBLIC',
      sujetsInterdits: ['clients finaux', 'données financières', 'incidents non clos'],
    },
    exemples: [
      'Dans le cadre du contrat cadre, nous vous informons du gel des déploiements sur la plateforme du 12 au 16 octobre 2026 inclus. Toute intervention planifiée sur cette période est à reprogrammer avec le service achats.',
      "La politique de conservation des données clients, version 3.0, s'applique aux prestataires traitant des données pour notre compte à compter du 1er janvier 2027.",
    ],
    canalDefaut: 'COURRIEL',
    approbateurIds: [USR_SOPHIE_MARCHAND],
  },
  {
    id: PER_HELVEA_CLIENTS_AMERIQUE_NORD,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_AMERIQUE_NORD,
    nom: 'Clients Amérique du Nord',
    actif: true,
    voix: {
      registre: 'professional',
      ton: 'clear, courteous, factual; times always given in Eastern Time',
      personne: 'you',
      longueurCible: 200,
      structure: [
        'what changes for you',
        'when (Eastern Time)',
        'what we are doing',
        'your contact',
      ],
    },
    lexique: {
      fr: {
        preferes: ['votre portail', 'interruption programmée', 'heure de l’Est'],
        interdits: ['panne', 'bug', 'rollback'],
      },
      en: {
        preferes: ['your portal', 'scheduled interruption', 'Eastern Time', 'your account manager'],
        interdits: ['outage', 'bug', 'rollback', 'prod'],
      },
    },
    gardeFous: {
      confidentialiteMax: 'PUBLIC',
      sujetsInterdits: ['internal architecture', 'server names', 'root causes in detail'],
    },
    exemples: [
      'Your Atlas customer portal will be upgraded to version 4.2.0 during a scheduled window. Access will be interrupted for about 45 minutes; no action is required on your side.',
      'The new data retention policy applies to all customer accounts from January 1, 2027. Your account manager can answer any question about your data.',
    ],
    canalDefaut: 'COURRIEL',
    approbateurIds: [USR_JULIEN_TREMBLAY],
  },
  {
    id: PER_KESTREL_CUSTOMERS,
    organisationId: ORG_KESTREL,
    regionId: REG_KESTREL_UK,
    nom: 'Customers',
    actif: true,
    voix: {
      registre: 'professional',
      ton: 'direct, practical, developer-friendly where relevant',
      personne: 'you',
      longueurCible: 220,
      structure: ['what is changing', 'when', 'what you need to do', 'where to get help'],
    },
    lexique: {
      fr: {
        preferes: ['Track & Trace', 'limite de requêtes', 'webhook'],
        interdits: ['panne', 'bug'],
      },
      en: {
        preferes: ['Track & Trace', 'rate limit', 'webhook', 'release'],
        interdits: ['outage', 'bug', 'hotfix'],
      },
    },
    gardeFous: {
      confidentialiteMax: 'PUBLIC',
      sujetsInterdits: ['internal infrastructure', 'other customers’ volumes'],
    },
    exemples: [
      'Release 3.8 introduces rate limits per plan on the public tracking API. Please review your polling frequency before the release date; webhooks are not affected.',
      'No downtime is expected during the deployment. If you notice any degradation, contact api-support@kestrel.example with your account reference.',
    ],
    canalDefaut: 'COURRIEL',
    approbateurIds: [USR_JAMES_WHITAKER],
  },
]

// ---------------------------------------------------------------------------
// Templates (§9). Emplacements : [{ cle, description, obligatoire, longueurMax }].
// `mentionReprise` est rempli par le code pour un CORRECTIF (« annule et
// remplace », §10), jamais par un modèle.
// ---------------------------------------------------------------------------

export const TPL_HELVEA_COURRIEL_HTML_FR = 'tpl_helvea_courriel_html_fr'
export const TPL_HELVEA_COURRIEL_TEXTE_FR = 'tpl_helvea_courriel_texte_fr'
export const TPL_HELVEA_NOTE_PDF_FR = 'tpl_helvea_note_pdf_fr'
export const TPL_HELVEA_MESSAGE_INSTANTANE_FR = 'tpl_helvea_message_instantane_fr'
export const TPL_HELVEA_COURRIEL_HTML_EN = 'tpl_helvea_courriel_html_en'
export const TPL_KESTREL_COURRIEL_HTML_EN = 'tpl_kestrel_courriel_html_en'

const EMPLACEMENTS_COURRIEL_FR = [
  { cle: 'objet', description: 'Objet du message', obligatoire: true, longueurMax: 120 },
  {
    cle: 'mentionReprise',
    description: 'Mention « annule et remplace » posée par le code pour un correctif',
    obligatoire: false,
    longueurMax: 200,
  },
  { cle: 'corps', description: 'Corps du message', obligatoire: true, longueurMax: 4000 },
  {
    cle: 'signature',
    description: 'Signature de l’expéditeur',
    obligatoire: true,
    longueurMax: 300,
  },
]

const EMPLACEMENTS_COURRIEL_EN = [
  { cle: 'objet', description: 'Subject line', obligatoire: true, longueurMax: 120 },
  {
    cle: 'mentionReprise',
    description: 'Supersedes notice set by code for a corrective communication',
    obligatoire: false,
    longueurMax: 200,
  },
  { cle: 'corps', description: 'Message body', obligatoire: true, longueurMax: 4000 },
  { cle: 'signature', description: 'Sender signature', obligatoire: true, longueurMax: 300 },
]

export const TEMPLATES: Prisma.TemplateCreateManyInput[] = [
  {
    id: TPL_HELVEA_COURRIEL_HTML_FR,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nom: 'Courriel HTML (fr)',
    format: 'MAIL_HTML',
    version: 1,
    corps: [
      '<!DOCTYPE html>',
      '<html lang="fr">',
      '<head><meta charset="utf-8"><title>{{objet}}</title></head>',
      '<body>',
      '<header><p><strong>Helvéa Groupe</strong></p><h1>{{objet}}</h1></header>',
      '<p class="mention-reprise">{{mentionReprise}}</p>',
      '<main>{{corps}}</main>',
      '<footer><p>{{signature}}</p></footer>',
      '</body>',
      '</html>',
    ].join('\n'),
    emplacements: EMPLACEMENTS_COURRIEL_FR,
    actif: true,
  },
  {
    id: TPL_HELVEA_COURRIEL_TEXTE_FR,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nom: 'Courriel texte (fr)',
    format: 'MAIL_TEXTE',
    version: 1,
    corps: [
      'Objet : {{objet}}',
      '',
      '{{mentionReprise}}',
      '{{corps}}',
      '',
      '-- ',
      '{{signature}}',
    ].join('\n'),
    emplacements: EMPLACEMENTS_COURRIEL_FR,
    actif: true,
  },
  {
    id: TPL_HELVEA_NOTE_PDF_FR,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nom: 'Note PDF (fr)',
    format: 'PDF',
    version: 1,
    corps: [
      '<article class="note">',
      '<header><p>Helvéa Groupe — Note d’information</p><h1>{{objet}}</h1><p>{{mentionReprise}}</p></header>',
      '<section>{{corps}}</section>',
      '<footer><p>{{signature}}</p></footer>',
      '</article>',
    ].join('\n'),
    emplacements: [
      { cle: 'objet', description: 'Titre de la note', obligatoire: true, longueurMax: 120 },
      {
        cle: 'mentionReprise',
        description: 'Mention « annule et remplace » posée par le code pour un correctif',
        obligatoire: false,
        longueurMax: 200,
      },
      { cle: 'corps', description: 'Corps de la note', obligatoire: true, longueurMax: 8000 },
      { cle: 'signature', description: 'Émetteur et date', obligatoire: true, longueurMax: 300 },
    ],
    actif: true,
  },
  {
    id: TPL_HELVEA_MESSAGE_INSTANTANE_FR,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nom: 'Message instantané (fr)',
    format: 'MESSAGE_INSTANTANE',
    version: 1,
    corps: ['*{{objet}}*', '{{mentionReprise}}', '{{corps}}', '_{{signature}}_'].join('\n'),
    emplacements: [
      { cle: 'objet', description: 'Titre court du message', obligatoire: true, longueurMax: 80 },
      {
        cle: 'mentionReprise',
        description: 'Mention « annule et remplace » posée par le code pour un correctif',
        obligatoire: false,
        longueurMax: 120,
      },
      { cle: 'corps', description: 'Corps du message', obligatoire: true, longueurMax: 1200 },
      { cle: 'signature', description: 'Émetteur', obligatoire: true, longueurMax: 80 },
    ],
    actif: true,
  },
  {
    id: TPL_HELVEA_COURRIEL_HTML_EN,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_AMERIQUE_NORD,
    nom: 'HTML email (en)',
    format: 'MAIL_HTML',
    version: 1,
    corps: [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head><meta charset="utf-8"><title>{{objet}}</title></head>',
      '<body>',
      '<header><p><strong>Helvéa Group – North America</strong></p><h1>{{objet}}</h1></header>',
      '<p class="mention-reprise">{{mentionReprise}}</p>',
      '<main>{{corps}}</main>',
      '<footer><p>{{signature}}</p></footer>',
      '</body>',
      '</html>',
    ].join('\n'),
    emplacements: EMPLACEMENTS_COURRIEL_EN,
    actif: true,
  },
  {
    id: TPL_KESTREL_COURRIEL_HTML_EN,
    organisationId: ORG_KESTREL,
    regionId: REG_KESTREL_UK,
    nom: 'HTML email (en)',
    format: 'MAIL_HTML',
    version: 1,
    corps: [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head><meta charset="utf-8"><title>{{objet}}</title></head>',
      '<body>',
      '<header><p><strong>Kestrel Logistics</strong></p><h1>{{objet}}</h1></header>',
      '<p class="mention-reprise">{{mentionReprise}}</p>',
      '<main>{{corps}}</main>',
      '<footer><p>{{signature}}</p></footer>',
      '</body>',
      '</html>',
    ].join('\n'),
    emplacements: EMPLACEMENTS_COURRIEL_EN,
    actif: true,
  },
]

// ---------------------------------------------------------------------------
// Canevas (§10). Emplacements : [{ cle, question, obligatoire, typeAttendu, longueurMax }].
// ---------------------------------------------------------------------------

export const CANEVAS: Prisma.CanevasCreateManyInput[] = [
  {
    id: 'cnv_helvea_changement',
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nature: 'CHANGE',
    nom: 'Fiche de changement',
    emplacements: [
      {
        cle: 'reference',
        question: 'Quelle est la référence du changement ?',
        obligatoire: true,
        typeAttendu: 'IDENTIFIANT',
        longueurMax: 40,
      },
      {
        cle: 'perimetre',
        question: 'Quels systèmes ou services sont touchés ?',
        obligatoire: true,
        typeAttendu: 'TEXTE',
        longueurMax: 600,
      },
      {
        cle: 'fenetre',
        question: 'Quand l’intervention a-t-elle lieu (date, heures, fuseau) ?',
        obligatoire: true,
        typeAttendu: 'DATE',
        longueurMax: 120,
      },
      {
        cle: 'interruption',
        question: 'Quelle est la durée d’interruption estimée ?',
        obligatoire: true,
        typeAttendu: 'NOMBRE',
        longueurMax: 40,
      },
      {
        cle: 'repli',
        question: 'Quelle est la procédure de repli ?',
        obligatoire: false,
        typeAttendu: 'TEXTE',
        longueurMax: 600,
      },
    ],
  },
  {
    id: 'cnv_helvea_incident',
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    nature: 'INCIDENT',
    nom: 'Déclaration d’incident',
    emplacements: [
      {
        cle: 'reference',
        question: 'Quelle est la référence du ticket ?',
        obligatoire: true,
        typeAttendu: 'IDENTIFIANT',
        longueurMax: 40,
      },
      {
        cle: 'debut',
        question: 'À quelle heure l’incident a-t-il commencé ?',
        obligatoire: true,
        typeAttendu: 'DATE',
        longueurMax: 80,
      },
      {
        cle: 'impact',
        question: 'Quel est l’impact constaté pour les utilisateurs ?',
        obligatoire: true,
        typeAttendu: 'TEXTE',
        longueurMax: 600,
      },
      {
        cle: 'retablissement',
        question: 'À quelle heure le service a-t-il été rétabli ?',
        obligatoire: false,
        typeAttendu: 'DATE',
        longueurMax: 80,
      },
      {
        cle: 'suites',
        question: 'Quelles suites sont prévues ?',
        obligatoire: false,
        typeAttendu: 'TEXTE',
        longueurMax: 600,
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Listes de diffusion (STATIQUE). definition : { destinataires: [{ nom, courriel }] }.
// ---------------------------------------------------------------------------

export const LST_HELVEA_DIRECTION_GENERALE = 'lst_helvea_direction_generale'
export const LST_HELVEA_EQUIPES_TECHNIQUES = 'lst_helvea_equipes_techniques'
export const LST_HELVEA_CLIENTS_GRANDS_COMPTES = 'lst_helvea_clients_grands_comptes'
export const LST_HELVEA_PARTENAIRES_INTEGRATEURS = 'lst_helvea_partenaires_integrateurs'
export const LST_HELVEA_SUPPORT_CLIENT = 'lst_helvea_support_client'
export const LST_HELVEA_FOURNISSEURS = 'lst_helvea_fournisseurs'
export const LST_HELVEA_CLIENTS_AMERIQUE_NORD = 'lst_helvea_clients_amerique_nord'
export const LST_KESTREL_CUSTOMERS = 'lst_kestrel_customers'

function liste(
  id: string,
  organisationId: string,
  regionId: string,
  siteId: string | null,
  nom: string,
  personaId: string,
  destinataires: [string, string][],
): Prisma.ListeDiffusionCreateManyInput {
  return {
    id,
    organisationId,
    regionId,
    siteId,
    nom,
    type: 'STATIQUE',
    definition: {
      destinataires: destinataires.map(([nomDestinataire, courriel]) => ({
        nom: nomDestinataire,
        courriel,
      })),
    },
    exclusions: [],
    personaId,
  }
}

export const LISTES_DIFFUSION: Prisma.ListeDiffusionCreateManyInput[] = [
  liste(
    LST_HELVEA_DIRECTION_GENERALE,
    ORG_HELVEA,
    REG_HELVEA_FRANCE,
    SITE_HELVEA_PARIS,
    'Comité de direction',
    PER_HELVEA_DIRECTION_GENERALE,
    [
      ['Hélène Rocher', 'helene.rocher@helvea.example'],
      ['Antoine Lefèvre', 'antoine.lefevre@helvea.example'],
      ['Isabelle Nguyen', 'isabelle.nguyen@helvea.example'],
    ],
  ),
  liste(
    LST_HELVEA_EQUIPES_TECHNIQUES,
    ORG_HELVEA,
    REG_HELVEA_FRANCE,
    SITE_HELVEA_LYON,
    'Exploitation et développement',
    PER_HELVEA_EQUIPES_TECHNIQUES,
    [
      ['Astreinte exploitation', 'astreinte-exploitation@helvea.example'],
      ['Équipe Atlas', 'equipe-atlas@helvea.example'],
      ['Équipe facturation', 'equipe-facturation@helvea.example'],
    ],
  ),
  liste(
    LST_HELVEA_CLIENTS_GRANDS_COMPTES,
    ORG_HELVEA,
    REG_HELVEA_FRANCE,
    null,
    'Grands comptes — contacts principaux',
    PER_HELVEA_CLIENTS_GRANDS_COMPTES,
    [
      ['Banque Lumière — Direction des achats', 'achats@banque-lumiere.example'],
      ['Groupe Vauban — Direction des opérations', 'operations@groupe-vauban.example'],
      ['Maison Aubrac — Service informatique', 'informatique@maison-aubrac.example'],
    ],
  ),
  liste(
    LST_HELVEA_PARTENAIRES_INTEGRATEURS,
    ORG_HELVEA,
    REG_HELVEA_FRANCE,
    null,
    'Partenaires intégrateurs API Atlas',
    PER_HELVEA_PARTENAIRES_INTEGRATEURS,
    [
      ['Nexalis Conseil', 'integration@nexalis.example'],
      ['Sévigné Systèmes', 'support-api@sevigne-systemes.example'],
    ],
  ),
  liste(
    LST_HELVEA_SUPPORT_CLIENT,
    ORG_HELVEA,
    REG_HELVEA_FRANCE,
    SITE_HELVEA_LYON,
    'Centre de services — niveau 1 et 2',
    PER_HELVEA_SUPPORT_CLIENT,
    [
      ['Support niveau 1', 'support-n1@helvea.example'],
      ['Support niveau 2', 'support-n2@helvea.example'],
    ],
  ),
  liste(
    LST_HELVEA_FOURNISSEURS,
    ORG_HELVEA,
    REG_HELVEA_FRANCE,
    null,
    'Fournisseurs sous contrat cadre',
    PER_HELVEA_FOURNISSEURS,
    [
      ['Datacentre Rhône Services', 'contrats@drs.example'],
      ['Infogérance Meridian', 'compte-helvea@meridian.example'],
    ],
  ),
  liste(
    LST_HELVEA_CLIENTS_AMERIQUE_NORD,
    ORG_HELVEA,
    REG_HELVEA_AMERIQUE_NORD,
    SITE_HELVEA_MONTREAL,
    'North America customers',
    PER_HELVEA_CLIENTS_AMERIQUE_NORD,
    [
      ['Laurentide Retail — IT', 'it@laurentide-retail.example'],
      ['Northbridge Foods — Procurement', 'procurement@northbridge-foods.example'],
    ],
  ),
  liste(
    LST_KESTREL_CUSTOMERS,
    ORG_KESTREL,
    REG_KESTREL_UK,
    SITE_KESTREL_LONDON,
    'API customers',
    PER_KESTREL_CUSTOMERS,
    [
      ['Brightwater Retail — Integrations', 'integrations@brightwater.example'],
      ['Harbourline Freight — IT', 'it@harbourline.example'],
    ],
  ),
]

// ---------------------------------------------------------------------------
// Référentiel d'entités (§12). Alias et codes internes alimentent l'automate
// de reconnaissance ; `personaIds` et `listeIds` portent les suggestions.
// ---------------------------------------------------------------------------

export const ENTITES: Prisma.EntiteCreateManyInput[] = [
  {
    id: 'ent_helvea_atlas',
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    type: 'PRODUIT',
    libelle: 'Portail client Atlas',
    alias: ['Atlas', 'PCA', 'portail Atlas'],
    codeInterne: 'PRD-ATLAS',
    responsableId: USR_MARC_DELAUNAY,
    listeIds: [LST_HELVEA_CLIENTS_GRANDS_COMPTES, LST_HELVEA_SUPPORT_CLIENT],
    personaIds: [PER_HELVEA_CLIENTS_GRANDS_COMPTES, PER_HELVEA_SUPPORT_CLIENT],
    confidentialite: 'PUBLIC',
    actif: true,
  },
  {
    id: 'ent_helvea_hermes',
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    type: 'SYSTEME',
    libelle: 'Passerelle de paiement Hermès',
    alias: ['Hermès', 'passerelle Hermès', 'PSP Hermès'],
    codeInterne: 'SYS-HERMES',
    responsableId: USR_MARC_DELAUNAY,
    listeIds: [LST_HELVEA_PARTENAIRES_INTEGRATEURS],
    personaIds: [PER_HELVEA_PARTENAIRES_INTEGRATEURS],
    confidentialite: 'INTERNE',
    actif: true,
  },
  {
    id: 'ent_helvea_horizon_2026',
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    type: 'PROJET',
    libelle: 'Programme Horizon 2026',
    alias: ['Horizon 2026', 'Horizon'],
    codeInterne: 'PRJ-HORIZON-2026',
    responsableId: USR_SOPHIE_MARCHAND,
    listeIds: [LST_HELVEA_DIRECTION_GENERALE],
    personaIds: [PER_HELVEA_DIRECTION_GENERALE],
    confidentialite: 'INTERNE',
    actif: true,
  },
  {
    id: 'ent_helvea_banque_lumiere',
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    type: 'CLIENT',
    libelle: 'Banque Lumière',
    alias: ['Lumière', 'BL'],
    codeInterne: 'CLI-00042',
    responsableId: USR_CLAIRE_FONTAINE,
    listeIds: [LST_HELVEA_CLIENTS_GRANDS_COMPTES],
    personaIds: [PER_HELVEA_CLIENTS_GRANDS_COMPTES],
    confidentialite: 'INTERNE',
    actif: true,
  },
  {
    id: 'ent_helvea_groupe_vauban',
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    type: 'CLIENT',
    libelle: 'Groupe Vauban',
    alias: ['Vauban'],
    codeInterne: 'CLI-00107',
    responsableId: USR_CLAIRE_FONTAINE,
    listeIds: [LST_HELVEA_CLIENTS_GRANDS_COMPTES],
    personaIds: [PER_HELVEA_CLIENTS_GRANDS_COMPTES],
    confidentialite: 'INTERNE',
    actif: true,
  },
  {
    id: 'ent_helvea_dc_lyon',
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    type: 'SITE',
    libelle: 'Centre de données de Lyon',
    alias: ['DC Lyon', 'datacentre de Lyon', 'LYO'],
    codeInterne: 'SITE-LYO-DC',
    responsableId: USR_MARC_DELAUNAY,
    listeIds: [LST_HELVEA_EQUIPES_TECHNIQUES],
    personaIds: [PER_HELVEA_EQUIPES_TECHNIQUES],
    confidentialite: 'INTERNE',
    actif: true,
  },
  {
    id: 'ent_helvea_iso_27001',
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    type: 'NORME',
    libelle: 'ISO 27001',
    alias: ['ISO/IEC 27001', 'norme 27001'],
    codeInterne: null,
    responsableId: USR_NADIA_BENALI,
    listeIds: [LST_HELVEA_DIRECTION_GENERALE],
    personaIds: [PER_HELVEA_DIRECTION_GENERALE],
    confidentialite: 'PUBLIC',
    actif: true,
  },
  {
    id: 'ent_helvea_fenetre_maintenance',
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    type: 'MOT_CLE',
    libelle: 'fenêtre de maintenance',
    alias: ["fenêtre d'intervention", 'interruption programmée', 'maintenance planifiée'],
    codeInterne: null,
    responsableId: null,
    listeIds: [LST_HELVEA_SUPPORT_CLIENT, LST_HELVEA_EQUIPES_TECHNIQUES],
    personaIds: [PER_HELVEA_SUPPORT_CLIENT, PER_HELVEA_EQUIPES_TECHNIQUES],
    confidentialite: 'PUBLIC',
    actif: true,
  },
  {
    id: 'ent_kestrel_track_trace',
    organisationId: ORG_KESTREL,
    regionId: REG_KESTREL_UK,
    type: 'PRODUIT',
    libelle: 'Kestrel Track & Trace',
    alias: ['Track & Trace', 'Track and Trace', 'T&T'],
    codeInterne: 'PRD-TT',
    responsableId: USR_OLIVIA_HART,
    listeIds: [LST_KESTREL_CUSTOMERS],
    personaIds: [PER_KESTREL_CUSTOMERS],
    confidentialite: 'PUBLIC',
    actif: true,
  },
  {
    id: 'ent_kestrel_wms',
    organisationId: ORG_KESTREL,
    regionId: REG_KESTREL_UK,
    type: 'SYSTEME',
    libelle: 'Warehouse Management System',
    alias: ['WMS', 'WMS connector'],
    codeInterne: 'SYS-WMS',
    responsableId: USR_PRIYA_NAIR,
    listeIds: [],
    personaIds: [],
    confidentialite: 'INTERNE',
    actif: true,
  },
]
