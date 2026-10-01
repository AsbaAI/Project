// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { extraireTexte } from './extraire'
import {
  docxMinimal,
  oleMinimal,
  pdfAvecTexte,
  pdfMinimal,
  pngMinimal,
  pptxMinimal,
  utf8AvecBom,
  windows1252,
  xlsxMinimal,
} from './fixtures'
import { ErreurExtraction, TAILLE_MAX_OCTETS } from './types'

async function attendreErreur(promesse: Promise<unknown>): Promise<ErreurExtraction> {
  try {
    await promesse
  } catch (erreur) {
    expect(erreur).toBeInstanceOf(ErreurExtraction)
    return erreur as ErreurExtraction
  }
  throw new Error('Aucune erreur levée')
}

const texte = (s: string) => new TextEncoder().encode(s)

describe('extraireTexte — docx', () => {
  it('joint les paragraphes par une ligne vide, sans blanc final', async () => {
    const resultat = await extraireTexte('doc.docx', await docxMinimal(['A', 'B']))
    expect(resultat).toEqual({ texte: 'A\n\nB', format: 'docx' })
  })

  it('conserve les caractères tels quels (accents, ponctuation)', async () => {
    const resultat = await extraireTexte('doc.docx', await docxMinimal(['Été 2026 : 3 < 4 & 5']))
    expect(resultat.texte).toBe('Été 2026 : 3 < 4 & 5')
  })

  it('un docx sans texte → TEXTE_ABSENT', async () => {
    const erreur = await attendreErreur(extraireTexte('vide.docx', await docxMinimal([])))
    expect(erreur.code).toBe('TEXTE_ABSENT')
    expect(erreur.format).toBe('docx')
  })

  it('un docx corrompu → FICHIER_ILLISIBLE', async () => {
    const sain = await docxMinimal(['A'])
    // Signature zip conservée, reste tronqué : format détecté, contenu illisible.
    const corrompu = sain.slice(0, 40)
    const erreur = await attendreErreur(extraireTexte('corrompu.docx', corrompu))
    expect(['FICHIER_ILLISIBLE', 'FORMAT_INCOHERENT']).toContain(erreur.code)
  })
})

describe('extraireTexte — pdf', () => {
  it('extrait le texte et compte les pages', async () => {
    const resultat = await extraireTexte('note.pdf', pdfAvecTexte('Texte'))
    expect(resultat.format).toBe('pdf')
    expect(resultat.pages).toBe(1)
    expect(resultat.texte.trim()).toBe('Texte')
    expect(resultat.texte).not.toContain('-- 1 of 1 --')
  })

  it('est stable d’une exécution à l’autre', async () => {
    const octets = pdfAvecTexte('Stable')
    const a = await extraireTexte('note.pdf', octets)
    const b = await extraireTexte('note.pdf', octets)
    expect(a).toEqual(b)
  })

  it('une page sans texte → TEXTE_ABSENT, message qui annonce l’OCR', async () => {
    const erreur = await attendreErreur(extraireTexte('scan.pdf', pdfMinimal('')))
    expect(erreur.code).toBe('TEXTE_ABSENT')
    expect(erreur.format).toBe('pdf')
    expect(erreur.message).toMatch(/OCR/)
  })

  it('un PDF corrompu → FICHIER_ILLISIBLE', async () => {
    const erreur = await attendreErreur(
      extraireTexte('casse.pdf', texte('%PDF-1.4\nrien de valide ici')),
    )
    expect(erreur.code).toBe('FICHIER_ILLISIBLE')
    expect(erreur.format).toBe('pdf')
  })
})

describe('extraireTexte — xlsx', () => {
  it('rend chaque feuille sous un titre `## `, cellules jointes par ` ; `, feuilles séparées par une ligne vide', async () => {
    const octets = await xlsxMinimal([
      {
        nom: 'Feuille A',
        lignes: [
          ['Nom', 'Valeur', ''],
          ['x', 42, null],
        ],
      },
      { nom: 'Feuille B', lignes: [['seule']] },
    ])
    const resultat = await extraireTexte('tableau.xlsx', octets)
    expect(resultat.format).toBe('xlsx')
    expect(resultat.pages).toBe(2)
    expect(resultat.texte).toBe('## Feuille A\nNom ; Valeur\nx ; 42\n\n## Feuille B\nseule')
  })

  it('un classeur sans aucune cellule → TEXTE_ABSENT', async () => {
    const erreur = await attendreErreur(
      extraireTexte('vide.xlsx', await xlsxMinimal([{ nom: 'Vide', lignes: [] }])),
    )
    expect(erreur.code).toBe('TEXTE_ABSENT')
  })
})

describe('extraireTexte — texte brut', () => {
  it('txt UTF-8 avec BOM : le BOM disparaît, les accents restent', async () => {
    const resultat = await extraireTexte('lisez-moi.txt', utf8AvecBom('Été\nligne 2'))
    expect(resultat).toEqual({ texte: 'Été\nligne 2', format: 'txt' })
    expect(resultat.texte.charCodeAt(0)).not.toBe(0xfeff)
  })

  it('csv windows-1252 : décodage de repli documenté', async () => {
    const resultat = await extraireTexte('export.csv', windows1252('nom;prénom;prix\nA;Zoé;10 €\n'))
    expect(resultat).toEqual({ texte: 'nom;prénom;prix\nA;Zoé;10 €\n', format: 'csv' })
  })

  it('md : texte tel quel, sans normalisation', async () => {
    const resultat = await extraireTexte('notes.md', texte('# Titre\r\n\r\n  indenté  '))
    expect(resultat.texte).toBe('# Titre\r\n\r\n  indenté  ')
    expect(resultat.format).toBe('md')
  })

  it('un fichier texte vide → TEXTE_ABSENT', async () => {
    expect((await attendreErreur(extraireTexte('vide.txt', texte('  \n')))).code).toBe(
      'TEXTE_ABSENT',
    )
  })
})

describe('extraireTexte — formats reportés au lot 8', () => {
  it('pptx, image, msg, eml → FORMAT_NON_PRIS_EN_CHARGE avec le format nommé', async () => {
    const cas: [string, Uint8Array][] = [
      ['diapos.pptx', await pptxMinimal()],
      ['capture.png', pngMinimal()],
      ['courriel.msg', oleMinimal()],
      ['courriel.eml', texte('From: a@b.c\r\n\r\nCorps')],
    ]
    const erreurs = await Promise.all(
      cas.map(
        async ([nom, octets]) => [nom, await attendreErreur(extraireTexte(nom, octets))] as const,
      ),
    )
    for (const [nom, erreur] of erreurs) {
      expect(erreur.code, nom).toBe('FORMAT_NON_PRIS_EN_CHARGE')
      expect(erreur.format, nom).not.toBeNull()
      expect(erreur.message, nom).toContain(erreur.format ?? '')
      expect(erreur.message, nom).toMatch(/lot 8/)
    }
  })
})

describe('extraireTexte — garde-fous', () => {
  it('au-delà de TAILLE_MAX_OCTETS → FICHIER_TROP_VOLUMINEUX, avant toute lecture', async () => {
    const erreur = await attendreErreur(
      extraireTexte('gros.txt', new Uint8Array(TAILLE_MAX_OCTETS + 1)),
    )
    expect(erreur.code).toBe('FICHIER_TROP_VOLUMINEUX')
  })

  it('propage les erreurs de détection (FORMAT_INCOHERENT, FORMAT_INCONNU)', async () => {
    expect((await attendreErreur(extraireTexte('piege.docx', pdfAvecTexte('x')))).code).toBe(
      'FORMAT_INCOHERENT',
    )
    expect((await attendreErreur(extraireTexte('mystere', texte('x')))).code).toBe('FORMAT_INCONNU')
  })
})
