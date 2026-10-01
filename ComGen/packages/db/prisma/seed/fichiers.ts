/**
 * Fichiers de démonstration à déposer : construits en mémoire depuis les
 * descriptions de sources, versionnés dans `fichiers/` par
 * `generer-fichiers.ts`, et comparés octet à octet par le seed pour détecter
 * un texte modifié sans régénération.
 */

import path from 'node:path'

import type { DescriptionCommunication, DescriptionSource } from './communications.ts'
import { TYPES_MIME, octetsFichier } from './contenus.ts'
import { nettoyerNomFichier } from './stockage.ts'

export const DOSSIER_FICHIERS = path.join(import.meta.dirname, 'fichiers')

export interface FichierDemonstration {
  communicationId: string
  source: DescriptionSource
  /** Nom sous lequel le fichier est versionné dans `fichiers/`. */
  nomSurDisque: string
  typeMime: string
  octets: Uint8Array
}

export async function fichiersDeDemonstration(
  communications: readonly DescriptionCommunication[],
): Promise<FichierDemonstration[]> {
  const fichiers = await Promise.all(
    communications.flatMap((communication) =>
      communication.sources.map(async (source): Promise<FichierDemonstration | null> => {
        const octets = await octetsFichier(source.contenu)
        if (octets === null || source.contenu.format === 'texte') return null
        return {
          communicationId: communication.id,
          source,
          nomSurDisque: nettoyerNomFichier(source.nom),
          typeMime: TYPES_MIME[source.contenu.format],
          octets,
        }
      }),
    ),
  )
  const retenus = fichiers.filter((fichier) => fichier !== null)
  const noms = new Set<string>()
  for (const fichier of retenus) {
    if (noms.has(fichier.nomSurDisque)) {
      throw new Error(`Deux sources produisent le même nom de fichier : ${fichier.nomSurDisque}`)
    }
    noms.add(fichier.nomSurDisque)
  }
  return retenus
}
