/**
 * Historique de démonstration : six mois de communications.
 *
 * Les six communications écrites à la main (`communications.ts`) montrent
 * chacune un cas précis de la spécification. Celles-ci montrent autre chose :
 * la masse. Sans elles, l'historique tient sur un écran, les analyses n'ont
 * rien à compter et une démonstration ne ressemble à rien de vécu.
 *
 * Elles sont ENGENDRÉES, pas recopiées, et deux règles les gouvernent :
 *
 *  - **Tout dérive du texte de la source.** Le texte est composé d'abord ;
 *    les faits en sont ensuite relevés par `proposerFaitsCandidats`, la même
 *    fonction pure que l'application. Une citation ne peut donc pas diverger
 *    de sa source : elle en est extraite. Le seed revérifie quand même.
 *  - **Une communication dit la vérité sur elle-même.** Une communication
 *    marquée ENVOYEE porte sa variante, ses affirmations appuyées sur des
 *    faits, son approbation et son envoi. Marquer `ENVOYEE` une ligne sans
 *    envoi mettrait un mensonge en base, et le tableau de bord le compterait.
 *
 * Rien n'est tiré au hasard : tout dérive de l'indice. Deux exécutions du
 * seed produisent le même historique, et une capture d'écran reste valable.
 */

import {
  type Criticite,
  type EtatCommunication,
  type EtatVariante,
  type Nature,
  compterMots,
  localiserCitation,
  normaliserTexteSource,
  proposerFaitsCandidats,
} from '@comgen/core'

import type {
  DescriptionAffirmation,
  DescriptionCommunication,
  DescriptionFait,
  DescriptionVariante,
} from './communications.ts'
import {
  ORG_HELVEA,
  ORG_KESTREL,
  PERSONAS,
  REG_HELVEA_FRANCE,
  REG_KESTREL_UK,
  TEMPLATES,
  USR_CLAIRE_FONTAINE,
  USR_JAMES_WHITAKER,
  USR_LEA_MOREAU,
  USR_OLIVIA_HART,
  USR_PAUL_GIRARD,
  USR_SOPHIE_MARCHAND,
} from './donnees.ts'

/** Fin de la fenêtre : la veille des communications écrites à la main. */
const FIN = Date.UTC(2026, 8, 20, 17, 0, 0)
const JOUR_MS = 24 * 60 * 60 * 1000
/** Six mois, comptés en jours pour rester lisible. */
const ETENDUE_JOURS = 183
export const NOMBRE_HISTORIQUE = 150
/** Les six communications écrites à la main occupent déjà 1 à 6. */
export const PREMIER_NUMERO_HISTORIQUE = 7

/** Mois en toutes lettres : la source écrit les dates comme un humain. */
const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const

function dateEnLettres(date: Date): string {
  const jour = date.getUTCDate()
  const mois = MOIS[date.getUTCMonth()] ?? 'janvier'
  return `${jour === 1 ? '1er' : String(jour)} ${mois} ${date.getUTCFullYear()}`
}

/** Groupes de milliers à la française : la source écrit « 4 500 », pas « 4500 ». */
function nombreEnLettres(valeur: number): string {
  return valeur.toLocaleString('fr-FR').replace(/ /gu, ' ')
}

interface Modele {
  nature: Nature
  criticite: Criticite
  /** Titre, sans les valeurs : elles sont injectées par le gabarit de texte. */
  sujet: (contexte: Contexte) => string
  lignes: (contexte: Contexte) => readonly string[]
}

interface Contexte {
  produit: string
  /** « de Portail client Atlas » ou « d'Annuaire interne Vega », élision faite. */
  duProduit: string
  version: string
  identifiant: string
  effectif: number
  dateEffet: Date
  dureeMinutes: number
  audience: string
}

const PRODUITS = [
  'Portail client Atlas',
  'Plateforme Track & Trace',
  'Service de facturation Orion',
  'Annuaire interne Vega',
  'Passerelle API Meridian',
  'Entrepôt de données Lyra',
] as const

/**
 * Le préfixe du ticket suit la NATURE, pas l'indice : « Incident
 * CHG-2026-1973 » était une référence qui contredisait son propre titre.
 */
const PREFIXE_PAR_NATURE: Readonly<Record<Nature, string>> = {
  INCIDENT: 'INC',
  CHANGE: 'CHG',
  RELEASE: 'REL',
  REGULATORY: 'REG',
  ORG: 'ORG',
  SPEC_UPDATE: 'DOC',
}
const AUDIENCES = [
  'les équipes support',
  'les clients grands comptes',
  'les équipes techniques',
  'les partenaires intégrateurs',
  'la direction générale',
  'les fournisseurs référencés',
] as const

/*
 * Six familles de communications, une par nature. Chaque gabarit écrit au
 * moins une date, un nombre et une version ou un identifiant : ce sont ces
 * valeurs-là que l'extracteur relèvera, et elles ne seront jamais réécrites
 * ailleurs qu'ici.
 */
const MODELES: readonly Modele[] = [
  {
    nature: 'CHANGE',
    criticite: 'IMPORTANTE',
    sujet: (c) => `Migration ${c.duProduit} vers la version ${c.version}`,
    lignes: (c) => [
      `Objet : migration ${c.duProduit} vers la version ${c.version}`,
      '',
      `La migration ${c.duProduit} vers la version ${c.version} est planifiée le ${dateEnLettres(c.dateEffet)}.`,
      `L'interruption de service durera ${nombreEnLettres(c.dureeMinutes)} minutes et concerne ${nombreEnLettres(c.effectif)} utilisateurs.`,
      `Le changement est suivi sous la référence ${c.identifiant}.`,
      `Le dispositif d'accompagnement est ouvert à ${c.audience}.`,
    ],
  },
  {
    nature: 'INCIDENT',
    criticite: 'CRITIQUE',
    sujet: (c) => `Incident ${c.identifiant} : indisponibilité ${c.duProduit}`,
    lignes: (c) => [
      `Objet : incident ${c.identifiant} sur ${c.produit}`,
      '',
      `Un incident critique a rendu ${c.produit} indisponible le ${dateEnLettres(c.dateEffet)}.`,
      `L'interruption a duré ${nombreEnLettres(c.dureeMinutes)} minutes et a touché ${nombreEnLettres(c.effectif)} utilisateurs.`,
      `L'incident est enregistré sous la référence ${c.identifiant}.`,
      `Le service a été rétabli sans perte de données ; ${c.audience} ont été informées.`,
    ],
  },
  {
    nature: 'RELEASE',
    criticite: 'COURANTE',
    sujet: (c) => `Livraison ${c.duProduit} en version ${c.version}`,
    lignes: (c) => [
      `Objet : livraison ${c.duProduit} en version ${c.version}`,
      '',
      `La version ${c.version} ${c.duProduit} est mise en production le ${dateEnLettres(c.dateEffet)}.`,
      `Elle corrige ${nombreEnLettres(c.effectif)} anomalies relevées en recette.`,
      `La livraison est suivie sous la référence ${c.identifiant}.`,
      `La note de version est transmise à ${c.audience}.`,
    ],
  },
  {
    nature: 'REGULATORY',
    criticite: 'IMPORTANTE',
    sujet: (c) => `Évolution réglementaire applicable à ${c.produit}`,
    lignes: (c) => [
      `Objet : évolution réglementaire applicable à ${c.produit}`,
      '',
      `Une obligation légale nouvelle s'applique à ${c.produit} à compter du ${dateEnLettres(c.dateEffet)}.`,
      `La durée de conservation des journaux passe à ${nombreEnLettres(c.effectif)} jours.`,
      `Le dossier de conformité porte la référence ${c.identifiant}.`,
      `Le texte a été relu avec ${c.audience}.`,
    ],
  },
  {
    nature: 'ORG',
    criticite: 'COURANTE',
    sujet: (c) => `Évolution d'organisation autour ${c.duProduit}`,
    lignes: (c) => [
      `Objet : évolution d'organisation autour ${c.duProduit}`,
      '',
      `L'équipe en charge ${c.duProduit} évolue au ${dateEnLettres(c.dateEffet)}.`,
      `Elle regroupe désormais ${nombreEnLettres(c.effectif)} personnes.`,
      `La note d'organisation porte la référence ${c.identifiant}.`,
      `Le point de contact unique est communiqué à ${c.audience}.`,
    ],
  },
  {
    nature: 'SPEC_UPDATE',
    criticite: 'COURANTE',
    sujet: (c) => `Mise à jour de la documentation ${c.duProduit}`,
    lignes: (c) => [
      `Objet : mise à jour de la documentation ${c.duProduit}`,
      '',
      `La documentation ${c.duProduit} passe en version ${c.version} le ${dateEnLettres(c.dateEffet)}.`,
      `Elle couvre ${nombreEnLettres(c.effectif)} procédures révisées.`,
      `La révision porte la référence ${c.identifiant}.`,
      `Les changements sont signalés à ${c.audience}.`,
    ],
  },
]

/*
 * Répartition des états : une démonstration crédible est surtout faite de
 * choses finies, avec ce qu'il faut d'en-cours pour que les onglets
 * Approbations et Générateur ne soient pas vides.
 */
const ETATS: readonly { etat: EtatCommunication; poids: number }[] = [
  { etat: 'ENVOYEE', poids: 62 },
  { etat: 'ARCHIVEE', poids: 12 },
  { etat: 'APPROUVEE', poids: 6 },
  { etat: 'EN_APPROBATION', poids: 8 },
  { etat: 'EN_CONTROLE', poids: 4 },
  { etat: 'FAITS_A_VALIDER', poids: 5 },
  { etat: 'BROUILLON', poids: 3 },
]

const TOTAL_POIDS = ETATS.reduce((somme, entree) => somme + entree.poids, 0)

function etatPour(indice: number): EtatCommunication {
  // Suite déterministe bien répartie : le pas est premier avec 100.
  let reste = ((indice * 37) % TOTAL_POIDS) + 1
  for (const entree of ETATS) {
    reste -= entree.poids
    if (reste <= 0) return entree.etat
  }
  return 'ENVOYEE'
}

const ETAT_VARIANTE: Readonly<Partial<Record<EtatCommunication, EtatVariante>>> = {
  ENVOYEE: 'ENVOYEE',
  ARCHIVEE: 'ENVOYEE',
  APPROUVEE: 'APPROUVEE',
  EN_APPROBATION: 'CONFORME',
  EN_CONTROLE: 'A_REVOIR',
}

interface Appartenance {
  organisationId: string
  regionId: string
  auteurId: string
  approbateurId: string
  langue: 'fr' | 'en'
}

/** Deux organisations sur trois pour Helvea : c'est elle qu'on démontre. */
function appartenance(indice: number): Appartenance {
  if (indice % 3 === 2) {
    return {
      organisationId: ORG_KESTREL,
      regionId: REG_KESTREL_UK,
      auteurId: USR_OLIVIA_HART,
      approbateurId: USR_JAMES_WHITAKER,
      langue: 'en',
    }
  }
  const auteurs = [USR_CLAIRE_FONTAINE, USR_LEA_MOREAU, USR_PAUL_GIRARD] as const
  return {
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    auteurId: auteurs[indice % auteurs.length] ?? USR_CLAIRE_FONTAINE,
    approbateurId: USR_SOPHIE_MARCHAND,
    langue: 'fr',
  }
}

/*
 * Produit et audience doivent tourner INDÉPENDAMMENT du modèle, sinon
 * chaque nature reste collée au même produit pour toujours : six mois
 * d'historique où toute migration concerne Atlas et toute note
 * d'organisation la passerelle Meridian. Comme le modèle avance de 1 par
 * indice, toute combinaison linéaire de l'indice resterait verrouillée sur
 * lui ; le rang du tour (`indice / 6`) ne l'est pas.
 */
/** Élision devant voyelle ou h muet : « de Atlas » ne s'écrit pas. */
function elider(nom: string): string {
  return /^[aeiouyàâéèêëîïôöûüh]/iu.test(nom) ? `d’${nom}` : `de ${nom}`
}

function decale(indice: number, longueur: number, depart: number): number {
  const tour = Math.floor(indice / MODELES.length)
  return (indice + tour + depart) % longueur
}

function contextePour(indice: number, modele: Modele, dateEffet: Date): Contexte {
  const produit = PRODUITS[decale(indice, PRODUITS.length, 0)] ?? PRODUITS[0]
  const prefixe = PREFIXE_PAR_NATURE[modele.nature]
  return {
    produit,
    duProduit: elider(produit),
    version: `${2 + (indice % 5)}.${indice % 10}`,
    identifiant: `${prefixe}-2026-${String(1000 + indice * 7).padStart(4, '0')}`,
    effectif: 120 + ((indice * 83) % 9000),
    dateEffet,
    dureeMinutes: 15 + ((indice * 13) % 180),
    audience: AUDIENCES[decale(indice, AUDIENCES.length, 3)] ?? AUDIENCES[0],
  }
}

/**
 * Faits relevés du texte par la fonction du domaine, puis dédoublonnés sur
 * (valeur, citation) : une même phrase citée deux fois pour la même valeur
 * n'apprend rien au relecteur.
 */
function faitsDuTexte(sourceId: string, contenuTexte: string): DescriptionFait[] {
  const vus = new Set<string>()
  const faits: DescriptionFait[] = []
  for (const candidat of proposerFaitsCandidats(contenuTexte)) {
    const cle = `${candidat.valeur}\u0000${candidat.citation}`
    if (vus.has(cle)) continue
    vus.add(cle)
    faits.push({
      sourceId,
      enonce: candidat.enonce,
      valeur: candidat.valeur,
      typeValeur: candidat.typeValeur,
      citation: candidat.citation,
      confiance: candidat.confiance,
      confidentialite: 'INTERNE',
      statut: 'CONFIRME',
    })
  }
  return faits
}

/** Document TipTap minimal : un paragraphe par phrase retenue. */
function documentDe(paragraphes: readonly string[]): Record<string, unknown> {
  return {
    type: 'doc',
    content: paragraphes.map((texte) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: texte }],
    })),
  }
}

/**
 * La variante reprend les phrases de la source MOT POUR MOT, encadrées
 * d'une salutation et d'une formule de clôture.
 *
 * C'est délibérément plus pauvre qu'une vraie rédaction : une variante de
 * démonstration n'a pas le droit d'affirmer ce que la source ne dit pas, et
 * aucun modèle ne tourne ici pour reformuler sans trahir. Les phrases
 * reprises sont donc appuyées (`SOUTENUE`) par construction ; la salutation
 * et la clôture n'affirment rien (`NON_FACTUELLE`).
 */
function varianteDe(
  indice: number,
  appartient: Appartenance,
  etat: EtatCommunication,
  phrasesSource: readonly string[],
  faits: readonly DescriptionFait[],
  dates: { creeLe: Date; decideLe: Date; envoyeLe: Date },
): DescriptionVariante | undefined {
  const etatVariante = ETAT_VARIANTE[etat]
  if (etatVariante === undefined) return undefined

  const personas = PERSONAS.filter(
    (persona) => persona.organisationId === appartient.organisationId,
  )
  const persona = personas[indice % Math.max(personas.length, 1)]
  const gabarits = TEMPLATES.filter(
    (gabarit) => gabarit.organisationId === appartient.organisationId,
  )
  const gabarit = gabarits[indice % Math.max(gabarits.length, 1)]
  if (persona === undefined || gabarit === undefined) return undefined

  const ouverture = appartient.langue === 'en' ? 'Dear colleagues,' : 'Bonjour à toutes et à tous,'
  const cloture =
    appartient.langue === 'en'
      ? 'The team remains available for any question.'
      : 'L’équipe reste à votre disposition pour toute question.'
  const paragraphes = [ouverture, ...phrasesSource, cloture]
  const contenu = documentDe(paragraphes)

  let curseur = 0
  const affirmations: DescriptionAffirmation[] = paragraphes.map((texte) => {
    const offsetDebut = curseur
    curseur += texte.length + 1
    const appuis = faits.filter((fait) => fait.citation === texte)
    return {
      texte,
      position: { offsetDebut, offsetFin: offsetDebut + texte.length },
      verdict: appuis.length > 0 ? 'SOUTENUE' : 'NON_FACTUELLE',
      citationsAppui: appuis.map((fait) => fait.citation),
    }
  })

  const texteComplet = paragraphes.join('\n')
  const approuvee = etat === 'ENVOYEE' || etat === 'ARCHIVEE' || etat === 'APPROUVEE'
  const envoyee = etat === 'ENVOYEE' || etat === 'ARCHIVEE'

  return {
    personaId: persona.id ?? '',
    templateId: gabarit.id ?? '',
    templateVersion: 1,
    contenu,
    etat: etatVariante,
    // Part des affirmations appuyées : une mesure, pas une note inventée.
    score:
      Math.round(
        (affirmations.filter((a) => a.verdict === 'SOUTENUE').length / affirmations.length) * 100,
      ) / 100,
    longueurMots: compterMots(texteComplet),
    affirmations,
    approbation: {
      utilisateurId: appartient.approbateurId,
      regime: 'APPROBATION',
      decision: approuvee ? 'APPROUVEE' : 'EN_ATTENTE',
      ...(approuvee ? { decideLe: dates.decideLe } : {}),
    },
    ...(envoyee
      ? {
          envoi: {
            canal: 'COURRIEL' as const,
            destinataires: { effectif: 40 + ((indice * 17) % 400), liste: persona.nom },
            envoyeLe: dates.envoyeLe,
            etatRemise: { remis: true },
          },
        }
      : {}),
  }
}

export function communicationsHistoriques(): DescriptionCommunication[] {
  const communications: DescriptionCommunication[] = []

  for (let indice = 0; indice < NOMBRE_HISTORIQUE; indice += 1) {
    const numero = PREMIER_NUMERO_HISTORIQUE + indice
    const appartient = appartenance(indice)
    const modele = MODELES[indice % MODELES.length] ?? MODELES[0]
    if (modele === undefined) continue

    // Étalement sur la fenêtre, du plus ancien au plus récent, avec une
    // heure de la journée qui varie pour que l'historique ne soit pas une
    // colonne d'horodatages identiques.
    const jours = Math.round((ETENDUE_JOURS * (NOMBRE_HISTORIQUE - 1 - indice)) / NOMBRE_HISTORIQUE)
    const creeLe = new Date(FIN - jours * JOUR_MS - ((indice * 7) % 9) * 3600 * 1000)
    const dateEffet = new Date(creeLe.getTime() + (3 + (indice % 12)) * JOUR_MS)
    const contexte = contextePour(indice, modele, dateEffet)

    const id = `com_2026_${String(numero).padStart(4, '0')}`
    const sourceId = `src_2026_${String(numero).padStart(4, '0')}_note`
    const texte = modele.lignes(contexte).join('\n')
    const contenuTexte = normaliserTexteSource(texte)
    const faits = faitsDuTexte(sourceId, contenuTexte)
    const etat = etatPour(indice)

    // Les phrases porteuses de faits, dans l'ordre du texte : ce sont elles
    // que la variante reprend. On les prend par leur localisation réelle
    // dans le texte normalisé, jamais par reconstruction.
    const phrases = [...new Set(faits.map((fait) => fait.citation))].toSorted(
      (a, b) =>
        (localiserCitation(contenuTexte, a)?.offsetDebut ?? 0) -
        (localiserCitation(contenuTexte, b)?.offsetDebut ?? 0),
    )

    const figeeLe = new Date(creeLe.getTime() + 60 * 1000)
    const decideLe = new Date(creeLe.getTime() + 2 * JOUR_MS)
    const envoyeLe = new Date(creeLe.getTime() + 3 * JOUR_MS)
    const variante = varianteDe(indice, appartient, etat, phrases, faits, {
      creeLe,
      decideLe,
      envoyeLe,
    })

    communications.push({
      id,
      numero,
      organisationId: appartient.organisationId,
      regionId: appartient.regionId,
      titre: modele.sujet(contexte),
      nature: modele.nature,
      criticite: modele.criticite,
      portee: indice % 4 === 0 ? 'INTER_ORG' : 'INTERNE',
      langue: appartient.langue,
      dateEffet,
      etat,
      modeEntree: 'TEXTE_SAISI',
      auteurId: appartient.auteurId,
      creeLe,
      figeeLe,
      sources: [
        {
          id: sourceId,
          type: 'TEXTE_SAISI',
          nom: `Note de cadrage — ${contexte.produit}`,
          langue: appartient.langue,
          confidentialite: 'INTERNE',
          contenu: { format: 'texte', texte },
        },
      ],
      faits,
      ...(variante ? { variantes: [variante] } : {}),
    })
  }

  return communications
}
