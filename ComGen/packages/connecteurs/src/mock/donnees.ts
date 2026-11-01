import type { NiveauPriorite, NoteDeTravail, StatutTicket, TicketItsm } from '../types.ts'

/*
 * Tickets de démonstration : entièrement fictifs, déterministes, écrits
 * pour servir la démonstration.
 *
 * - Chaque description porte des valeurs que l'extraction saura citer : une
 *   date, une version, une durée, un effectif, une référence de changement.
 * - Courriels et téléphones y figurent exprès, pour que le masquage ait
 *   quelque chose à montrer. Les adresses se terminent par `.test` (jamais
 *   résolvable) et les numéros sont ceux que l'ARCEP réserve à la fiction
 *   (06 39 98 xx xx) : aucun ne désigne une vraie personne.
 * - Rien n'est tiré au hasard : tout dérive de l'indice du ticket, comme le
 *   seed de l'application. Deux exécutions donnent les mêmes tickets.
 */

/** Date de référence par défaut : fixe, pour que la démonstration ne glisse pas avec l'horloge. */
export const REFERENCE_MOCK = new Date('2026-10-30T09:00:00Z')

export const NOMBRE_DE_TICKETS_MOCK = 48

const HEURE_MS = 3_600_000
const JOUR_MS = 24 * HEURE_MS

const ETATS: readonly { code: StatutTicket; libelle: string }[] = [
  { code: 'EN_COURS', libelle: 'En cours' },
  { code: 'NOUVEAU', libelle: 'Nouveau' },
  { code: 'EN_ATTENTE', libelle: 'En attente' },
  { code: 'RESOLU', libelle: 'Résolu' },
  { code: 'CLOS', libelle: 'Clos' },
  { code: 'EN_COURS', libelle: 'En cours' },
  { code: 'ANNULE', libelle: 'Annulé' },
]

const PRIORITES: readonly { niveau: NiveauPriorite; libelle: string }[] = [
  { niveau: 2, libelle: '2 - Élevée' },
  { niveau: 3, libelle: '3 - Modérée' },
  { niveau: 1, libelle: '1 - Critique' },
  { niveau: 3, libelle: '3 - Modérée' },
  { niveau: 4, libelle: '4 - Faible' },
  { niveau: 2, libelle: '2 - Élevée' },
  { niveau: 5, libelle: '5 - Planification' },
  { niveau: 3, libelle: '3 - Modérée' },
]

/*
 * Tous les noms sont masculins : les modèles écrivent « du <produit> » et
 * « le <produit> », et une démonstration ne doit pas donner à lire du
 * français fautif.
 */
const PRODUITS = [
  'Portail client Atlas',
  'Connecteur API Meridian',
  'Portail logistique Track & Trace',
  'Tableau de supervision Borealis',
  'Service de facturation Orion',
  'Service de messagerie Lyra',
] as const

const PERSONNES = [
  { prenom: 'Camille', nom: 'Renard', courriel: 'camille.renard@exemple.test' },
  { prenom: 'Julien', nom: 'Marchetti', courriel: 'julien.marchetti@exemple.test' },
  { prenom: 'Inès', nom: 'Valmont', courriel: 'ines.valmont@exemple.test' },
  { prenom: 'Hugo', nom: 'Delorme', courriel: 'hugo.delorme@exemple.test' },
  { prenom: 'Sana', nom: 'Berthier', courriel: 'sana.berthier@exemple.test' },
  { prenom: 'Maxime', nom: 'Aubrac', courriel: 'maxime.aubrac@exemple.test' },
] as const

const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const dateEnLettres = (date: Date): string => FORMAT_DATE.format(date)

const deux = (n: number): string => String(n).padStart(2, '0')

function heure(date: Date): string {
  return `${deux(date.getUTCHours())}h${deux(date.getUTCMinutes())}`
}

/** Numéro de la plage de fiction de l'ARCEP : 06 39 98 xx xx. */
function telephone(indice: number): string {
  const fin = String(10 + ((indice * 7) % 90)).padStart(2, '0')
  const debut = String(10 + ((indice * 13) % 90)).padStart(2, '0')
  return `06 39 98 ${debut} ${fin}`
}

interface Contexte {
  indice: number
  produit: string
  version: string
  /** La date à laquelle l'événement décrit est planifié ou a eu lieu. */
  evenement: Date
  ouvert: Date
  duree: number
  effectif: string
  changement: string
  personne: (typeof PERSONNES)[number]
  matricule: string
  telephone: string
}

interface Modele {
  groupe: string
  titre: (c: Contexte) => string
  description: (c: Contexte) => string
  notes: (c: Contexte) => string[]
}

const MODELES: readonly Modele[] = [
  {
    groupe: 'Applications métier',
    titre: (c) => `Déploiement de la version ${c.version} du ${c.produit}`,
    description: (c) =>
      `La version ${c.version} du ${c.produit} sera déployée le ${dateEnLettres(c.evenement)}. ` +
      `Le service sera interrompu pendant ${String(c.duree)} minutes pour ${c.effectif} utilisateurs. ` +
      `Le changement est suivi sous la référence ${c.changement}. ` +
      `Contact : ${c.personne.courriel}, tél. ${c.telephone}.`,
    notes: (c) => [
      `Fenêtre de maintenance validée par ${c.personne.prenom} ${c.personne.nom} (${c.matricule}).`,
      `Plan de retour arrière testé le ${dateEnLettres(new Date(c.ouvert.getTime() + JOUR_MS))}.`,
    ],
  },
  {
    groupe: 'Exploitation',
    titre: (c) => `Indisponibilité du ${c.produit}`,
    description: (c) =>
      `Le ${c.produit} est indisponible depuis le ${dateEnLettres(c.evenement)} à ${heure(c.evenement)}. ` +
      `${c.effectif} utilisateurs sont concernés. ` +
      `Le rétablissement est estimé dans ${String(c.duree)} minutes. ` +
      `Incident signalé par ${c.personne.courriel}.`,
    notes: (c) => [
      `Appel du demandeur au ${c.telephone}.`,
      `Redémarrage du service effectué à ${heure(new Date(c.evenement.getTime() + HEURE_MS))}.`,
      `Analyse de cause racine confiée à ${c.matricule}.`,
    ],
  },
  {
    groupe: 'Sécurité',
    titre: (c) => `Renouvellement du certificat du ${c.produit}`,
    description: (c) =>
      `Le certificat du ${c.produit} expire le ${dateEnLettres(c.evenement)}. ` +
      `Il doit être renouvelé avant cette date, sans quoi les connexions seront refusées. ` +
      `Référence du changement : ${c.changement}. ` +
      `Responsable : ${c.personne.prenom} ${c.personne.nom}, ${c.personne.courriel}.`,
    notes: (c) => [`Demande de certificat transmise à l'autorité par ${c.matricule}.`],
  },
  {
    groupe: 'Applications métier',
    titre: (c) => `Maintenance de la base de données du ${c.produit}`,
    description: (c) =>
      `La base de données du ${c.produit} passe en version ${c.version} le ${dateEnLettres(c.evenement)}. ` +
      `La maintenance dure ${String(c.duree)} minutes et concerne ${c.effectif} utilisateurs. ` +
      `Le changement est suivi sous la référence ${c.changement}.`,
    notes: (c) => [
      `Sauvegarde complète vérifiée avant l'opération (${c.matricule}).`,
      `Fenêtre confirmée par téléphone au ${c.telephone}.`,
    ],
  },
  {
    groupe: 'Support N2',
    titre: (c) => `Lenteurs sur le ${c.produit}`,
    description: (c) =>
      `Depuis le ${dateEnLettres(c.evenement)}, le temps de réponse du ${c.produit} est passé de 2 à ${String((c.duree % 20) + 6)} secondes. ` +
      `${c.effectif} utilisateurs signalent des ralentissements. ` +
      `Premier signalement par ${c.personne.courriel}.`,
    notes: (c) => [
      `Supervision : saturation observée à ${heure(c.evenement)}, suivie par ${c.matricule}.`,
    ],
  },
  {
    groupe: 'Exploitation',
    titre: (c) => `Échec de la sauvegarde nocturne du ${c.produit}`,
    description: (c) =>
      `La sauvegarde nocturne du ${c.produit} a échoué le ${dateEnLettres(c.evenement)}. ` +
      `La dernière sauvegarde valide date de ${String((c.duree % 5) + 1)} jours. ` +
      `Référence du ticket de suivi : ${c.changement}.`,
    notes: (c) => [
      `Espace disque insuffisant ; extension demandée par ${c.personne.prenom} ${c.personne.nom}.`,
      `Relance manuelle effectuée, ${c.matricule}.`,
    ],
  },
  {
    groupe: 'Conformité',
    titre: (c) => `Mise en conformité du ${c.produit} avant le ${dateEnLettres(c.evenement)}`,
    description: (c) =>
      `Une obligation réglementaire impose la mise en conformité du ${c.produit} avant le ${dateEnLettres(c.evenement)}. ` +
      `La version ${c.version} apporte les correctifs requis. ` +
      `Référence du dossier : ${c.changement}. Responsable : ${c.personne.courriel}.`,
    notes: (c) => [
      `Dossier transmis au service juridique par ${c.matricule}, tél. ${c.telephone}.`,
    ],
  },
  {
    groupe: 'Support N1',
    titre: (c) => `Revue des habilitations du ${c.produit}`,
    description: (c) =>
      `${c.effectif} comptes du ${c.produit} doivent être revus avant le ${dateEnLettres(c.evenement)}. ` +
      `La revue dure environ ${String(c.duree)} minutes par équipe. ` +
      `Référence : ${c.changement}.`,
    notes: (c) => [
      `Liste des comptes extraite par ${c.personne.prenom} ${c.personne.nom} (${c.matricule}).`,
    ],
  },
]

function contexte(indice: number, reference: Date): Contexte {
  const ouvert = new Date(reference.getTime() - ((indice + 1) * 41 + (indice % 5) * 3) * HEURE_MS)
  const personne = PERSONNES[indice % PERSONNES.length] ?? PERSONNES[0]
  const produit = PRODUITS[(indice * 5 + Math.floor(indice / MODELES.length)) % PRODUITS.length]
  return {
    indice,
    produit: produit ?? PRODUITS[0],
    version: `${String(3 + (indice % 4))}.${String(indice % 10)}.${String((indice * 3) % 8)}`,
    evenement: new Date(ouvert.getTime() + (3 + (indice % 10)) * JOUR_MS),
    ouvert,
    duree: 20 + ((indice * 17) % 130),
    effectif: String(150 + ((indice * 487) % 4800)).replace(/\B(?=(\d{3})+(?!\d))/gu, ' '),
    changement: `CHG-2026-${String(1000 + indice * 37).padStart(4, '0')}`,
    personne,
    matricule: `E${String(100_000 + indice * 91)}`,
    telephone: telephone(indice),
  }
}

/** Un identifiant au format `sys_id` de ServiceNow, pour que la même validation vaille partout. */
function identifiant(indice: number): string {
  return (indice + 1).toString(16).padStart(32, '0')
}

export function genererTickets(reference: Date = REFERENCE_MOCK): TicketItsm[] {
  return Array.from({ length: NOMBRE_DE_TICKETS_MOCK }, (_, indice) => {
    const modele = MODELES[indice % MODELES.length] ?? MODELES[0]
    const c = contexte(indice, reference)
    const etat = ETATS[indice % ETATS.length] ?? ETATS[0]
    const priorite = PRIORITES[indice % PRIORITES.length] ?? PRIORITES[0]
    const misAJourLe = new Date(
      Math.min(reference.getTime(), c.ouvert.getTime() + (6 + (indice % 9) * 7) * HEURE_MS),
    )
    const termine = etat?.code === 'RESOLU' || etat?.code === 'CLOS'
    const numero = `INC${String(10_000 + indice).padStart(7, '0')}`

    const notesDeTravail: NoteDeTravail[] = (modele?.notes(c) ?? []).map((texte, rang) => ({
      date: new Date(c.ouvert.getTime() + (rang + 1) * 2 * HEURE_MS),
      texte,
    }))

    return {
      systeme: 'mock',
      idExterne: identifiant(indice),
      numero,
      titre: modele?.titre(c) ?? '',
      statut: { code: etat?.code ?? 'NOUVEAU', libelle: etat?.libelle ?? '' },
      priorite: { niveau: priorite?.niveau ?? 3, libelle: priorite?.libelle ?? '' },
      demandeur: `${c.personne.prenom} ${c.personne.nom}`,
      groupe: modele?.groupe ?? null,
      ouvertLe: c.ouvert,
      misAJourLe,
      description: modele?.description(c) ?? '',
      resoluLe: termine ? misAJourLe : null,
      notesDeTravail,
      lien: `https://itsm-demo.exemple.test/incident/${numero}`,
    }
  })
}
