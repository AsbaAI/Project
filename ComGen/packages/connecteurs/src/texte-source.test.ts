import { describe, expect, it } from 'vitest'

import { composerTexteSource } from './texte-source.ts'
import type { TicketItsm } from './types.ts'

const TICKET: TicketItsm = {
  systeme: 'servicenow',
  idExterne: 'a'.repeat(32),
  numero: 'INC0012345',
  titre: 'Portail client indisponible',
  statut: { code: 'RESOLU', libelle: 'Résolu' },
  priorite: { niveau: 2, libelle: '2 - Élevée' },
  demandeur: 'Marie Dupont',
  groupe: 'Support N2',
  ouvertLe: new Date('2026-10-12T08:30:00Z'),
  misAJourLe: new Date('2026-10-13T09:00:00Z'),
  description: 'Le portail ne répond plus.\nLa version 4.2.1 est concernée.',
  resoluLe: new Date('2026-10-12T11:00:00Z'),
  notesDeTravail: [
    { date: new Date('2026-10-12T09:00:00Z'), texte: 'Redémarrage du service.' },
    { date: new Date('2026-10-12T10:30:00Z'), texte: 'Service rétabli.' },
  ],
  lien: 'https://acme.service-now.com/nav_to.do?uri=incident.do%3Fsys_id%3Daaaa',
}

const OPTIONS = { langue: 'fr', avecNotes: false, avecDemandeur: true } as const

describe('composerTexteSource', () => {
  it('ouvre sur le numéro et le titre du ticket', () => {
    const texte = composerTexteSource(TICKET, OPTIONS)
    expect(texte.split('\n')[0]).toBe('Ticket INC0012345 — Portail client indisponible')
  })

  it('écrit les dates comme le domaine sait les relire, en français', () => {
    const texte = composerTexteSource(TICKET, OPTIONS)
    expect(texte).toContain('Ouvert le 12 octobre 2026')
    expect(texte).toContain('Mis à jour le 13 octobre 2026')
    expect(texte).toContain('Résolu le 12 octobre 2026')
  })

  it('écrit les dates à l’anglaise quand la communication est en anglais', () => {
    const texte = composerTexteSource(TICKET, { ...OPTIONS, langue: 'en' })
    expect(texte).toContain('Opened on October 12, 2026')
    expect(texte).toContain('Updated on October 13, 2026')
    expect(texte).toContain('Resolved on October 12, 2026')
    expect(texte).toContain('Status: Résolu')
    expect(texte).toContain('Requester: Marie Dupont')
  })

  it('reprend la description telle quelle, sauts de ligne compris', () => {
    const texte = composerTexteSource(TICKET, OPTIONS)
    expect(texte).toContain(
      'Description :\nLe portail ne répond plus.\nLa version 4.2.1 est concernée.',
    )
  })

  it('porte le statut, la priorité et le groupe avec leur libellé d’origine', () => {
    const texte = composerTexteSource(TICKET, OPTIONS)
    expect(texte).toContain('Statut : Résolu')
    expect(texte).toContain('Priorité : 2 - Élevée')
    expect(texte).toContain('Groupe : Support N2')
  })

  it('omet le demandeur quand on ne le veut pas, et la ligne avec lui', () => {
    const texte = composerTexteSource(TICKET, { ...OPTIONS, avecDemandeur: false })
    expect(texte).not.toContain('Marie Dupont')
    expect(texte).not.toContain('Demandeur')
  })

  it('n’écrit pas « null » : une information absente n’a pas de ligne', () => {
    const texte = composerTexteSource(
      { ...TICKET, groupe: null, demandeur: null, resoluLe: null, description: '' },
      OPTIONS,
    )
    expect(texte).not.toMatch(/null|undefined/u)
    expect(texte).not.toContain('Groupe')
    expect(texte).not.toContain('Demandeur')
    expect(texte).not.toContain('Résolu le')
    expect(texte).not.toContain('Description')
  })

  it('n’ajoute les notes de travail que sur demande', () => {
    expect(composerTexteSource(TICKET, OPTIONS)).not.toContain('Redémarrage du service.')
    const avec = composerTexteSource(TICKET, { ...OPTIONS, avecNotes: true })
    expect(avec).toContain('Notes de travail :')
    expect(avec).toContain('12 octobre 2026 : Redémarrage du service.')
    expect(avec).toContain('12 octobre 2026 : Service rétabli.')
  })

  it('ne parle pas de notes quand on les demande mais qu’il n’y en a pas', () => {
    const texte = composerTexteSource(
      { ...TICKET, notesDeTravail: [] },
      { ...OPTIONS, avecNotes: true },
    )
    expect(texte).not.toContain('Notes de travail')
  })

  it('est déterministe et ne finit pas par un blanc', () => {
    const a = composerTexteSource(TICKET, { ...OPTIONS, avecNotes: true })
    expect(composerTexteSource(TICKET, { ...OPTIONS, avecNotes: true })).toBe(a)
    expect(a).toBe(a.trimEnd())
  })
})
