/**
 * Stockage sur le système de fichiers local (développement, tests, seed).
 *
 * Convention imposée, partagée avec le seed :
 * - l'objet est écrit à `<racine>/<clé>` ;
 * - son type MIME à `<racine>/<clé>.type`, en texte brut, sans fin de ligne.
 *
 * Chaque écriture passe par un fichier temporaire puis `rename`, donc un
 * lecteur ne voit jamais un fichier à moitié écrit.
 */

import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { ObjetStocke, Stockage } from './stockage'
import { ErreurStockage, verifierCle } from './stockage'

const SUFFIXE_TYPE = '.type'

export class StockageFichiers implements Stockage {
  readonly type = 'fichiers' as const
  private readonly racine: string

  constructor(racine: string) {
    this.racine = racine
  }

  async deposer(cle: string, octets: Uint8Array, typeMime: string): Promise<void> {
    verifierCle(cle)
    const chemin = this.chemin(cle)
    try {
      await mkdir(dirname(chemin), { recursive: true })
      // Le type d'abord : un objet présent a toujours son type.
      await ecrireAtomiquement(chemin + SUFFIXE_TYPE, typeMime)
      await ecrireAtomiquement(chemin, octets)
    } catch (erreur) {
      throw indisponible('écrire', cle, erreur)
    }
  }

  async lire(cle: string): Promise<ObjetStocke | null> {
    verifierCle(cle)
    const chemin = this.chemin(cle)
    let contenu: Buffer
    try {
      contenu = await readFile(chemin)
    } catch (erreur) {
      if (estAbsent(erreur)) return null
      throw indisponible('lire', cle, erreur)
    }
    let typeMime: string
    try {
      typeMime = await readFile(chemin + SUFFIXE_TYPE, 'utf8')
    } catch (erreur) {
      // Objet présent sans son type : dépôt incohérent, on n'invente pas de type.
      throw indisponible('lire le type de', cle, erreur)
    }
    return { octets: new Uint8Array(contenu), typeMime }
  }

  async supprimer(cle: string): Promise<void> {
    verifierCle(cle)
    const chemin = this.chemin(cle)
    try {
      // L'objet d'abord : un type orphelin se lit comme une absence.
      await rm(chemin, { force: true })
      await rm(chemin + SUFFIXE_TYPE, { force: true })
    } catch (erreur) {
      throw indisponible('supprimer', cle, erreur)
    }
  }

  async existe(cle: string): Promise<boolean> {
    verifierCle(cle)
    try {
      await access(this.chemin(cle))
      return true
    } catch (erreur) {
      if (estAbsent(erreur)) return false
      throw indisponible('vérifier', cle, erreur)
    }
  }

  private chemin(cle: string): string {
    return join(this.racine, cle)
  }
}

async function ecrireAtomiquement(chemin: string, contenu: Uint8Array | string): Promise<void> {
  const temporaire = `${chemin}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaire, contenu)
    await rename(temporaire, chemin)
  } catch (erreur) {
    await rm(temporaire, { force: true })
    throw erreur
  }
}

function estAbsent(erreur: unknown): boolean {
  return (
    typeof erreur === 'object' &&
    erreur !== null &&
    (erreur as NodeJS.ErrnoException).code === 'ENOENT'
  )
}

function indisponible(action: string, cle: string, cause: unknown): ErreurStockage {
  return new ErreurStockage('INDISPONIBLE', `Impossible de ${action} l'objet ${cle}`, { cause })
}
