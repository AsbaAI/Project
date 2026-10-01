/**
 * Communications de démonstration (spécification §20), avec leurs sources et
 * leur fiche de faits. Chaque citation est un extrait mot pour mot du texte
 * de sa source ; le seed le vérifie avec `verifierCitation` et refuse de
 * continuer sinon. Les références F-nn sont attribuées dans l'ordre.
 *
 * Aucune variante, affirmation, approbation, envoi ni exécution au lot 1 :
 * ces tables restent vides.
 */

import type {
  Criticite,
  EtatCommunication,
  IntentionReprise,
  ModeEntree,
  Nature,
  Niveau,
  Portee,
  StatutFait,
  TypeSource,
  TypeValeur,
} from '@comgen/core'

import type { ContenuSource } from './contenus.ts'
import {
  ORG_HELVEA,
  ORG_KESTREL,
  REG_HELVEA_FRANCE,
  REG_KESTREL_UK,
  USR_CLAIRE_FONTAINE,
  USR_OLIVIA_HART,
} from './donnees.ts'
import {
  ANNONCE_RELEASE_TRACK_TRACE,
  CALENDRIER_FENETRES_REGIONS,
  CORRECTIF_FENETRE_ATLAS,
  DECLARATION_INCIDENT_FACTURATION,
  FICHE_CHANGEMENT_ATLAS,
  JOURNAL_SUPERVISION_FACTURATION,
  LIMITES_API_PAR_PLAN,
  NOTE_VERSION_INJECTION,
  POLITIQUE_CONSERVATION_DONNEES,
} from './textes-sources.ts'

export interface DescriptionSource {
  id: string
  type: TypeSource
  /** Nom affiché ; pour un fichier, c'est aussi le nom du fichier déposé. */
  nom: string
  langue: 'fr' | 'en'
  confidentialite: Niveau
  contenu: ContenuSource
}

export interface DescriptionFait {
  sourceId: string
  enonce: string
  /** Recopiée telle qu'écrite dans la source ; absente pour un fait purement textuel. */
  valeur?: string
  typeValeur: TypeValeur
  citation: string
  confiance: number
  confidentialite: Niveau
  statut: StatutFait
}

export interface DescriptionCommunication {
  id: string
  /** Numéro dans l'année 2026 ; la référence en dérive via `formaterReferenceCommunication`. */
  numero: number
  organisationId: string
  regionId: string
  titre: string
  nature: Nature
  criticite: Criticite
  portee: Portee
  langue: 'fr' | 'en'
  dateEffet?: Date
  echeance?: Date
  etat: EtatCommunication
  modeEntree: ModeEntree
  auteurId: string
  parentId?: string
  intentionReprise?: IntentionReprise
  creeLe: Date
  /** Date figée des sources (toutes les sources d'une communication la partagent). */
  figeeLe: Date
  sources: DescriptionSource[]
  faits: DescriptionFait[]
}

export const ANNEE_REFERENCES = 2026

const COM_0001 = 'com_2026_0001'
const COM_0002 = 'com_2026_0002'
const COM_0003 = 'com_2026_0003'
const COM_0004 = 'com_2026_0004'
const COM_0005 = 'com_2026_0005'
const COM_0006 = 'com_2026_0006'

const SRC_0001_FICHE = 'src_2026_0001_fiche_changement'
const SRC_0002_DECLARATION = 'src_2026_0002_declaration_astreinte'
const SRC_0002_JOURNAL = 'src_2026_0002_journal_supervision'
const SRC_0003_CORRECTIF = 'src_2026_0003_correctif'
const SRC_0004_POLITIQUE = 'src_2026_0004_politique_conservation'
const SRC_0004_CALENDRIER = 'src_2026_0004_calendrier_fenetres'
const SRC_0005_NOTE = 'src_2026_0005_note_version'
const SRC_0006_ANNONCE = 'src_2026_0006_annonce_release'
const SRC_0006_LIMITES = 'src_2026_0006_limites_api'

export const COMMUNICATIONS: DescriptionCommunication[] = [
  // -------------------------------------------------------------------------
  // 1. Changement d'infrastructure, fiche .docx (§20, premier cas).
  // -------------------------------------------------------------------------
  {
    id: COM_0001,
    numero: 1,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    titre: 'Migration du Portail client Atlas vers la version 4.2',
    nature: 'CHANGE',
    criticite: 'IMPORTANTE',
    portee: 'INTER_ORG',
    langue: 'fr',
    dateEffet: new Date('2026-10-14T20:00:00.000Z'),
    etat: 'FAITS_A_VALIDER',
    modeEntree: 'FICHIER',
    auteurId: USR_CLAIRE_FONTAINE,
    creeLe: new Date('2026-09-21T09:12:00.000Z'),
    figeeLe: new Date('2026-09-21T09:12:30.000Z'),
    sources: [
      {
        id: SRC_0001_FICHE,
        type: 'FICHIER',
        nom: 'CHG-2026-0412 – Fiche de changement Atlas 4.2.0.docx',
        langue: 'fr',
        confidentialite: 'RESTREINT',
        contenu: { format: 'docx', paragraphes: FICHE_CHANGEMENT_ATLAS },
      },
    ],
    faits: [
      {
        sourceId: SRC_0001_FICHE,
        enonce: 'Le changement porte la référence CHG-2026-0412.',
        valeur: 'CHG-2026-0412',
        typeValeur: 'IDENTIFIANT',
        citation: 'Fiche de changement CHG-2026-0412',
        confiance: 0.99,
        confidentialite: 'INTERNE',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0001_FICHE,
        enonce: 'Le Portail client Atlas migre de la version 4.1.7 vers la version 4.2.0.',
        valeur: '4.2.0',
        typeValeur: 'VERSION',
        citation: 'migration du Portail client Atlas de la version 4.1.7 vers la version 4.2.0',
        confiance: 0.98,
        confidentialite: 'PUBLIC',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0001_FICHE,
        enonce:
          "La fenêtre d'intervention est fixée au mercredi 14 octobre 2026, de 22h00 à 02h00, heure de Paris.",
        valeur: 'mercredi 14 octobre 2026 de 22h00 à 02h00 (heure de Paris)',
        typeValeur: 'DATE',
        citation:
          "Fenêtre d'intervention : mercredi 14 octobre 2026 de 22h00 à 02h00 (heure de Paris).",
        confiance: 0.97,
        confidentialite: 'PUBLIC',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0001_FICHE,
        enonce: "L'interruption de service effective est estimée à 45 minutes.",
        valeur: '45 minutes',
        typeValeur: 'NOMBRE',
        citation: "L'interruption de service effective est estimée à 45 minutes",
        confiance: 0.96,
        confidentialite: 'PUBLIC',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0001_FICHE,
        enonce:
          "La Passerelle de paiement Hermès est placée en mode dégradé pendant l'interruption ; les paiements par carte sont différés puis rejoués.",
        valeur: 'Passerelle de paiement Hermès',
        typeValeur: 'NOM',
        citation:
          "La Passerelle de paiement Hermès sera placée en mode dégradé pendant l'interruption : les paiements par carte seront différés et rejoués automatiquement à la reprise.",
        confiance: 0.95,
        confidentialite: 'INTERNE',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0001_FICHE,
        enonce: 'Le portail compte 312 comptes clients actifs concernés par le changement.',
        valeur: '312',
        typeValeur: 'NOMBRE',
        citation: "l'ensemble des 312 comptes clients actifs du portail",
        confiance: 0.93,
        confidentialite: 'INTERNE',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0001_FICHE,
        enonce:
          'Les partenaires intégrateurs doivent mettre à jour leur connecteur vers le SDK 4.2 avant le 13 octobre 2026.',
        valeur: '13 octobre 2026',
        typeValeur: 'DATE',
        citation:
          'mettre à jour leur connecteur vers la version 4.2 du SDK avant le 13 octobre 2026',
        confiance: 0.88,
        confidentialite: 'PUBLIC',
        statut: 'PROPOSE',
      },
      {
        sourceId: SRC_0001_FICHE,
        enonce: 'En cas de repli, le retour à la version 4.1.7 est estimé à 30 minutes.',
        valeur: '30 minutes',
        typeValeur: 'NOMBRE',
        citation: 'La durée du repli est estimée à 30 minutes.',
        confiance: 0.94,
        confidentialite: 'INTERNE',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0001_FICHE,
        enonce:
          "Le centre de services de Lyon est joignable pendant l'intervention au +33 4 72 00 18 00.",
        valeur: '+33 4 72 00 18 00',
        typeValeur: 'IDENTIFIANT',
        citation: 'centre de services de Lyon, +33 4 72 00 18 00, astreinte-atlas@helvea.example',
        confiance: 0.9,
        confidentialite: 'PUBLIC',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0001_FICHE,
        enonce:
          'Le basculement repose sur la clé de chiffrement de secours KEY-ATL-2026-09, conservée dans le coffre HSM-LYO-2.',
        valeur: 'KEY-ATL-2026-09',
        typeValeur: 'IDENTIFIANT',
        citation:
          'clé de chiffrement de secours conservée dans le coffre HSM-LYO-2, référence interne KEY-ATL-2026-09',
        confiance: 0.85,
        confidentialite: 'RESTREINT',
        statut: 'PROPOSE',
      },
      {
        sourceId: SRC_0001_FICHE,
        enonce: "Un bandeau d'annonce est affiché sur le portail à partir du 9 octobre 2026.",
        valeur: '9 octobre 2026',
        typeValeur: 'DATE',
        citation: "bandeau d'annonce sur le portail à partir du 9 octobre 2026",
        confiance: 0.92,
        confidentialite: 'PUBLIC',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0001_FICHE,
        enonce: 'Le changement a été approuvé par le comité des changements du 18 septembre 2026.',
        valeur: '18 septembre 2026',
        typeValeur: 'DATE',
        citation: 'comité des changements du 18 septembre 2026',
        confiance: 0.95,
        confidentialite: 'INTERNE',
        statut: 'CONFIRME',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. Incident critique, rédaction directe, contradiction volontaire (§20).
  // -------------------------------------------------------------------------
  {
    id: COM_0002,
    numero: 2,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    titre: 'Incident INC-2026-0187 : indisponibilité du service de facturation',
    nature: 'INCIDENT',
    criticite: 'CRITIQUE',
    portee: 'INTERNE',
    langue: 'fr',
    dateEffet: new Date('2026-09-15T11:42:00.000Z'),
    etat: 'FAITS_A_VALIDER',
    modeEntree: 'TEXTE_SAISI',
    auteurId: USR_CLAIRE_FONTAINE,
    creeLe: new Date('2026-09-15T14:20:00.000Z'),
    figeeLe: new Date('2026-09-15T14:35:00.000Z'),
    sources: [
      {
        id: SRC_0002_DECLARATION,
        type: 'TEXTE_SAISI',
        nom: "Déclaration de l'astreinte (texte saisi)",
        langue: 'fr',
        confidentialite: 'INTERNE',
        contenu: { format: 'texte', texte: DECLARATION_INCIDENT_FACTURATION },
      },
      {
        id: SRC_0002_JOURNAL,
        type: 'FICHIER',
        nom: 'journal-supervision-FACT-CORE-2026-09-15.txt',
        langue: 'fr',
        confidentialite: 'INTERNE',
        contenu: { format: 'txt', texte: JOURNAL_SUPERVISION_FACTURATION },
      },
    ],
    faits: [
      {
        sourceId: SRC_0002_DECLARATION,
        enonce: "L'incident porte la référence INC-2026-0187.",
        valeur: 'INC-2026-0187',
        typeValeur: 'IDENTIFIANT',
        citation: "Déclaration d'incident INC-2026-0187",
        confiance: 0.99,
        confidentialite: 'INTERNE',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0002_DECLARATION,
        enonce:
          "L'indisponibilité a été signalée par la supervision le mardi 15 septembre 2026 à 13h42.",
        valeur: 'mardi 15 septembre 2026 à 13h42',
        typeValeur: 'DATE',
        citation:
          "Le mardi 15 septembre 2026 à 13h42, la supervision a signalé l'indisponibilité complète du service de facturation",
        confiance: 0.97,
        confidentialite: 'INTERNE',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0002_DECLARATION,
        enonce:
          "La cause est la saturation de l'espace disque du volume de journaux de la base de facturation.",
        typeValeur: 'TEXTE',
        citation: "saturation de l'espace disque du volume de journaux de la base de facturation",
        confiance: 0.94,
        confidentialite: 'INTERNE',
        statut: 'CONFIRME',
      },
      {
        // Contradiction volontaire (a) : l'astreinte déclare 15h10…
        // Même énoncé, même type, valeurs distinctes : `detecterContradictions`
        // (@comgen/core) doit la relever ; le seed ne la tranche pas.
        sourceId: SRC_0002_DECLARATION,
        enonce: 'Heure de rétablissement du service de facturation',
        valeur: '15h10',
        typeValeur: 'DATE',
        citation: 'Le service a été rétabli à 15h10',
        confiance: 0.8,
        confidentialite: 'INTERNE',
        statut: 'PROPOSE',
      },
      {
        // … (b) le journal de supervision dit 14h52. Même sujet, deux valeurs :
        // la barrière doit bloquer tant qu'un humain n'a pas tranché (§11).
        sourceId: SRC_0002_JOURNAL,
        enonce: 'Heure de rétablissement du service de facturation',
        valeur: '14h52',
        typeValeur: 'DATE',
        citation: 'service de facturation rétabli à 14h52',
        confiance: 0.9,
        confidentialite: 'INTERNE',
        statut: 'PROPOSE',
      },
      {
        sourceId: SRC_0002_DECLARATION,
        enonce: 'Le volume de journaux a été étendu de 200 Go à 400 Go.',
        valeur: '400 Go',
        typeValeur: 'NOMBRE',
        citation: 'extension du volume de 200 Go à 400 Go',
        confiance: 0.95,
        confidentialite: 'INTERNE',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0002_DECLARATION,
        enonce:
          'Environ 1 400 factures ont vu leur émission différée ; toutes ont été émises avant 17h00 le même jour.',
        valeur: '1 400',
        typeValeur: 'NOMBRE',
        citation: "environ 1 400 factures dont l'émission a été différée",
        confiance: 0.9,
        confidentialite: 'INTERNE',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0002_DECLARATION,
        enonce: "Aucune donnée n'a été perdue.",
        typeValeur: 'TEXTE',
        citation: "Aucune donnée n'a été perdue.",
        confiance: 0.96,
        confidentialite: 'INTERNE',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0002_DECLARATION,
        enonce:
          "L'analyse post-incident est présentée au comité d'exploitation du 22 septembre 2026.",
        valeur: '22 septembre 2026',
        typeValeur: 'DATE',
        citation: "comité d'exploitation du 22 septembre 2026",
        confiance: 0.95,
        confidentialite: 'INTERNE',
        statut: 'CONFIRME',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. Correctif rattaché à la première (§20) : « annule et remplace ».
  // -------------------------------------------------------------------------
  {
    id: COM_0003,
    numero: 3,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    titre: 'Correctif : nouvelle fenêtre pour la migration Atlas 4.2',
    nature: 'CHANGE',
    criticite: 'IMPORTANTE',
    portee: 'INTER_ORG',
    langue: 'fr',
    dateEffet: new Date('2026-10-21T20:00:00.000Z'),
    etat: 'BROUILLON',
    modeEntree: 'FICHIER',
    auteurId: USR_CLAIRE_FONTAINE,
    parentId: COM_0001,
    intentionReprise: 'CORRECTIF',
    creeLe: new Date('2026-09-25T10:05:00.000Z'),
    figeeLe: new Date('2026-09-25T10:05:20.000Z'),
    sources: [
      {
        id: SRC_0003_CORRECTIF,
        type: 'FICHIER',
        nom: 'CHG-2026-0412 – Correctif fenêtre.docx',
        langue: 'fr',
        confidentialite: 'INTERNE',
        contenu: { format: 'docx', paragraphes: CORRECTIF_FENETRE_ATLAS },
      },
    ],
    faits: [
      {
        sourceId: SRC_0003_CORRECTIF,
        enonce:
          "La nouvelle fenêtre d'intervention est le mercredi 21 octobre 2026, de 22h00 à 02h00, heure de Paris.",
        valeur: 'mercredi 21 octobre 2026 de 22h00 à 02h00 (heure de Paris)',
        typeValeur: 'DATE',
        citation:
          "Nouvelle fenêtre d'intervention : mercredi 21 octobre 2026 de 22h00 à 02h00 (heure de Paris).",
        confiance: 0.9,
        confidentialite: 'PUBLIC',
        statut: 'PROPOSE',
      },
      {
        sourceId: SRC_0003_CORRECTIF,
        enonce: 'Le correctif annule et remplace la fenêtre annoncée dans la fiche CHG-2026-0412.',
        valeur: 'CHG-2026-0412',
        typeValeur: 'IDENTIFIANT',
        citation:
          "annule et remplace la fenêtre d'intervention annoncée dans la fiche CHG-2026-0412",
        confiance: 0.92,
        confidentialite: 'PUBLIC',
        statut: 'PROPOSE',
      },
      {
        sourceId: SRC_0003_CORRECTIF,
        enonce: 'La date limite de mise à jour du connecteur SDK est reportée au 20 octobre 2026.',
        valeur: '20 octobre 2026',
        typeValeur: 'DATE',
        citation:
          'La date limite de mise à jour du connecteur SDK pour les partenaires intégrateurs est reportée au 20 octobre 2026.',
        confiance: 0.88,
        confidentialite: 'PUBLIC',
        statut: 'PROPOSE',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. Politique externe visant deux régions (§20), source .pdf + calendrier .xlsx.
  // -------------------------------------------------------------------------
  {
    id: COM_0004,
    numero: 4,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    titre: 'Nouvelle politique de conservation des données clients',
    nature: 'REGULATORY',
    criticite: 'IMPORTANTE',
    portee: 'EXTERNE',
    langue: 'fr',
    dateEffet: new Date('2027-01-01T00:00:00.000Z'),
    echeance: new Date('2026-12-15T17:00:00.000Z'),
    etat: 'BROUILLON',
    modeEntree: 'FICHIER',
    auteurId: USR_CLAIRE_FONTAINE,
    creeLe: new Date('2026-09-22T08:30:00.000Z'),
    figeeLe: new Date('2026-09-22T08:31:00.000Z'),
    sources: [
      {
        id: SRC_0004_POLITIQUE,
        type: 'FICHIER',
        nom: 'POL-DATA-2026-03 – Politique de conservation des données clients v3.0.pdf',
        langue: 'fr',
        confidentialite: 'PUBLIC',
        contenu: { format: 'pdf', lignes: POLITIQUE_CONSERVATION_DONNEES },
      },
      {
        id: SRC_0004_CALENDRIER,
        type: 'FICHIER',
        nom: "CAL-2026-11 – Calendrier des fenêtres d'intervention par région.xlsx",
        langue: 'fr',
        confidentialite: 'INTERNE',
        contenu: { format: 'xlsx', feuilles: CALENDRIER_FENETRES_REGIONS },
      },
    ],
    faits: [
      {
        sourceId: SRC_0004_POLITIQUE,
        enonce: 'La politique porte la référence POL-DATA-2026-03.',
        valeur: 'POL-DATA-2026-03',
        typeValeur: 'IDENTIFIANT',
        citation: 'Référence : POL-DATA-2026-03.',
        confiance: 0.96,
        confidentialite: 'PUBLIC',
        statut: 'PROPOSE',
      },
      {
        sourceId: SRC_0004_POLITIQUE,
        enonce: 'La politique est applicable à compter du 1er janvier 2027.',
        valeur: '1er janvier 2027',
        typeValeur: 'DATE',
        citation: 'Applicable à compter du 1er janvier 2027.',
        confiance: 0.95,
        confidentialite: 'PUBLIC',
        statut: 'PROPOSE',
      },
      {
        sourceId: SRC_0004_POLITIQUE,
        enonce:
          "Les données de facturation sont conservées 10 ans à compter de la clôture de l'exercice.",
        valeur: '10 ans',
        typeValeur: 'NOMBRE',
        citation:
          "Les données de facturation sont conservées 10 ans à compter de la clôture de l'exercice.",
        confiance: 0.93,
        confidentialite: 'PUBLIC',
        statut: 'PROPOSE',
      },
      {
        sourceId: SRC_0004_CALENDRIER,
        enonce:
          "La fenêtre d'intervention sur le Portail client Atlas pour la France débute le 7 novembre 2026 à 22h00, heure de Paris.",
        valeur: '2026-11-07 22:00',
        typeValeur: 'DATE',
        citation:
          'France ; Paris – Siège ; Portail client Atlas ; 2026-11-07 22:00 ; 2026-11-08 02:00 ; Europe/Paris ; Sophie Marchand',
        confiance: 0.9,
        confidentialite: 'INTERNE',
        statut: 'PROPOSE',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. Test de robustesse : injection d'instruction dans la source (§20).
  // -------------------------------------------------------------------------
  {
    id: COM_0005,
    numero: 5,
    organisationId: ORG_HELVEA,
    regionId: REG_HELVEA_FRANCE,
    titre: "Test de robustesse : source contenant une injection d'instruction",
    nature: 'RELEASE',
    criticite: 'COURANTE',
    portee: 'INTERNE',
    langue: 'fr',
    etat: 'BROUILLON',
    modeEntree: 'FICHIER',
    auteurId: USR_CLAIRE_FONTAINE,
    creeLe: new Date('2026-09-19T16:40:00.000Z'),
    figeeLe: new Date('2026-09-19T16:40:10.000Z'),
    sources: [
      {
        id: SRC_0005_NOTE,
        type: 'FICHIER',
        nom: 'notes-version-atlas-4.3-preversion.md',
        langue: 'fr',
        confidentialite: 'INTERNE',
        contenu: { format: 'md', texte: NOTE_VERSION_INJECTION },
      },
    ],
    faits: [
      {
        sourceId: SRC_0005_NOTE,
        enonce:
          'La préversion 4.3.0-rc1 est déployée en préproduction depuis le 18 septembre 2026.',
        valeur: '4.3.0-rc1',
        typeValeur: 'VERSION',
        citation:
          "La préversion 4.3.0-rc1 est déployée sur l'environnement de préproduction depuis le 18 septembre 2026.",
        confiance: 0.94,
        confidentialite: 'INTERNE',
        statut: 'CONFIRME',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. Kestrel Logistics (en) : release notes typed in the editor + CSV.
  // -------------------------------------------------------------------------
  {
    id: COM_0006,
    numero: 6,
    organisationId: ORG_KESTREL,
    regionId: REG_KESTREL_UK,
    titre: 'Track & Trace release 3.8 — new API rate limits',
    nature: 'RELEASE',
    criticite: 'COURANTE',
    portee: 'EXTERNE',
    langue: 'en',
    dateEffet: new Date('2026-10-06T00:00:00.000Z'),
    etat: 'FAITS_A_VALIDER',
    modeEntree: 'TEXTE_SAISI',
    auteurId: USR_OLIVIA_HART,
    creeLe: new Date('2026-09-23T11:00:00.000Z'),
    figeeLe: new Date('2026-09-23T11:06:00.000Z'),
    sources: [
      {
        id: SRC_0006_ANNONCE,
        type: 'TEXTE_SAISI',
        nom: 'Release announcement (typed text)',
        langue: 'en',
        confidentialite: 'PUBLIC',
        contenu: { format: 'texte', texte: ANNONCE_RELEASE_TRACK_TRACE },
      },
      {
        id: SRC_0006_LIMITES,
        type: 'FICHIER',
        nom: 'rate-limits-3.8.csv',
        langue: 'en',
        confidentialite: 'PUBLIC',
        contenu: { format: 'csv', lignes: LIMITES_API_PAR_PLAN, separateur: ',' },
      },
    ],
    faits: [
      {
        sourceId: SRC_0006_ANNONCE,
        enonce: 'Release 3.8 of Kestrel Track & Trace is deployed to production.',
        valeur: '3.8',
        typeValeur: 'VERSION',
        citation:
          'Release 3.8 of Kestrel Track & Trace will be deployed to the production environment',
        confiance: 0.97,
        confidentialite: 'PUBLIC',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0006_ANNONCE,
        enonce:
          'The deployment takes place on Tuesday 6 October 2026 between 01:00 and 03:00, London time.',
        valeur: 'Tuesday 6 October 2026 between 01:00 and 03:00 (London time)',
        typeValeur: 'DATE',
        citation: 'on Tuesday 6 October 2026 between 01:00 and 03:00 (London time)',
        confiance: 0.96,
        confidentialite: 'PUBLIC',
        statut: 'CONFIRME',
      },
      {
        sourceId: SRC_0006_ANNONCE,
        enonce: 'The Standard plan is limited to 600 requests per minute.',
        valeur: '600',
        typeValeur: 'NOMBRE',
        citation: 'The Standard plan is limited to 600 requests per minute',
        confiance: 0.9,
        confidentialite: 'PUBLIC',
        statut: 'PROPOSE',
      },
      {
        sourceId: SRC_0006_LIMITES,
        enonce:
          'The Premium plan is limited to 3000 requests per minute, with a burst of 100 requests per second.',
        valeur: '3000',
        typeValeur: 'NOMBRE',
        citation: 'Premium,3000,100,10',
        confiance: 0.92,
        confidentialite: 'PUBLIC',
        statut: 'CONFIRME',
      },
    ],
  },
]
