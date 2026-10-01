/**
 * Dépôt local de fichiers sources, tel que l'application web le lit.
 *
 * Convention partagée (voir `apps/web/src/server/stockage`) :
 * - racine = `STOCKAGE_RACINE`, sinon `<racine du dépôt>/.local/stockage` ;
 * - clé = `<organisationId>/sources/<sourceId>/<nomFichier>` où le nom est
 *   nettoyé (NFKD, accents retirés, tout caractère hors `[A-Za-z0-9._-]`
 *   remplacé par `-`) ;
 * - le fichier est écrit à `<racine>/<clé>`, son type MIME dans
 *   `<racine>/<clé>.type` (texte brut, sans fin de ligne).
 *
 * `Source.cheminStockage` reçoit la clé, jamais un chemin absolu.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const RACINE_DEPOT = path.resolve(import.meta.dirname, '../../../..')

export function racineStockage(): string {
  return process.env['STOCKAGE_RACINE'] ?? path.join(RACINE_DEPOT, '.local', 'stockage')
}

const SEGMENT_VALIDE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

/** Nom de fichier sûr : ASCII, sans espace ni accent, jamais vide. */
export function nettoyerNomFichier(nomFichier: string): string {
  const nom = nomFichier
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+/, '')
    .slice(0, 120)
  return nom.length > 0 ? nom : 'fichier'
}

/** Clé d'un fichier source : `<organisationId>/sources/<sourceId>/<nomFichier>`. */
export function cleSource(organisationId: string, sourceId: string, nomFichier: string): string {
  const cle = `${organisationId}/sources/${sourceId}/${nettoyerNomFichier(nomFichier)}`
  const segments = cle.split('/')
  if (!segments.every((segment) => SEGMENT_VALIDE.test(segment))) {
    throw new Error(`Clé de stockage invalide : ${cle}`)
  }
  return cle
}

/** Supprime tout ce que le dépôt contient pour une organisation (rejeu du seed). */
export async function viderStockageOrganisation(organisationId: string): Promise<void> {
  if (!SEGMENT_VALIDE.test(organisationId)) {
    throw new Error(`Identifiant d'organisation invalide : ${organisationId}`)
  }
  await rm(path.join(racineStockage(), organisationId), { recursive: true, force: true })
}

/** Écrit le fichier et son type MIME ; renvoie la clé à consigner dans `Source.cheminStockage`. */
export async function deposerFichierSource(
  organisationId: string,
  sourceId: string,
  nomFichier: string,
  octets: Uint8Array,
  typeMime: string,
): Promise<string> {
  const cle = cleSource(organisationId, sourceId, nomFichier)
  const chemin = path.join(racineStockage(), ...cle.split('/'))
  await mkdir(path.dirname(chemin), { recursive: true })
  await writeFile(chemin, octets)
  await writeFile(`${chemin}.type`, typeMime, 'utf8')
  return cle
}
