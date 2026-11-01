import { ErreurItsm } from '../erreurs.ts'
import { ID_EXTERNE, requeteListe } from '../servicenow/requetes.ts'
import type {
  ConnecteurItsm,
  FiltresTickets,
  PageDemandee,
  PageTickets,
  ResultatTest,
  TicketItsm,
  TicketResume,
} from '../types.ts'

import { REFERENCE_MOCK, genererTickets } from './donnees.ts'

/**
 * Connecteur de démonstration : mêmes contrat et mêmes refus que le vrai,
 * sur des tickets fictifs. Il permet de montrer tout le parcours sans accès
 * à une instance.
 *
 * Il valide ses entrées par la MÊME fonction que l'adaptateur ServiceNow
 * (`requeteListe`) : un filtre que le vrai connecteur refuserait est refusé
 * ici aussi, si bien que l'écran se comporte pareil dans les deux modes.
 */
export interface DependancesMock {
  /** Horloge de référence ; défaut : une date fixe, pour que la démonstration soit stable. */
  maintenant?: () => number
}

function versResume(ticket: TicketItsm): TicketResume {
  return {
    systeme: ticket.systeme,
    idExterne: ticket.idExterne,
    numero: ticket.numero,
    titre: ticket.titre,
    statut: { ...ticket.statut },
    priorite: { ...ticket.priorite },
    demandeur: ticket.demandeur,
    groupe: ticket.groupe,
    ouvertLe: new Date(ticket.ouvertLe),
    misAJourLe: new Date(ticket.misAJourLe),
  }
}

function correspond(ticket: TicketItsm, filtres: FiltresTickets): boolean {
  const { statuts, priorites, groupe, ouvertApres, ouvertAvant } = filtres
  if (statuts !== undefined && statuts.length > 0) {
    if (!(statuts as readonly string[]).includes(ticket.statut.code)) return false
  }
  if (priorites !== undefined && priorites.length > 0) {
    if (!priorites.includes(ticket.priorite.niveau)) return false
  }
  const nom = groupe?.trim()
  if (nom !== undefined && nom.length > 0) {
    if (ticket.groupe?.toLowerCase() !== nom.toLowerCase()) return false
  }
  if (ouvertApres !== undefined && ticket.ouvertLe < ouvertApres) return false
  if (ouvertAvant !== undefined && ticket.ouvertLe > ouvertAvant) return false
  return true
}

export class ConnecteurMock implements ConnecteurItsm {
  readonly systeme = 'mock' as const
  private readonly tickets: TicketItsm[]

  constructor(dependances: DependancesMock = {}) {
    const reference =
      dependances.maintenant === undefined ? REFERENCE_MOCK : new Date(dependances.maintenant())
    // Du plus récemment mis à jour au plus ancien, comme l'instance réelle.
    this.tickets = genererTickets(reference).toSorted(
      (a, b) => b.misAJourLe.getTime() - a.misAJourLe.getTime() || b.numero.localeCompare(a.numero),
    )
  }

  tester(): Promise<ResultatTest> {
    return Promise.resolve({ ok: true, systeme: 'mock', detail: 'donnees-fictives' })
  }

  lister(filtres: FiltresTickets, page: PageDemandee): Promise<PageTickets> {
    try {
      // Même validation que le vrai connecteur ; on n'en garde que le refus éventuel.
      requeteListe(filtres, page)
    } catch (erreur) {
      return Promise.reject(erreur)
    }
    const retenus = this.tickets.filter((ticket) => correspond(ticket, filtres))
    const debut = (page.page - 1) * page.taille
    return Promise.resolve({
      tickets: retenus.slice(debut, debut + page.taille).map(versResume),
      total: retenus.length,
      page: page.page,
      taille: page.taille,
    })
  }

  lire(idExterne: string, options: { avecNotes?: boolean } = {}): Promise<TicketItsm> {
    if (!ID_EXTERNE.test(idExterne)) {
      return Promise.reject(new ErreurItsm('CONFIG', 'Identifiant de ticket invalide'))
    }
    const ticket = this.tickets.find((candidat) => candidat.idExterne === idExterne)
    if (ticket === undefined) {
      return Promise.reject(new ErreurItsm('INTROUVABLE', 'Ticket introuvable'))
    }
    return Promise.resolve({
      ...versResume(ticket),
      description: ticket.description,
      resoluLe: ticket.resoluLe === null ? null : new Date(ticket.resoluLe),
      notesDeTravail:
        options.avecNotes === true
          ? ticket.notesDeTravail.map((note) => ({ date: new Date(note.date), texte: note.texte }))
          : [],
      lien: ticket.lien,
    })
  }
}
