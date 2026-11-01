import {
  type ConfigConnecteur,
  type ConnecteurItsm,
  ErreurItsm,
  type FiltresTickets,
  NIVEAUX_PRIORITE,
  POLITIQUE_PAR_DEFAUT,
  type PageTickets,
  type PolitiqueUrl,
  type ResultatTest,
  STATUTS_FILTRABLES,
  TAILLE_PAGE_MAX,
  composerTexteSource,
  creerConnecteur,
  estErreurItsm,
  verifierUrlInstance,
} from '@comgen/connecteurs'
import { fabriqueAgents } from '@comgen/agents'
import {
  CONFIG_MASQUAGE_PAR_DEFAUT,
  type ConfigMasquage,
  NIVEAUX,
  type Niveau,
  PREFIXES_DE_TICKET,
  type ResultatMasquage,
  detecterLangue,
  masquer,
  normaliserTexteSource,
} from '@comgen/core'
import type { Prisma } from '@comgen/db'
import { z } from 'zod'

import { exigerDroit } from '@/server/auth/droits'
import { environnement } from '@/server/env'

import { type Acteur, ErreurMetier, introuvable } from './erreurs'
import { ETATS_ENTREE_OUVERTE } from './etat'
import {
  type SourcePreparee,
  empreinteTexte,
  empreintesExistantes,
  enregistrerSources,
  nouvelIdentifiantSource,
} from './sources'

/**
 * Connecteur ITSM côté application : configuration, liste des tickets, et
 * préparation de la source.
 *
 * Trois règles tiennent tout le module :
 *  - un secret n'est jamais lu, écrit ni rendu ici : la base garde le NOM
 *    d'une variable `ITSM_…`, la valeur n'est résolue qu'au moment de bâtir
 *    le connecteur et n'en sort pas ;
 *  - ce que les agents liront est le texte MASQUÉ, et l'aperçu montré à
 *    l'utilisateur est ce même texte (une seule fonction, `preparerSourceItsm`) ;
 *  - une configuration de masquage illisible arrête tout : jamais de repli
 *    sur un masquage plus faible.
 */

const TAILLE_PAGE = 20

export interface ReglagesItsm {
  mode: 'mock' | 'servicenow' | 'desactive'
  /** Hôtes ajoutés par l'environnement à la liste autorisée. */
  hotesAutorises: readonly string[]
}

export interface DependancesItsm {
  reglages: ReglagesItsm
  env: Readonly<Record<string, string | undefined>>
  fabrique: (config: ConfigConnecteur) => ConnecteurItsm
  politiqueUrl?: PolitiqueUrl
  maintenant?: () => Date
}

/** Dépendances de production : l'environnement du processus. */
export function dependancesItsm(): DependancesItsm {
  const env = environnement()
  return {
    reglages: { mode: env.ITSM_MODE, hotesAutorises: env.ITSM_HOTES_AUTORISES },
    env: process.env,
    fabrique: (config) => creerConnecteur(config),
  }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REF_SECRET = /^ITSM_[A-Z0-9_]{1,60}$/u

const schemaMasquage = z
  .object({
    courriel: z.boolean(),
    telephone: z.boolean(),
    identifiants: z
      .array(
        z
          .object({
            prefixe: z
              .string()
              .regex(/^[A-Za-z]{1,10}$/u)
              .refine((p) => !PREFIXES_DE_TICKET.includes(p.toUpperCase())),
            chiffresMin: z.number().int().min(1).max(20),
            chiffresMax: z.number().int().min(1).max(20),
          })
          .refine((r) => r.chiffresMin <= r.chiffresMax),
      )
      .max(10),
    termes: z.array(z.string().trim().min(2).max(100)).max(100),
    champs: z.array(z.enum(['demandeur'])),
  })
  .strict()

const schemaConfig = z.object({
  systeme: z.literal('servicenow'),
  urlInstance: z.string().trim().min(1).max(300),
  methodeAuth: z.enum(['oauth2', 'basic']),
  identifiantPublic: z.string().trim().min(1).max(200),
  refSecret: z.string().regex(REF_SECRET),
  masquage: schemaMasquage,
  actif: z.boolean().default(true),
})

function donneesInvalides(champs: Record<string, string>): ErreurMetier {
  return new ErreurMetier('DONNEES_INVALIDES', 'Configuration ITSM invalide', { champs })
}

interface ConfigValidee {
  systeme: 'servicenow'
  urlInstance: string
  methodeAuth: 'oauth2' | 'basic'
  identifiantPublic: string
  refSecret: string
  masquage: ConfigMasquage
  actif: boolean
}

function valider(brute: unknown, dep: DependancesItsm): ConfigValidee {
  const analyse = schemaConfig.safeParse(brute)
  if (!analyse.success) {
    const champs: Record<string, string> = {}
    for (const probleme of analyse.error.issues) {
      champs[String(probleme.path[0] ?? 'config')] ??= 'invalide'
    }
    throw donneesInvalides(champs)
  }
  const politique: PolitiqueUrl = dep.politiqueUrl ?? {
    hotesAutorises: [...POLITIQUE_PAR_DEFAUT.hotesAutorises, ...dep.reglages.hotesAutorises],
  }
  let urlInstance: string
  try {
    urlInstance = verifierUrlInstance(analyse.data.urlInstance, politique)
  } catch (erreur) {
    if (estErreurItsm(erreur)) throw donneesInvalides({ urlInstance: 'invalide' })
    throw erreur
  }
  if (!dep.env[analyse.data.refSecret]) throw donneesInvalides({ refSecret: 'absent' })
  return { ...analyse.data, urlInstance }
}

function connecteurDe(config: ConfigValidee, dep: DependancesItsm): ConnecteurItsm {
  const secret = dep.env[config.refSecret]
  if (!secret) throw new ErreurItsm('CONFIG', `Variable ${config.refSecret} absente`)
  return dep.fabrique({
    systeme: 'servicenow',
    urlInstance: config.urlInstance,
    identifiants:
      config.methodeAuth === 'oauth2'
        ? { methode: 'oauth2', clientId: config.identifiantPublic, clientSecret: secret }
        : { methode: 'basic', utilisateur: config.identifiantPublic, motDePasse: secret },
  })
}

async function executerTest(connecteur: ConnecteurItsm): Promise<ResultatTest> {
  try {
    return await connecteur.tester()
  } catch (erreur) {
    if (estErreurItsm(erreur)) return { ok: false, code: erreur.code, message: erreur.message }
    throw erreur
  }
}

/** Teste une configuration saisie, sans rien enregistrer. */
export async function testerConfigItsm(
  acteur: Acteur,
  brute: unknown,
  dep: DependancesItsm = dependancesItsm(),
): Promise<ResultatTest> {
  exigerDroit(acteur.utilisateur, 'PARAMETRER')
  return executerTest(connecteurDe(valider(brute, dep), dep))
}

/** Enregistre après un test réussi ; un test qui échoue n'écrit rien. */
export async function enregistrerConfigItsm(
  acteur: Acteur,
  brute: unknown,
  dep: DependancesItsm = dependancesItsm(),
): Promise<void> {
  exigerDroit(acteur.utilisateur, 'PARAMETRER')
  const config = valider(brute, dep)
  const resultat = await executerTest(connecteurDe(config, dep))
  if (!resultat.ok) {
    throw new ErreurItsm(resultat.code as ErreurItsm['code'], resultat.message)
  }
  const donnees = {
    organisationId: acteur.utilisateur.organisationId,
    systeme: config.systeme,
    urlInstance: config.urlInstance,
    methodeAuth: config.methodeAuth,
    identifiantPublic: config.identifiantPublic,
    refSecret: config.refSecret,
    masquage: masquageJson(config.masquage),
    actif: config.actif,
    testeLe: (dep.maintenant ?? (() => new Date()))(),
  }
  await acteur.contexte.connecteurItsm.upsert({
    where: { organisationId: acteur.utilisateur.organisationId },
    create: donnees,
    update: donnees,
  })
}

// ---------------------------------------------------------------------------
// État
// ---------------------------------------------------------------------------

export interface ConfigItsmPublique {
  systeme: string
  urlInstance: string
  methodeAuth: string
  identifiantPublic: string
  /** Le NOM de la variable, jamais sa valeur. */
  refSecret: string
  secretPresent: boolean
  masquage: ConfigMasquage
  actif: boolean
  testeLe: Date | null
}

export type EtatItsm =
  | { mode: 'desactive' }
  | { mode: 'mock' }
  | { mode: 'servicenow'; configure: false }
  | { mode: 'servicenow'; configure: true; config: ConfigItsmPublique }

export function itsmDisponible(etat: EtatItsm): boolean {
  if (etat.mode === 'mock') return true
  return etat.mode === 'servicenow' && etat.configure && etat.config.actif
}

/** Le masquage tel que la base le garde : du JSON, sans rien d'autre. */
function masquageJson(masquage: ConfigMasquage): Prisma.InputJsonObject {
  return {
    courriel: masquage.courriel,
    telephone: masquage.telephone,
    identifiants: masquage.identifiants.map((r) => ({ ...r })),
    termes: [...masquage.termes],
    champs: [...masquage.champs],
  }
}

function lireMasquage(brut: unknown): ConfigMasquage {
  const analyse = schemaMasquage.safeParse(brut)
  if (!analyse.success) {
    throw new ErreurItsm('CONFIG', 'Configuration de masquage illisible')
  }
  return analyse.data
}

export async function lireEtatItsm(
  acteur: Acteur,
  dep: DependancesItsm = dependancesItsm(),
): Promise<EtatItsm> {
  exigerDroit(acteur.utilisateur, 'CONSULTER')
  if (dep.reglages.mode === 'desactive') return { mode: 'desactive' }
  if (dep.reglages.mode === 'mock') return { mode: 'mock' }
  const ligne = await acteur.contexte.connecteurItsm.findFirst()
  if (!ligne) return { mode: 'servicenow', configure: false }
  return {
    mode: 'servicenow',
    configure: true,
    config: {
      systeme: ligne.systeme,
      urlInstance: ligne.urlInstance,
      methodeAuth: ligne.methodeAuth,
      identifiantPublic: ligne.identifiantPublic,
      refSecret: ligne.refSecret,
      secretPresent: Boolean(dep.env[ligne.refSecret]),
      masquage: lireMasquage(ligne.masquage),
      actif: ligne.actif,
      testeLe: ligne.testeLe,
    },
  }
}

interface Connexion {
  connecteur: ConnecteurItsm
  masquage: ConfigMasquage
  instance: string
}

function indisponible(): ErreurMetier {
  return new ErreurMetier('MODE_NON_DISPONIBLE', 'Aucun connecteur ITSM disponible')
}

async function connexionActive(acteur: Acteur, dep: DependancesItsm): Promise<Connexion> {
  if (dep.reglages.mode === 'desactive') throw indisponible()
  const ligne = await acteur.contexte.connecteurItsm.findFirst()
  if (dep.reglages.mode === 'mock') {
    return {
      connecteur: dep.fabrique({ systeme: 'mock' }),
      masquage: ligne ? lireMasquage(ligne.masquage) : CONFIG_MASQUAGE_PAR_DEFAUT,
      instance: 'mock',
    }
  }
  if (!ligne?.actif) throw indisponible()
  const masquage = lireMasquage(ligne.masquage)
  const config = {
    systeme: 'servicenow' as const,
    urlInstance: ligne.urlInstance,
    methodeAuth: ligne.methodeAuth as 'oauth2' | 'basic',
    identifiantPublic: ligne.identifiantPublic,
    refSecret: ligne.refSecret,
    masquage,
    actif: ligne.actif,
  }
  return { connecteur: connecteurDe(config, dep), masquage, instance: ligne.urlInstance }
}

// ---------------------------------------------------------------------------
// Liste
// ---------------------------------------------------------------------------

export interface FiltresBruts {
  statuts?: readonly string[]
  priorites?: readonly string[]
  groupe?: string
  du?: string
  au?: string
  page?: string
}

function jour(valeur: string, fin: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(valeur)) return null
  const date = new Date(`${valeur}T${fin ? '23:59:59' : '00:00:00'}Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== valeur ? null : date
}

function lireFiltres(brut: FiltresBruts): { filtres: FiltresTickets; page: number } {
  const champs: Record<string, string> = {}
  const filtres: FiltresTickets = {}

  const statuts = (brut.statuts ?? []).filter((s) => s !== '')
  if (statuts.length > 0) {
    const connus = statuts.filter((s): s is (typeof STATUTS_FILTRABLES)[number] =>
      (STATUTS_FILTRABLES as readonly string[]).includes(s),
    )
    if (connus.length === statuts.length) filtres.statuts = connus
    else champs['statut'] = 'invalide'
  }

  const priorites = (brut.priorites ?? []).filter((p) => p !== '')
  if (priorites.length > 0) {
    const niveaux = priorites.map((p) => (/^\d$/u.test(p) ? Number(p) : Number.NaN))
    const valides = niveaux.filter((n): n is (typeof NIVEAUX_PRIORITE)[number] =>
      (NIVEAUX_PRIORITE as readonly number[]).includes(n),
    )
    if (valides.length === niveaux.length) filtres.priorites = valides
    else champs['priorite'] = 'invalide'
  }

  const groupe = (brut.groupe ?? '').trim()
  if (groupe !== '') {
    // eslint-disable-next-line no-control-regex -- on refuse justement les caractères de contrôle
    if (groupe.length > 100 || /[\^\u0000-\u001f\u007f]/u.test(groupe))
      champs['groupe'] = 'invalide'
    else filtres.groupe = groupe
  }

  const du = (brut.du ?? '').trim()
  if (du !== '') {
    const date = jour(du, false)
    if (date) filtres.ouvertApres = date
    else champs['du'] = 'invalide'
  }
  const au = (brut.au ?? '').trim()
  if (au !== '') {
    const date = jour(au, true)
    if (date) filtres.ouvertAvant = date
    else champs['au'] = 'invalide'
  }
  if (
    filtres.ouvertApres &&
    filtres.ouvertAvant &&
    filtres.ouvertApres.getTime() > filtres.ouvertAvant.getTime()
  ) {
    champs['au'] = 'avant_debut'
  }

  let page = 1
  const brutePage = (brut.page ?? '').trim()
  if (brutePage !== '') {
    if (/^\d{1,6}$/u.test(brutePage) && Number(brutePage) >= 1) page = Number(brutePage)
    else champs['page'] = 'invalide'
  }

  if (Object.keys(champs).length > 0) throw donneesInvalides(champs)
  return { filtres, page }
}

export async function listerTickets(
  acteur: Acteur,
  brut: FiltresBruts,
  dep: DependancesItsm = dependancesItsm(),
): Promise<PageTickets> {
  exigerDroit(acteur.utilisateur, 'EDITER')
  const { filtres, page } = lireFiltres(brut)
  const { connecteur } = await connexionActive(acteur, dep)
  return connecteur.lister(filtres, { page, taille: Math.min(TAILLE_PAGE, TAILLE_PAGE_MAX) })
}

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

export interface DemandeSourceItsm {
  communicationId: string
  idExterne: string
  avecNotes: boolean
}

export interface OrigineExterne {
  systeme: string
  instance: string
  numero: string
  idExterne: string
  lien: string
  recupereLe: string
  avecNotes: boolean
  masquages: ResultatMasquage['remplacements']
}

/**
 * Relit l'origine écrite à l'import. Une origine illisible n'est pas
 * devinée : l'appelant affiche la source sans ticket plutôt qu'avec un
 * numéro inventé.
 */
export function lireOrigineExterne(valeur: unknown): OrigineExterne | null {
  if (typeof valeur !== 'object' || valeur === null || Array.isArray(valeur)) return null
  const brut = valeur as Record<string, unknown>
  const { systeme, numero, idExterne, lien, instance } = brut
  if (typeof systeme !== 'string' || typeof numero !== 'string') return null
  return {
    systeme,
    instance: typeof instance === 'string' ? instance : '',
    numero,
    idExterne: typeof idExterne === 'string' ? idExterne : '',
    lien: typeof lien === 'string' ? lien : '',
    recupereLe: typeof brut['recupereLe'] === 'string' ? brut['recupereLe'] : '',
    avecNotes: brut['avecNotes'] === true,
    masquages: { courriel: 0, telephone: 0, identifiant: 0, terme: 0 },
  }
}

export interface SourceItsmPreparee {
  nom: string
  /** Le texte MASQUÉ : ce que les agents liront, et ce que l'écran montre. */
  texte: string
  empreinte: string
  avecNotes: boolean
  masquages: ResultatMasquage['remplacements']
  origine: OrigineExterne
}

/**
 * Du ticket à la source : lecture, texte déterministe, masquage. L'aperçu et
 * l'import passent tous deux ici — ce que l'utilisateur voit est ce qui sera
 * lu, à la virgule près.
 */
export async function preparerSourceItsm(
  acteur: Acteur,
  demande: DemandeSourceItsm,
  dep: DependancesItsm = dependancesItsm(),
): Promise<SourceItsmPreparee> {
  exigerDroit(acteur.utilisateur, 'EDITER')
  const communication = await acteur.contexte.communication.findUnique({
    where: { id: demande.communicationId },
    select: { id: true, etat: true, langue: true },
  })
  if (!communication) throw introuvable('Communication', demande.communicationId)
  if (!ETATS_ENTREE_OUVERTE.has(communication.etat)) {
    throw new ErreurMetier(
      'ETAT_INCOMPATIBLE',
      `Communication ${demande.communicationId} en ${communication.etat} : les sources sont figées`,
    )
  }
  const langue = communication.langue === 'en' ? 'en' : 'fr'
  const { connecteur, masquage, instance } = await connexionActive(acteur, dep)
  const ticket = await connecteur.lire(demande.idExterne, { avecNotes: demande.avecNotes })

  const brut = composerTexteSource(ticket, {
    langue,
    avecNotes: demande.avecNotes,
    avecDemandeur: !masquage.champs.includes('demandeur'),
  })
  // Normalisé comme toute autre source : l'aperçu, le texte figé et
  // l'empreinte portent exactement les mêmes caractères.
  const { texte, remplacements } = masquer(normaliserTexteSource(brut), masquage, langue)
  return {
    nom: `Ticket ${ticket.numero}`,
    texte,
    empreinte: empreinteTexte(texte),
    avecNotes: demande.avecNotes,
    masquages: remplacements,
    origine: {
      systeme: connecteur.systeme,
      instance,
      numero: ticket.numero,
      idExterne: ticket.idExterne,
      lien: ticket.lien,
      recupereLe: (dep.maintenant ?? (() => new Date()))().toISOString(),
      avecNotes: demande.avecNotes,
      masquages: remplacements,
    },
  }
}

export const apercuSourceItsm = preparerSourceItsm

/**
 * Importe le ticket choisi : le texte masqué devient une source figée, par
 * le même chemin que les fichiers et le texte saisi (mêmes agents, mêmes
 * citations vérifiées, même transition d'état). La référence du ticket est
 * rangée à côté de la source ; le ticket brut n'est jamais écrit.
 */
export async function importerTicketItsm(
  acteur: Acteur,
  demande: DemandeSourceItsm & { confidentialite: string | undefined },
  dep: DependancesItsm = dependancesItsm(),
): Promise<{ sourceId: string; faitsProposes: number; langue: string | null }> {
  const confidentialite = NIVEAUX.find((n): n is Niveau => n === demande.confidentialite)
  if (confidentialite === undefined) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'Confidentialité invalide', {
      champs: { confidentialite: 'invalide' },
    })
  }
  const preparee = await preparerSourceItsm(acteur, demande, dep)
  const vues = await empreintesExistantes(acteur, demande.communicationId)
  if (vues.has(preparee.empreinte)) {
    throw new ErreurMetier(
      'SOURCE_EN_DOUBLE',
      'Ce ticket est déjà une source de la communication',
      {
        champs: { ticket: 'en_double' },
      },
    )
  }
  const source: SourcePreparee = {
    id: nouvelIdentifiantSource(),
    nom: preparee.nom,
    type: 'CONNECTEUR',
    contenuTexte: preparee.texte,
    empreinte: preparee.empreinte,
    langue: detecterLangue(preparee.texte),
    confidentialite,
    cheminStockage: null,
    origineExterne: { ...preparee.origine, masquages: { ...preparee.origine.masquages } },
  }
  const faits = await enregistrerSources(
    acteur,
    demande.communicationId,
    [source],
    fabriqueAgents().agents,
  )
  return {
    sourceId: source.id,
    faitsProposes: faits.get(source.id) ?? 0,
    langue: source.langue,
  }
}
