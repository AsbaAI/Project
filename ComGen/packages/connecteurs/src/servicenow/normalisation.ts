import { ErreurItsm } from '../erreurs.ts'
import {
  NIVEAUX_PRIORITE,
  type NiveauPriorite,
  type NoteDeTravail,
  type StatutTicket,
  type TicketResume,
} from '../types.ts'

import { ID_EXTERNE } from './requetes.ts'

/*
 * Des champs de ServiceNow aux types de l'application.
 *
 * Avec `sysparm_display_value=all`, un champ arrive en `{ value,
 * display_value }` ; sans, en chaîne. Les deux sont acceptés. `value` est la
 * donnée (un code, une date UTC), `display_value` le libellé lisible.
 *
 * Une ligne qu'on ne sait pas lire fait échouer toute la lecture : une page
 * « presque complète » ne se présente pas comme complète.
 */

function invalide(raison: string): never {
  throw new ErreurItsm('REPONSE_INVALIDE', `Réponse de l'instance inexploitable : ${raison}`)
}

export function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
}

interface ChampLu {
  valeur: string
  libelle: string
}

function lireChamp(ligne: Record<string, unknown>, nom: string): ChampLu {
  const brut = ligne[nom]
  if (typeof brut === 'string') return { valeur: brut, libelle: brut }
  if (estObjet(brut)) {
    const valeur = typeof brut['value'] === 'string' ? brut['value'] : ''
    const libelle = typeof brut['display_value'] === 'string' ? brut['display_value'] : valeur
    return { valeur, libelle }
  }
  return { valeur: '', libelle: '' }
}

const DATE_UTC = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/u

/** `AAAA-MM-JJ hh:mm:ss` (UTC) en date ; `null` si le champ est vide. */
function lireDate(texte: string, nom: string): Date | null {
  if (texte === '') return null
  const lu = DATE_UTC.exec(texte)
  if (lu === null) return invalide(`date illisible (${nom})`)
  const date = new Date(`${lu[1]}-${lu[2]}-${lu[3]}T${lu[4]}:${lu[5]}:${lu[6]}Z`)
  if (Number.isNaN(date.getTime())) return invalide(`date illisible (${nom})`)
  return date
}

function dateRequise(texte: string, nom: string): Date {
  return lireDate(texte, nom) ?? invalide(`date absente (${nom})`)
}

const STATUT_PAR_CODE: Readonly<Record<string, StatutTicket>> = {
  '1': 'NOUVEAU',
  '2': 'EN_COURS',
  '3': 'EN_ATTENTE',
  '6': 'RESOLU',
  '7': 'CLOS',
  '8': 'ANNULE',
}

function lirePriorite(champ: ChampLu): TicketResume['priorite'] {
  const niveau = Number.parseInt(champ.valeur, 10)
  const connu = NIVEAUX_PRIORITE.find((n) => n === niveau)
  if (connu === undefined || String(connu) !== champ.valeur) invalide('priorité hors échelle')
  return { niveau: connu as NiveauPriorite, libelle: champ.libelle }
}

export function normaliserResume(ligne: unknown): TicketResume {
  if (!estObjet(ligne)) return invalide('ligne de liste')

  const idExterne = lireChamp(ligne, 'sys_id').valeur
  if (!ID_EXTERNE.test(idExterne)) return invalide('identifiant')
  const numero = lireChamp(ligne, 'number').valeur
  if (numero === '') return invalide('numéro absent')
  const etat = lireChamp(ligne, 'state')
  if (etat.valeur === '') return invalide('statut absent')

  return {
    systeme: 'servicenow',
    idExterne,
    numero,
    titre: lireChamp(ligne, 'short_description').valeur,
    // Un état propre à l'instance n'est pas déguisé : « AUTRE », libellé d'origine à côté.
    statut: { code: STATUT_PAR_CODE[etat.valeur] ?? 'AUTRE', libelle: etat.libelle },
    priorite: lirePriorite(lireChamp(ligne, 'priority')),
    demandeur: lireChamp(ligne, 'caller_id').libelle || null,
    groupe: lireChamp(ligne, 'assignment_group').libelle || null,
    ouvertLe: dateRequise(lireChamp(ligne, 'opened_at').valeur, 'opened_at'),
    misAJourLe: dateRequise(lireChamp(ligne, 'sys_updated_on').valeur, 'sys_updated_on'),
  }
}

export function normaliserDetail(ligne: unknown): {
  resume: TicketResume
  description: string
  resoluLe: Date | null
} {
  if (!estObjet(ligne)) return invalide('ligne de ticket')
  return {
    resume: normaliserResume(ligne),
    description: lireChamp(ligne, 'description').valeur,
    resoluLe: lireDate(lireChamp(ligne, 'resolved_at').valeur, 'resolved_at'),
  }
}

export function normaliserNotes(lignes: unknown[]): NoteDeTravail[] {
  const notes: NoteDeTravail[] = []
  for (const ligne of lignes) {
    if (!estObjet(ligne)) return invalide('ligne de journal')
    const texte = lireChamp(ligne, 'value').valeur
    if (texte.trim() === '') continue
    notes.push({
      date: dateRequise(lireChamp(ligne, 'sys_created_on').valeur, 'sys_created_on'),
      texte,
    })
  }
  return notes.toSorted((a, b) => a.date.getTime() - b.date.getTime())
}

/** L'enveloppe d'une liste : `{ result: [...] }`. Une liste vide est valide. */
export function lireListe(corps: unknown): unknown[] {
  if (!estObjet(corps) || !Array.isArray(corps['result'])) return invalide('enveloppe de liste')
  return corps['result']
}

/** L'enveloppe d'un ticket : `{ result: {...} }`. */
export function lireUn(corps: unknown): unknown {
  if (!estObjet(corps) || !estObjet(corps['result'])) return invalide('enveloppe de ticket')
  return corps['result']
}
