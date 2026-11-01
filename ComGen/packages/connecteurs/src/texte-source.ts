import type { TicketItsm } from './types.ts'

/**
 * Du ticket au texte qui devient la source.
 *
 * Le texte est déterministe : le même ticket donne toujours les mêmes mots,
 * ce qui permet à l'empreinte de la source de reconnaître un ticket déjà
 * importé. Les dates sont écrites comme le domaine sait les relire (« 12
 * octobre 2026 », « October 12, 2026 ») : l'extraction les cite telles
 * quelles.
 *
 * Une information absente n'a pas de ligne — jamais « null », jamais un
 * libellé sans valeur.
 *
 * Ce texte n'est PAS masqué ici : le masquage est une étape à part, appliquée
 * au texte entier avant qu'il ne devienne une source.
 */

export interface OptionsTexteSource {
  /** Langue des libellés et des dates : celle de la communication. */
  langue: 'fr' | 'en'
  avecNotes: boolean
  /** Faux pour que le demandeur n'apparaisse pas du tout. */
  avecDemandeur: boolean
}

const LIBELLES = {
  fr: {
    statut: 'Statut',
    priorite: 'Priorité',
    groupe: 'Groupe',
    demandeur: 'Demandeur',
    ouvert: 'Ouvert le',
    miseAJour: 'Mis à jour le',
    resolu: 'Résolu le',
    description: 'Description',
    notes: 'Notes de travail',
    separateur: ' :',
  },
  en: {
    statut: 'Status',
    priorite: 'Priority',
    groupe: 'Group',
    demandeur: 'Requester',
    ouvert: 'Opened on',
    miseAJour: 'Updated on',
    resolu: 'Resolved on',
    description: 'Description',
    notes: 'Work notes',
    separateur: ':',
  },
} as const

const LOCALES = { fr: 'fr-FR', en: 'en-US' } as const

function formaterDate(date: Date, langue: 'fr' | 'en'): string {
  return new Intl.DateTimeFormat(LOCALES[langue], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function composerTexteSource(ticket: TicketItsm, options: OptionsTexteSource): string {
  const l = LIBELLES[options.langue]
  const date = (d: Date) => formaterDate(d, options.langue)
  const champ = (libelle: string, valeur: string) => `${libelle}${l.separateur} ${valeur}`

  const lignes: string[] = [
    `Ticket ${ticket.numero} — ${ticket.titre}`,
    champ(l.statut, ticket.statut.libelle),
    champ(l.priorite, ticket.priorite.libelle),
  ]
  if (ticket.groupe !== null) lignes.push(champ(l.groupe, ticket.groupe))
  if (options.avecDemandeur && ticket.demandeur !== null) {
    lignes.push(champ(l.demandeur, ticket.demandeur))
  }
  lignes.push(`${l.ouvert} ${date(ticket.ouvertLe)}`, `${l.miseAJour} ${date(ticket.misAJourLe)}`)
  if (ticket.resoluLe !== null) lignes.push(`${l.resolu} ${date(ticket.resoluLe)}`)

  if (ticket.description.trim() !== '') {
    lignes.push('', `${l.description}${l.separateur}`, ticket.description.trim())
  }
  if (options.avecNotes && ticket.notesDeTravail.length > 0) {
    lignes.push('', `${l.notes}${l.separateur}`)
    for (const note of ticket.notesDeTravail) {
      lignes.push(`${date(note.date)}${l.separateur} ${note.texte.trim()}`)
    }
  }
  return lignes.join('\n').trimEnd()
}
