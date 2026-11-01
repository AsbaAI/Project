import { ErreurItsm } from '../erreurs.ts'
import {
  type FiltresTickets,
  NIVEAUX_PRIORITE,
  type PageDemandee,
  STATUTS_FILTRABLES,
  type StatutFiltrable,
  TAILLE_PAGE_MAX,
} from '../types.ts'

/*
 * Construction des requêtes. Tout ce qui vient de l'utilisateur est validé
 * ICI, avant d'être mis dans une requête encodée ServiceNow : le `^` y
 * sépare les conditions, si bien qu'un nom de groupe qui en porterait un
 * pourrait en glisser une autre. On ne compte pas sur un échappement dont
 * la syntaxe est mal documentée : une valeur qui contient autre chose
 * qu'un nom ordinaire est refusée, sans que rien ne parte.
 */

/** Codes d'état des incidents ServiceNow. */
const CODE_ETAT: Readonly<Record<StatutFiltrable, string>> = {
  NOUVEAU: '1',
  EN_COURS: '2',
  EN_ATTENTE: '3',
  RESOLU: '6',
  CLOS: '7',
  ANNULE: '8',
}

/** Lettres, chiffres, espace et ponctuation ordinaire d'un nom de groupe. Ni `^`, ni `=`, ni saut de ligne. */
const NOM_DE_GROUPE = /^[\p{L}\p{N} _.'’()&+/-]{1,80}$/u

/** Un `sys_id` : 32 chiffres hexadécimaux. Rien d'autre ne se met dans un chemin. */
export const ID_EXTERNE = /^[0-9a-f]{32}$/u

export const CHAMPS_LISTE = [
  'sys_id',
  'number',
  'short_description',
  'state',
  'priority',
  'caller_id',
  'assignment_group',
  'opened_at',
  'sys_updated_on',
] as const

export const CHAMPS_LECTURE = [...CHAMPS_LISTE, 'description', 'resolved_at', 'closed_at'] as const

const TABLE = '/api/now/table/incident'
export const CHEMIN_LISTE = TABLE
export const CHEMIN_JOURNAL = '/api/now/table/sys_journal_field'

export function cheminTicket(idExterne: string): string {
  if (!ID_EXTERNE.test(idExterne)) {
    throw new ErreurItsm('CONFIG', 'Identifiant de ticket invalide')
  }
  return `${TABLE}/${idExterne}`
}

function invalide(message: string): never {
  throw new ErreurItsm('CONFIG', message)
}

/** `AAAA-MM-JJ hh:mm:ss`, en UTC : le format des bornes d'une requête encodée. */
function horodatage(date: Date): string {
  if (Number.isNaN(date.getTime())) return invalide('Date de filtre invalide')
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

function conditions(filtres: FiltresTickets): string[] {
  const liste: string[] = []

  if (filtres.statuts !== undefined && filtres.statuts.length > 0) {
    const codes = filtres.statuts.map((statut) => {
      if (!STATUTS_FILTRABLES.includes(statut)) return invalide('Statut de filtre inconnu')
      return CODE_ETAT[statut]
    })
    liste.push(`stateIN${codes.join(',')}`)
  }

  if (filtres.priorites !== undefined && filtres.priorites.length > 0) {
    for (const niveau of filtres.priorites) {
      if (!NIVEAUX_PRIORITE.includes(niveau)) return invalide('Priorité de filtre hors échelle')
    }
    liste.push(`priorityIN${filtres.priorites.join(',')}`)
  }

  if (filtres.groupe !== undefined) {
    const groupe = filtres.groupe.trim()
    if (groupe.length > 0) {
      if (!NOM_DE_GROUPE.test(groupe)) return invalide('Nom de groupe invalide')
      liste.push(`assignment_group.name=${groupe}`)
    }
  }

  if (filtres.ouvertApres !== undefined) liste.push(`opened_at>=${horodatage(filtres.ouvertApres)}`)
  if (filtres.ouvertAvant !== undefined) liste.push(`opened_at<=${horodatage(filtres.ouvertAvant)}`)
  return liste
}

function parametresCommuns(champs: readonly string[]): URLSearchParams {
  return new URLSearchParams({
    sysparm_display_value: 'all',
    sysparm_exclude_reference_link: 'true',
    sysparm_fields: champs.join(','),
  })
}

export function requeteListe(filtres: FiltresTickets, page: PageDemandee): URLSearchParams {
  if (!Number.isInteger(page.page) || page.page < 1) invalide('Numéro de page invalide')
  if (!Number.isInteger(page.taille) || page.taille < 1 || page.taille > TAILLE_PAGE_MAX) {
    invalide('Taille de page invalide')
  }
  const parametres = parametresCommuns(CHAMPS_LISTE)
  parametres.set('sysparm_query', [...conditions(filtres), 'ORDERBYDESCsys_updated_on'].join('^'))
  parametres.set('sysparm_limit', String(page.taille))
  parametres.set('sysparm_offset', String((page.page - 1) * page.taille))
  return parametres
}

export function requeteTicket(): URLSearchParams {
  return parametresCommuns(CHAMPS_LECTURE)
}

/** Les notes de travail d'un ticket, de la plus ancienne à la plus récente. */
export function requeteNotes(idExterne: string): URLSearchParams {
  if (!ID_EXTERNE.test(idExterne)) invalide('Identifiant de ticket invalide')
  return new URLSearchParams({
    sysparm_query: `name=incident^element_id=${idExterne}^element=work_notes^ORDERBYsys_created_on`,
    // L'auteur d'une note est une personne : on ne le demande pas.
    sysparm_fields: 'value,sys_created_on',
    sysparm_display_value: 'false',
    sysparm_limit: '100',
  })
}
