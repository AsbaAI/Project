// @vitest-environment node
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { StockageFichiers } from './fichiers'
import { creerStockage } from './index'
import { ErreurStockage } from './stockage'

const CLE = 'org-1/sources/src-1/rapport.pdf'
const OCTETS = new Uint8Array([1, 2, 3, 250, 0, 7])

async function attendreErreur(promesse: Promise<unknown>): Promise<ErreurStockage> {
  try {
    await promesse
  } catch (erreur) {
    expect(erreur).toBeInstanceOf(ErreurStockage)
    return erreur as ErreurStockage
  }
  throw new Error('Aucune erreur levée')
}

describe('StockageFichiers', () => {
  let racine: string
  let stockage: StockageFichiers

  beforeEach(async () => {
    racine = await mkdtemp(join(tmpdir(), 'comgen-stockage-'))
    stockage = new StockageFichiers(racine)
  })

  afterEach(async () => {
    await rm(racine, { recursive: true, force: true })
  })

  it('se déclare de type `fichiers`', () => {
    expect(stockage.type).toBe('fichiers')
  })

  it('dépose puis relit octets et type MIME', async () => {
    await stockage.deposer(CLE, OCTETS, 'application/pdf')
    const objet = await stockage.lire(CLE)
    expect(objet).not.toBeNull()
    expect(objet?.typeMime).toBe('application/pdf')
    expect(Array.from(objet?.octets ?? [])).toEqual(Array.from(OCTETS))
  })

  it('respecte la convention <racine>/<clé> et <racine>/<clé>.type (texte brut, sans fin de ligne)', async () => {
    await stockage.deposer(CLE, OCTETS, 'application/pdf')
    expect(Array.from(await readFile(join(racine, CLE)))).toEqual(Array.from(OCTETS))
    expect(await readFile(join(racine, `${CLE}.type`), 'utf8')).toBe('application/pdf')
    // Aucun fichier temporaire résiduel.
    expect((await readdir(join(racine, 'org-1/sources/src-1'))).toSorted()).toEqual([
      'rapport.pdf',
      'rapport.pdf.type',
    ])
  })

  it('remplace un objet existant', async () => {
    await stockage.deposer(CLE, OCTETS, 'application/pdf')
    await stockage.deposer(CLE, new Uint8Array([9]), 'text/plain')
    const objet = await stockage.lire(CLE)
    expect(Array.from(objet?.octets ?? [])).toEqual([9])
    expect(objet?.typeMime).toBe('text/plain')
  })

  it('lit `null` quand la clé est absente', async () => {
    expect(await stockage.lire('org-1/sources/absent')).toBeNull()
    expect(await stockage.existe('org-1/sources/absent')).toBe(false)
  })

  it('supprime, et rester sans effet si la clé est absente', async () => {
    await stockage.deposer(CLE, OCTETS, 'application/pdf')
    expect(await stockage.existe(CLE)).toBe(true)
    await stockage.supprimer(CLE)
    expect(await stockage.lire(CLE)).toBeNull()
    await expect(stat(join(racine, `${CLE}.type`))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(stockage.supprimer(CLE)).resolves.toBeUndefined()
  })

  it('refuse une clé invalide sur chaque opération, sans toucher au disque', async () => {
    const cles = ['../evasion', '/absolu/x', 'seul', 'org/..', 'org/a b']
    const erreurs = await Promise.all(
      cles.flatMap((cle) => [
        attendreErreur(stockage.deposer(cle, OCTETS, 'x/y')),
        attendreErreur(stockage.lire(cle)),
        attendreErreur(stockage.supprimer(cle)),
      ]),
    )
    expect(erreurs.map((e) => e.code)).toEqual(Array<string>(cles.length * 3).fill('CLE_INVALIDE'))
    expect(await readdir(racine)).toEqual([])
  })

  it('creerStockage({ type: "fichiers" }) renvoie cet adaptateur', () => {
    const cree = creerStockage({ type: 'fichiers', racine })
    expect(cree).toBeInstanceOf(StockageFichiers)
    expect(cree.type).toBe('fichiers')
  })
})
