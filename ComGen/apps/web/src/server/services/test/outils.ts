import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { RoleUtilisateur } from '@comgen/core'
import { type Connexion, creerContexte, rechercherUtilisateurPourConnexion } from '@comgen/db'
import { clientDeTest, creerOrganisation, type JeuMinimal } from '@comgen/db/test'

import type { Antivirus, VerdictAntivirus } from '@/server/antivirus'
import { ErreurAntivirus } from '@/server/antivirus'
import { StockageFichiers } from '@/server/stockage'

import type { Acteur } from '../erreurs'
import type { DependancesEntree } from '../sources'

/** Outils partagés des tests de services : acteurs réels, base réelle, dépôt sur disque. */

let compteur = 0

/** Suffixe unique : chaque test crée ses propres organisations, rien n'est partagé. */
export function suffixeUnique(): string {
  compteur += 1
  return `${Date.now().toString(36)}-${process.pid}-${compteur}`
}

export async function acteur(connexion: Connexion, utilisateurId: string): Promise<Acteur> {
  const utilisateur = await rechercherUtilisateurPourConnexion(connexion, { id: utilisateurId })
  if (!utilisateur) throw new Error(`Utilisateur de test ${utilisateurId} introuvable`)
  return {
    utilisateur,
    contexte: creerContexte(connexion, {
      organisationId: utilisateur.organisationId,
      utilisateurId: utilisateur.id,
    }),
  }
}

export interface Organisation extends JeuMinimal {
  redacteur: Acteur
  approbateur: Acteur
}

export async function organisation(connexion: Connexion): Promise<Organisation> {
  const jeu = await creerOrganisation(connexion, suffixeUnique())
  return {
    ...jeu,
    redacteur: await acteur(connexion, jeu.redacteurId),
    approbateur: await acteur(connexion, jeu.approbateurId),
  }
}

/** Un utilisateur supplémentaire de l'organisation, avec les rôles donnés. */
export async function utilisateurAvecRoles(
  connexion: Connexion,
  jeu: JeuMinimal,
  roles: RoleUtilisateur[],
): Promise<Acteur> {
  const cree = await clientDeTest(connexion).utilisateur.create({
    data: {
      organisationId: jeu.organisationId,
      regionId: jeu.regionId,
      courriel: `u-${suffixeUnique()}@exemple.test`,
      nom: `Utilisateur ${roles.join('+')}`,
      roles,
    },
  })
  return acteur(connexion, cree.id)
}

export class AntivirusFactice implements Antivirus {
  readonly mode = 'clamd' as const
  analyses = 0

  constructor(private readonly reponse: VerdictAntivirus | 'INDISPONIBLE' = { verdict: 'SAIN' }) {}

  async analyser(): Promise<VerdictAntivirus> {
    this.analyses += 1
    if (this.reponse === 'INDISPONIBLE') {
      throw new ErreurAntivirus('INDISPONIBLE', 'clamd injoignable (test)')
    }
    return this.reponse
  }
}

export interface DepotTemporaire extends DependancesEntree {
  stockage: StockageFichiers
  racine: string
  nettoyer(): Promise<void>
}

export async function depotTemporaire(
  antivirus: Antivirus = new AntivirusFactice(),
): Promise<DepotTemporaire> {
  const racine = await mkdtemp(path.join(tmpdir(), 'comgen-services-'))
  return {
    racine,
    stockage: new StockageFichiers(racine),
    antivirus,
    nettoyer: () => rm(racine, { recursive: true, force: true }),
  }
}

export const octetsTexte = (texte: string): Uint8Array => new TextEncoder().encode(texte)
