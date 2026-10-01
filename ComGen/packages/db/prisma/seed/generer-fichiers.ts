/* oxlint-disable no-console -- script d'administration : le compte rendu va sur la sortie standard */
/**
 * Régénère les fichiers de démonstration dans `fichiers/` depuis les textes
 * de `textes-sources.ts`. À relancer après toute modification d'un texte :
 *
 *   node --experimental-strip-types prisma/seed/generer-fichiers.ts
 *
 * Le seed compare ces fichiers à ceux qu'il rebâtit et refuse de tourner
 * s'ils divergent.
 */

import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { COMMUNICATIONS } from './communications.ts'
import { DOSSIER_FICHIERS, fichiersDeDemonstration } from './fichiers.ts'

async function principal(): Promise<void> {
  const fichiers = await fichiersDeDemonstration(COMMUNICATIONS)
  await mkdir(DOSSIER_FICHIERS, { recursive: true })

  const attendus = new Set(fichiers.map((fichier) => fichier.nomSurDisque))
  const existants = await readdir(DOSSIER_FICHIERS)
  await Promise.all(
    existants
      .filter((nom) => !attendus.has(nom))
      .map(async (nom) => {
        await rm(path.join(DOSSIER_FICHIERS, nom))
        console.log(`supprimé  ${nom}`)
      }),
  )
  await Promise.all(
    fichiers.map(async (fichier) => {
      await writeFile(path.join(DOSSIER_FICHIERS, fichier.nomSurDisque), fichier.octets)
      console.log(`écrit     ${fichier.nomSurDisque} (${fichier.octets.byteLength} octets)`)
    }),
  )
  console.log(`${fichiers.length} fichier(s) dans ${DOSSIER_FICHIERS}`)
}

principal().catch((erreur: unknown) => {
  console.error(erreur)
  process.exitCode = 1
})
