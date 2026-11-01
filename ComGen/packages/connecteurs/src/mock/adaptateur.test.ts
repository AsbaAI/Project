/* oxlint-disable eslint/no-await-in-loop -- les tickets se lisent l'un après l'autre : le but est de parcourir tout le jeu, pas de le paralléliser. */
import { describe, expect, it } from 'vitest'

import { ErreurItsm } from '../erreurs.ts'
import type { TicketResume } from '../types.ts'

import { ConnecteurMock } from './adaptateur.ts'

const REFERENCE = new Date('2026-10-30T09:00:00Z')
const connecteur = () => new ConnecteurMock({ maintenant: () => REFERENCE.getTime() })

async function tout(c: ConnecteurMock): Promise<TicketResume[]> {
  const page = await c.lister({}, { page: 1, taille: 100 })
  return page.tickets
}

async function echec(promesse: Promise<unknown>): Promise<ErreurItsm> {
  try {
    await promesse
  } catch (erreur) {
    if (erreur instanceof ErreurItsm) return erreur
    throw erreur
  }
  throw new Error('La promesse aurait dû échouer')
}

describe('données de démonstration', () => {
  it('fournit assez de tickets pour paginer et filtrer', async () => {
    expect((await tout(connecteur())).length).toBeGreaterThanOrEqual(30)
  })

  it('donne des numéros et des identifiants uniques, au format de ServiceNow', async () => {
    const tickets = await tout(connecteur())
    expect(new Set(tickets.map((t) => t.numero)).size).toBe(tickets.length)
    expect(new Set(tickets.map((t) => t.idExterne)).size).toBe(tickets.length)
    for (const ticket of tickets) {
      expect(ticket.idExterne).toMatch(/^[0-9a-f]{32}$/u)
      expect(ticket.numero).toMatch(/^INC\d{7}$/u)
      expect(ticket.systeme).toBe('mock')
    }
  })

  it('est déterministe : deux instances rendent les mêmes tickets', async () => {
    expect(await tout(connecteur())).toEqual(await tout(connecteur()))
  })

  it('varie statuts, priorités et groupes, pour que les filtres aient un effet', async () => {
    const tickets = await tout(connecteur())
    expect(new Set(tickets.map((t) => t.statut.code)).size).toBeGreaterThanOrEqual(5)
    expect(new Set(tickets.map((t) => t.priorite.niveau)).size).toBeGreaterThanOrEqual(4)
    expect(new Set(tickets.map((t) => t.groupe)).size).toBeGreaterThanOrEqual(4)
  })

  it('n’ouvre aucun ticket dans le futur, ni ne le met à jour avant son ouverture', async () => {
    for (const ticket of await tout(connecteur())) {
      expect(ticket.ouvertLe.getTime()).toBeLessThanOrEqual(REFERENCE.getTime())
      expect(ticket.misAJourLe.getTime()).toBeGreaterThanOrEqual(ticket.ouvertLe.getTime())
      expect(ticket.misAJourLe.getTime()).toBeLessThanOrEqual(REFERENCE.getTime())
    }
  })

  it('met chaque ticket à portée de l’extraction : une date, une valeur à citer', async () => {
    const c = connecteur()
    for (const resume of await tout(c)) {
      const ticket = await c.lire(resume.idExterne)
      expect(ticket.description).toMatch(/\d{1,2} \p{L}+ 20\d{2}/u)
      expect(ticket.description).toMatch(/\d/u)
    }
  })

  it('porte des courriels et des téléphones fictifs, pour montrer le masquage', async () => {
    const c = connecteur()
    const textes: string[] = []
    for (const resume of await tout(c)) {
      const ticket = await c.lire(resume.idExterne, { avecNotes: true })
      textes.push(ticket.description, ...ticket.notesDeTravail.map((n) => n.texte))
    }
    const texteComplet = textes.join('\n')
    expect(texteComplet).toMatch(/[\w.]+@[\w.]+\.test/u)
    expect(texteComplet).toMatch(/0\d(?:[ .]\d{2}){4}/u)
    // Fictifs : aucune adresse ne prétend appartenir à une vraie organisation.
    // Le motif s'arrête sur une lettre : le point qui clôt la phrase n'en fait pas partie.
    for (const adresse of texteComplet.match(/[\w.]+@\w+(?:\.\w+)+/gu) ?? []) {
      expect(adresse).toMatch(/\.test$/u)
    }
  })
})

describe('lister', () => {
  it('trie du plus récemment mis à jour au plus ancien', async () => {
    const tickets = await tout(connecteur())
    for (let i = 1; i < tickets.length; i++) {
      expect(tickets[i - 1]?.misAJourLe.getTime()).toBeGreaterThanOrEqual(
        tickets[i]?.misAJourLe.getTime() ?? 0,
      )
    }
  })

  it('pagine sans trou ni doublon, et dit le total', async () => {
    const c = connecteur()
    const complet = await tout(c)
    const vus: string[] = []
    for (let page = 1; page <= Math.ceil(complet.length / 10); page++) {
      const lue = await c.lister({}, { page, taille: 10 })
      expect(lue.total).toBe(complet.length)
      expect(lue).toMatchObject({ page, taille: 10 })
      vus.push(...lue.tickets.map((t) => t.numero))
    }
    expect(vus).toEqual(complet.map((t) => t.numero))
  })

  it('rend une page vide, valide, au-delà de la dernière', async () => {
    const page = await connecteur().lister({}, { page: 99, taille: 10 })
    expect(page.tickets).toEqual([])
    expect(page.total).toBeGreaterThan(0)
  })

  it('filtre par statut', async () => {
    const page = await connecteur().lister(
      { statuts: ['RESOLU', 'CLOS'] },
      { page: 1, taille: 100 },
    )
    expect(page.tickets.length).toBeGreaterThan(0)
    for (const t of page.tickets) expect(['RESOLU', 'CLOS']).toContain(t.statut.code)
    expect(page.total).toBe(page.tickets.length)
  })

  it('filtre par priorité', async () => {
    const page = await connecteur().lister({ priorites: [1, 2] }, { page: 1, taille: 100 })
    expect(page.tickets.length).toBeGreaterThan(0)
    for (const t of page.tickets) expect([1, 2]).toContain(t.priorite.niveau)
  })

  it('filtre par groupe, sans tenir compte de la casse', async () => {
    const c = connecteur()
    const groupe = (await tout(c))[0]?.groupe ?? ''
    const page = await c.lister({ groupe: groupe.toUpperCase() }, { page: 1, taille: 100 })
    expect(page.tickets.length).toBeGreaterThan(0)
    for (const t of page.tickets) expect(t.groupe).toBe(groupe)
  })

  it('filtre par date d’ouverture, bornes incluses', async () => {
    const c = connecteur()
    const tickets = await tout(c)
    const milieu = tickets[Math.floor(tickets.length / 2)]?.ouvertLe ?? REFERENCE
    const apres = await c.lister({ ouvertApres: milieu }, { page: 1, taille: 100 })
    const avant = await c.lister({ ouvertAvant: milieu }, { page: 1, taille: 100 })
    for (const t of apres.tickets)
      expect(t.ouvertLe.getTime()).toBeGreaterThanOrEqual(milieu.getTime())
    for (const t of avant.tickets)
      expect(t.ouvertLe.getTime()).toBeLessThanOrEqual(milieu.getTime())
    expect(apres.tickets.length + avant.tickets.length).toBeGreaterThanOrEqual(tickets.length)
  })

  it('combine les filtres', async () => {
    const c = connecteur()
    const seul = await c.lister({ statuts: ['EN_COURS'] }, { page: 1, taille: 100 })
    const combine = await c.lister(
      { statuts: ['EN_COURS'], priorites: [1, 2, 3] },
      { page: 1, taille: 100 },
    )
    expect(combine.tickets.length).toBeLessThanOrEqual(seul.tickets.length)
    for (const t of combine.tickets) {
      expect(t.statut.code).toBe('EN_COURS')
      expect([1, 2, 3]).toContain(t.priorite.niveau)
    }
  })

  it('refuse ce que le vrai connecteur refuse, pour que l’écran se comporte pareil', async () => {
    const c = connecteur()
    expect((await echec(c.lister({ groupe: 'Support^OR' }, { page: 1, taille: 10 }))).code).toBe(
      'CONFIG',
    )
    expect((await echec(c.lister({}, { page: 0, taille: 10 }))).code).toBe('CONFIG')
    expect((await echec(c.lister({}, { page: 1, taille: 101 }))).code).toBe('CONFIG')
  })
})

describe('lire', () => {
  it('lit un ticket en entier, avec son lien', async () => {
    const c = connecteur()
    const resume = (await tout(c))[0]
    const ticket = await c.lire(resume?.idExterne ?? '')
    expect(ticket).toMatchObject({ numero: resume?.numero, systeme: 'mock' })
    expect(ticket.description.length).toBeGreaterThan(40)
    expect(ticket.lien).toContain(resume?.numero)
  })

  it('ne rend les notes de travail que si on les demande', async () => {
    const c = connecteur()
    const id = (await tout(c))[0]?.idExterne ?? ''
    expect((await c.lire(id)).notesDeTravail).toEqual([])
    const avec = await c.lire(id, { avecNotes: true })
    expect(avec.notesDeTravail.length).toBeGreaterThan(0)
    for (let i = 1; i < avec.notesDeTravail.length; i++) {
      expect(avec.notesDeTravail[i - 1]?.date.getTime()).toBeLessThanOrEqual(
        avec.notesDeTravail[i]?.date.getTime() ?? 0,
      )
    }
  })

  it('donne une date de résolution aux tickets résolus ou clos, et à eux seuls', async () => {
    const c = connecteur()
    for (const resume of await tout(c)) {
      const ticket = await c.lire(resume.idExterne)
      const termine = ['RESOLU', 'CLOS'].includes(ticket.statut.code)
      expect(ticket.resoluLe !== null).toBe(termine)
    }
  })

  it('dit introuvable un identifiant bien formé qui n’existe pas', async () => {
    const erreur = await echec(connecteur().lire('f'.repeat(32)))
    expect(erreur.code).toBe('INTROUVABLE')
  })

  it('refuse un identifiant mal formé', async () => {
    expect((await echec(connecteur().lire('../x'))).code).toBe('CONFIG')
  })
})

describe('tester', () => {
  it('réussit toujours, et dit qu’il s’agit de données fictives', async () => {
    expect(await connecteur().tester()).toMatchObject({ ok: true, systeme: 'mock' })
  })
})
