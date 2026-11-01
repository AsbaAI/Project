import { exigerDroit } from '@/server/auth/droits'

import { type Acteur, introuvable } from './erreurs'

/**
 * En-tête de l'espace de travail, affiché dans la barre latérale :
 * l'organisation de la personne connectée et la résidence des données de
 * sa région. Deux informations réelles, lues en base — la barre n'affiche
 * jamais un libellé décoratif à la place.
 */
export interface EspaceDeTravail {
  organisation: string
  /** Pays où les données de la région sont hébergées (§2). */
  residence: string
}

export async function lireEspaceDeTravail(acteur: Acteur): Promise<EspaceDeTravail> {
  const { contexte, utilisateur } = acteur
  exigerDroit(utilisateur, 'CONSULTER')
  const [organisation, region] = await Promise.all([
    contexte.organisation.findUnique({
      where: { id: utilisateur.organisationId },
      select: { nom: true },
    }),
    contexte.region.findUnique({
      where: { id: utilisateur.regionId },
      select: { residenceDonnees: true },
    }),
  ])
  if (!organisation) throw introuvable('Organisation', utilisateur.organisationId)
  return { organisation: organisation.nom, residence: region?.residenceDonnees ?? '' }
}
