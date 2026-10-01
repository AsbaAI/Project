// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { detecterFormat } from './format'
import {
  docxMinimal,
  oleMinimal,
  pdfAvecTexte,
  pngMinimal,
  pptxMinimal,
  utf8AvecBom,
  windows1252,
  xlsxMinimal,
  zipWordSansContentTypes,
} from './fixtures'
import { ErreurExtraction } from './types'

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

describe('detecterFormat', () => {
  it('reconnaît les formats Office par leur contenu, quelle que soit la casse de l’extension', async () => {
    expect(await detecterFormat('rapport.DOCX', await docxMinimal(['A']))).toBe('docx')
    expect(
      await detecterFormat('tableau.xlsx', await xlsxMinimal([{ nom: 'F', lignes: [] }])),
    ).toBe('xlsx')
    expect(await detecterFormat('diapos.pptx', await pptxMinimal())).toBe('pptx')
  })

  it('identifie un zip Office sans [Content_Types].xml par ses entrées', async () => {
    expect(await detecterFormat('sans-types.docx', await zipWordSansContentTypes())).toBe('docx')
  })

  it('reconnaît un PDF', async () => {
    expect(await detecterFormat('note.pdf', pdfAvecTexte('Texte'))).toBe('pdf')
  })

  it('reconnaît les images comme un seul format `image`', async () => {
    expect(await detecterFormat('capture.png', pngMinimal())).toBe('image')
  })

  it('reconnaît les messages : eml texte, msg OLE', async () => {
    expect(
      await detecterFormat('courriel.eml', texte('From: a@b.c\r\nSubject: x\r\n\r\nCorps')),
    ).toBe('eml')
    expect(await detecterFormat('courriel.msg', oleMinimal())).toBe('msg')
  })

  it('accepte txt, md et csv quand le contenu est du texte (UTF-8 avec BOM, windows-1252)', async () => {
    expect(await detecterFormat('lisez-moi.txt', utf8AvecBom('été'))).toBe('txt')
    expect(await detecterFormat('notes.md', texte('# Titre'))).toBe('md')
    expect(await detecterFormat('export.csv', windows1252('nom;prénom\n'))).toBe('csv')
    expect(await detecterFormat('vide.txt', new Uint8Array(0))).toBe('txt')
  })

  it('rejette un .docx contenant en réalité un PDF : FORMAT_INCOHERENT', async () => {
    const erreur = await attendreErreur(detecterFormat('piege.docx', pdfAvecTexte('x')))
    expect(erreur.code).toBe('FORMAT_INCOHERENT')
    expect(erreur.format).toBe('docx')
  })

  it('rejette un .txt contenant des octets binaires (NUL) : FORMAT_INCOHERENT', async () => {
    const erreur = await attendreErreur(
      detecterFormat('binaire.txt', new Uint8Array([0x41, 0x00, 0x42])),
    )
    expect(erreur.code).toBe('FORMAT_INCOHERENT')
  })

  it('rejette un .pdf dont le contenu est du texte brut : FORMAT_INCOHERENT', async () => {
    const erreur = await attendreErreur(detecterFormat('faux.pdf', texte('pas un pdf')))
    expect(erreur.code).toBe('FORMAT_INCOHERENT')
  })

  it('rejette un .docx qui est un zip sans partie Office : FORMAT_INCOHERENT', async () => {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    zip.file('autre.txt', 'x')
    const erreur = await attendreErreur(
      detecterFormat('archive.docx', await zip.generateAsync({ type: 'uint8array' })),
    )
    expect(erreur.code).toBe('FORMAT_INCOHERENT')
  })

  it('sans extension, se fie à une signature reconnue', async () => {
    expect(await detecterFormat('document', pdfAvecTexte('x'))).toBe('pdf')
    expect(await detecterFormat('document', await docxMinimal(['A']))).toBe('docx')
  })

  it('sans extension ni signature, refuse : FORMAT_INCONNU', async () => {
    expect((await attendreErreur(detecterFormat('sans-extension', texte('bonjour')))).code).toBe(
      'FORMAT_INCONNU',
    )
    expect((await attendreErreur(detecterFormat('archive.rar', texte('bonjour')))).code).toBe(
      'FORMAT_INCONNU',
    )
    // OLE sans extension .msg : conteneur ambigu (doc, xls, msg), on ne devine pas.
    expect((await attendreErreur(detecterFormat('conteneur', oleMinimal()))).code).toBe(
      'FORMAT_INCONNU',
    )
  })

  it('rejette une extension inconnue même avec un contenu identifié : FORMAT_INCOHERENT', async () => {
    const erreur = await attendreErreur(detecterFormat('image.bmp', pngMinimal()))
    expect(erreur.code).toBe('FORMAT_INCOHERENT')
  })
})
