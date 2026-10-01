import { CLIENT_BRUT, ouvrirConnexion, type Connexion } from '../connexion.ts'
import type { PrismaClient } from '../generated/client.ts'

/**
 * Base PostgreSQL des tests d'intégration. Locale par défaut (voir README,
 * « Démarrage ») ; surchargée par `DATABASE_URL_TEST`.
 */
export const URL_BASE_DE_TEST =
  process.env['DATABASE_URL_TEST'] ?? 'postgresql://comgen:comgen_dev@127.0.0.1:5432/comgen_test'

/** Accès nu réservé aux tests : préparer des données et vérifier les effets SQL. */
export function clientDeTest(connexion: Connexion): PrismaClient {
  return connexion[CLIENT_BRUT]
}

export function ouvrirConnexionDeTest(): Connexion {
  return ouvrirConnexion({ url: URL_BASE_DE_TEST, connexionsMax: 4 })
}

/** Vide toutes les tables métier, dans l'ordre des dépendances. */
export async function viderBase(connexion: Connexion): Promise<void> {
  const client = clientDeTest(connexion)
  await client.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Execution", "Envoi", "Approbation", "Mention", "SuggestionAudience",
      "VersionTexte", "Controle", "Affirmation", "Variante",
      "AmendementFait", "Fait", "Source", "Communication",
      "ListeDiffusion", "Entite", "Canevas", "Template", "Persona",
      "Utilisateur", "Site", "Region", "Organisation", "CompteurReference"
    CASCADE
  `)
}

export interface JeuMinimal {
  organisationId: string
  regionId: string
  redacteurId: string
  approbateurId: string
  personaId: string
  templateId: string
}

/** Une organisation complète : région, deux utilisateurs, un persona, un template. */
export async function creerOrganisation(
  connexion: Connexion,
  suffixe: string,
): Promise<JeuMinimal> {
  const client = clientDeTest(connexion)
  const organisation = await client.organisation.create({
    data: {
      nom: `Organisation ${suffixe}`,
      codePays: 'FR',
      fuseauHoraire: 'Europe/Paris',
      localeDefaut: 'fr',
    },
  })
  const region = await client.region.create({
    data: {
      organisationId: organisation.id,
      nom: `Région ${suffixe}`,
      localesAutorisees: ['fr', 'en'],
      residenceDonnees: 'UE',
      modelesAutorises: [],
    },
  })
  const redacteur = await client.utilisateur.create({
    data: {
      organisationId: organisation.id,
      regionId: region.id,
      courriel: `redacteur-${suffixe}@exemple.test`,
      nom: `Rédacteur ${suffixe}`,
      roles: ['REDACTEUR'],
    },
  })
  const approbateur = await client.utilisateur.create({
    data: {
      organisationId: organisation.id,
      regionId: region.id,
      courriel: `approbateur-${suffixe}@exemple.test`,
      nom: `Approbateur ${suffixe}`,
      roles: ['APPROBATEUR'],
    },
  })
  const persona = await client.persona.create({
    data: {
      organisationId: organisation.id,
      regionId: region.id,
      nom: `Persona ${suffixe}`,
      voix: {},
      lexique: {},
      gardeFous: {},
      exemples: [],
      canalDefaut: 'COURRIEL',
      approbateurIds: [approbateur.id],
    },
  })
  const template = await client.template.create({
    data: {
      organisationId: organisation.id,
      regionId: region.id,
      nom: `Template ${suffixe}`,
      format: 'MAIL_HTML',
      corps: '<p>{{corps}}</p>',
      emplacements: [],
    },
  })
  return {
    organisationId: organisation.id,
    regionId: region.id,
    redacteurId: redacteur.id,
    approbateurId: approbateur.id,
    personaId: persona.id,
    templateId: template.id,
  }
}
