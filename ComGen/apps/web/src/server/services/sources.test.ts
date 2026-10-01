import { createHash } from 'node:crypto'

import { verifierCitation } from '@comgen/core'
import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AntivirusDesactive } from '@/server/antivirus'
import { docxMinimal } from '@/server/extraction/fixtures'

import { creerCommunication } from './communications'
import { ErreurMetier } from './erreurs'
import { deposerFichiers, saisirTexte } from './sources'
import {
  AntivirusFactice,
  type DepotTemporaire,
  type Organisation,
  depotTemporaire,
  octetsTexte,
  organisation,
} from './test/outils'

let connexion: Connexion
let org: Organisation
let depot: DepotTemporaire

beforeAll(async () => {
  connexion = ouvrirConnexion({ url: URL_BASE_DE_TEST, connexionsMax: 4 })
  org = await organisation(connexion)
  depot = await depotTemporaire()
})

afterAll(async () => {
  await depot.nettoyer()
  await connexion.fermer()
})

async function nouvelleCommunication(): Promise<string> {
  const { id } = await creerCommunication(org.redacteur, {
    titre: 'Changement de version',
    nature: 'CHANGE',
    criticite: 'COURANTE',
    portee: 'INTERNE',
    langue: 'fr',
    modeEntree: 'FICHIER',
  })
  return id
}

const FICHE = [
  'Fiche de changement CHG-2026-0412',
  'Le Portail client Atlas passe de la version 4.1.7 à la version 4.2.0.',
  "L'interruption de service est estimée à 45 minutes.",
]

describe('dépôt de fichiers (§10, mode FICHIER)', () => {
  it('fige chaque fichier en source : texte extrait, empreinte, langue, fichier conservé', async () => {
    const id = await nouvelleCommunication()
    const resultat = await deposerFichiers(
      org.redacteur,
      depot,
      id,
      [
        { nom: 'fiche.docx', octets: await docxMinimal(FICHE) },
        {
          nom: 'notes.txt',
          octets: octetsTexte('Mise en production prévue le 14 octobre 2026.\n'),
        },
      ],
      { confidentialite: 'RESTREINT' },
    )
    expect(resultat.analyseAntivirale).toBe('clamd')
    expect(resultat.fichiers.map((f) => f.statut)).toEqual(['DEPOSE', 'DEPOSE'])

    const sources = await clientDeTest(connexion).source.findMany({
      where: { communicationId: id },
      orderBy: { nom: 'asc' },
    })
    expect(sources).toHaveLength(2)
    const fiche = sources.find((s) => s.nom === 'fiche.docx')
    expect(fiche?.contenuTexte).toBe(FICHE.join('\n\n'))
    expect(fiche?.empreinte).toBe(
      createHash('sha256').update(FICHE.join('\n\n'), 'utf8').digest('hex'),
    )
    expect(fiche?.langue).toBe('fr')
    expect(fiche?.confidentialite).toBe('RESTREINT')
    expect(fiche?.cheminStockage).toMatch(new RegExp(`^${org.organisationId}/sources/`))
    const objet = await depot.stockage.lire(fiche?.cheminStockage ?? '')
    expect(objet?.typeMime).toContain('wordprocessingml')

    const communication = await clientDeTest(connexion).communication.findUniqueOrThrow({
      where: { id },
    })
    expect(communication.etat).toBe('FAITS_A_VALIDER')
  })

  it('propose des faits dont chaque citation est un extrait exact de la source', async () => {
    const id = await nouvelleCommunication()
    await deposerFichiers(
      org.redacteur,
      depot,
      id,
      [{ nom: 'fiche.docx', octets: await docxMinimal(FICHE) }],
      { confidentialite: 'INTERNE' },
    )
    const [source] = await clientDeTest(connexion).source.findMany({
      where: { communicationId: id },
    })
    const faits = await clientDeTest(connexion).fait.findMany({
      where: { communicationId: id },
      orderBy: { reference: 'asc' },
    })
    expect(faits.map((f) => [f.reference, f.valeur, f.typeValeur])).toEqual([
      ['F-01', 'CHG-2026-0412', 'IDENTIFIANT'],
      ['F-02', '4.1.7', 'VERSION'],
      ['F-03', '4.2.0', 'VERSION'],
      ['F-04', '45 minutes', 'NOMBRE'],
    ])
    for (const fait of faits) {
      expect(fait.statut).toBe('PROPOSE')
      expect(fait.confidentialite).toBe('INTERNE')
      expect(fait.citation).toContain(fait.valeur ?? '')
      expect(
        verifierCitation(source?.contenuTexte ?? '', fait.citation, fait.localisation as never),
      ).toEqual({ valide: true })
    }
  })

  it('numérote les faits à la suite quand une seconde source arrive', async () => {
    const id = await nouvelleCommunication()
    await saisirTexte(org.redacteur, id, {
      titre: 'Première',
      texte: 'Version 2.0 livrée.',
      confidentialite: 'INTERNE',
    })
    await deposerFichiers(
      org.redacteur,
      depot,
      id,
      [{ nom: 'b.txt', octets: octetsTexte('Version 3.1 prévue le 2026-11-02.') }],
      { confidentialite: 'INTERNE' },
    )
    const faits = await clientDeTest(connexion).fait.findMany({
      where: { communicationId: id },
      orderBy: { reference: 'asc' },
    })
    expect(faits.map((f) => f.reference)).toEqual(['F-01', 'F-02', 'F-03'])
  })

  it('refuse un fichier infecté : rien en base, rien dans le dépôt', async () => {
    const id = await nouvelleCommunication()
    const infecte = await depotTemporaire(
      new AntivirusFactice({ verdict: 'INFECTE', signature: 'Eicar-Test-Signature' }),
    )
    try {
      const resultat = await deposerFichiers(
        org.redacteur,
        infecte,
        id,
        [{ nom: 'eicar.txt', octets: octetsTexte('X5O!P%@AP') }],
        { confidentialite: 'INTERNE' },
      )
      expect(resultat.fichiers).toEqual([
        { nom: 'eicar.txt', statut: 'REFUSE', motif: 'INFECTE', detail: 'Eicar-Test-Signature' },
      ])
      expect(await clientDeTest(connexion).source.count({ where: { communicationId: id } })).toBe(0)
      const { readdir } = await import('node:fs/promises')
      expect(await readdir(infecte.racine)).toEqual([])
    } finally {
      await infecte.nettoyer()
    }
  })

  it("refuse quand l'antivirus est injoignable : pas de repli silencieux", async () => {
    const id = await nouvelleCommunication()
    const injoignable = await depotTemporaire(new AntivirusFactice('INDISPONIBLE'))
    try {
      const resultat = await deposerFichiers(
        org.redacteur,
        injoignable,
        id,
        [{ nom: 'a.txt', octets: octetsTexte('Version 1.2 livrée.') }],
        { confidentialite: 'INTERNE' },
      )
      expect(resultat.fichiers[0]).toMatchObject({
        statut: 'REFUSE',
        motif: 'ANTIVIRUS_INDISPONIBLE',
      })
    } finally {
      await injoignable.nettoyer()
    }
  })

  it('dit quand aucune analyse antivirale n’a été faite', async () => {
    const id = await nouvelleCommunication()
    const sansAnalyse = await depotTemporaire(new AntivirusDesactive())
    try {
      const resultat = await deposerFichiers(
        org.redacteur,
        sansAnalyse,
        id,
        [{ nom: 'a.txt', octets: octetsTexte('Version 1.3 livrée.') }],
        { confidentialite: 'INTERNE' },
      )
      expect(resultat.analyseAntivirale).toBe('aucun')
    } finally {
      await sansAnalyse.nettoyer()
    }
  })

  it('refuse un fichier dont le contenu contredit l’extension, et garde les autres', async () => {
    const id = await nouvelleCommunication()
    const resultat = await deposerFichiers(
      org.redacteur,
      depot,
      id,
      [
        { nom: 'faux.pdf', octets: octetsTexte('Ceci est du texte, pas un PDF.') },
        { nom: 'vrai.txt', octets: octetsTexte('Version 5.0 livrée.') },
      ],
      { confidentialite: 'INTERNE' },
    )
    expect(resultat.fichiers.map((f) => [f.nom, f.statut])).toEqual([
      ['faux.pdf', 'REFUSE'],
      ['vrai.txt', 'DEPOSE'],
    ])
    expect(resultat.fichiers[0]).toMatchObject({ motif: 'FORMAT_INCOHERENT' })
  })

  it('refuse une source déjà présente (même texte, même empreinte)', async () => {
    const id = await nouvelleCommunication()
    const fichier = { nom: 'a.txt', octets: octetsTexte('Version 6.0 livrée.') }
    await deposerFichiers(org.redacteur, depot, id, [fichier], { confidentialite: 'INTERNE' })
    const second = await deposerFichiers(
      org.redacteur,
      depot,
      id,
      [{ ...fichier, nom: 'copie.txt' }],
      { confidentialite: 'INTERNE' },
    )
    expect(second.fichiers[0]).toMatchObject({ statut: 'REFUSE', motif: 'EN_DOUBLE' })
  })

  it('n’accepte plus de source une fois la fiche figée', async () => {
    const id = await nouvelleCommunication()
    await clientDeTest(connexion).communication.update({
      where: { id },
      data: { etat: 'EN_GENERATION' },
    })
    try {
      await deposerFichiers(
        org.redacteur,
        depot,
        id,
        [{ nom: 'a.txt', octets: octetsTexte('Version 7.0 livrée.') }],
        { confidentialite: 'INTERNE' },
      )
      expect.unreachable()
    } catch (erreur) {
      expect(erreur).toBeInstanceOf(ErreurMetier)
      expect((erreur as ErreurMetier).code).toBe('ETAT_INCOMPATIBLE')
    }
  })
})

describe('texte saisi (§10, mode TEXTE_SAISI)', () => {
  it('le texte devient une source avec empreinte, sans fichier', async () => {
    const id = await nouvelleCommunication()
    const texte =
      'Incident INC-2026-0187 : le service de facturation a été rétabli à 15h10 par les équipes.\r\n'
    const resultat = await saisirTexte(org.redacteur, id, {
      titre: 'Déclaration de l’astreinte',
      texte,
      confidentialite: 'INTERNE',
    })
    expect(resultat.langue).toBe('fr')
    expect(resultat.faitsProposes).toBe(2)
    const source = await clientDeTest(connexion).source.findUniqueOrThrow({
      where: { id: resultat.sourceId },
    })
    expect(source).toMatchObject({
      type: 'TEXTE_SAISI',
      nom: 'Déclaration de l’astreinte',
      cheminStockage: null,
      contenuTexte:
        'Incident INC-2026-0187 : le service de facturation a été rétabli à 15h10 par les équipes.',
    })
  })

  it('refuse un texte vide ou sans intitulé', async () => {
    const id = await nouvelleCommunication()
    try {
      await saisirTexte(org.redacteur, id, {
        titre: ' ',
        texte: ' \n ',
        confidentialite: 'INTERNE',
      })
      expect.unreachable()
    } catch (erreur) {
      expect((erreur as ErreurMetier).details.champs).toEqual({ titre: 'requis', texte: 'requis' })
    }
  })
})
