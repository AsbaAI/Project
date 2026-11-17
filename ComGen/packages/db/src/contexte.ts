import {
  compterMotsDocument,
  formaterReferenceCommunication,
  type ActionAudit,
  type ChangementAudit,
  type EtatCommunication,
  type ObjetAudit,
  type OrigineTexte,
} from '@comgen/core'

import { CLIENT_BRUT, type Connexion } from './connexion.ts'
import { ErreurDonnees } from './erreurs.ts'
import type { Prisma, PrismaClient } from './generated/client.ts'

/**
 * Contexte d'accès aux données cloisonné par organisation (spécification
 * §13.2, §19). C'est la seule porte d'entrée de l'application vers la base :
 *
 * - chaque requête reçoit le filtre `organisationId` du contexte, quelle que
 *   soit l'écriture de l'appelant ;
 * - chaque création reçoit l'`organisationId` du contexte ; les déclencheurs
 *   SQL vérifient en plus qu'il coïncide avec celui du parent ;
 * - `Variante.contenu` ne s'écrit que par `ecrireContenuVariante`, qui trace
 *   la version ; le déclencheur SQL remet la variante à revoir et annule les
 *   approbations, même par SQL direct ;
 * - les accès bruts (`$queryRaw`, `$executeRaw`…) sont refusés.
 */

export interface IdentiteContexte {
  organisationId: string
  /** Utilisateur au nom duquel les écritures sont faites, s'il y en a un. */
  utilisateurId?: string
  /**
   * Courriel de cet utilisateur, recopié dans le journal d'audit. L'audit
   * ne se lit pas par jointure : il dit qui a agi au moment du geste, même
   * si le compte est renommé ou supprimé ensuite.
   */
  utilisateurCourriel?: string
}

const OPERATIONS_AVEC_FILTRE = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
  'upsert',
  'count',
  'aggregate',
  'groupBy',
])
const OPERATIONS_DE_CREATION = new Set(['create', 'createMany', 'createManyAndReturn'])

/** Modèles hors cloisonnement, atteints uniquement par les fonctions dédiées. */
const MODELES_RESERVES: ReadonlySet<Prisma.ModelName> = new Set<Prisma.ModelName>([
  'CompteurReference',
])

/**
 * Modèles en ajout seul : on ajoute et on lit, jamais autre chose. Le
 * verrou qui compte est le déclencheur SQL ; celui-ci s'arrête plus tôt,
 * avec un message qui nomme la règle plutôt qu'une erreur de PostgreSQL.
 */
const MODELES_AJOUT_SEUL: ReadonlySet<Prisma.ModelName> = new Set<Prisma.ModelName>([
  'JournalAudit',
])
const OPERATIONS_AJOUT_SEUL = new Set(['create', 'findMany', 'findFirst', 'count'])

const MEMBRES_INTERDITS = new Set([
  '$queryRaw',
  '$executeRaw',
  '$queryRawUnsafe',
  '$executeRawUnsafe',
  '$extends',
  '$on',
  '$use',
  '$connect',
  '$disconnect',
  'compteurReference',
  'journalAudit',
])

/** États dans lesquels le contenu d'une communication ne se modifie plus. */
const ETATS_CONTENU_FIGE: ReadonlySet<EtatCommunication> = new Set<EtatCommunication>([
  'ENVOI_PLANIFIE',
  'ENVOYEE',
  'ARCHIVEE',
])

type Enregistrement = Record<string, unknown>

function estEnregistrement(valeur: unknown): valeur is Enregistrement {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
}

function avecFiltre(where: unknown, filtre: Enregistrement): Enregistrement {
  const base = estEnregistrement(where) ? where : {}
  const existant = base['AND']
  const conditions = existant === undefined ? [] : Array.isArray(existant) ? existant : [existant]
  return { ...base, AND: [...conditions, filtre] }
}

function avecOrganisation(data: unknown, organisationId: string): unknown {
  if (Array.isArray(data)) return data.map((ligne) => avecOrganisation(ligne, organisationId))
  if (!estEnregistrement(data)) return data
  const { organisation: _relation, ...reste } = data
  return { ...reste, organisationId }
}

function filtrePour(model: Prisma.ModelName, organisationId: string): Enregistrement {
  return model === 'Organisation' ? { id: organisationId } : { organisationId }
}

interface ArgumentsRequete {
  where?: unknown
  data?: unknown
  create?: unknown
  update?: unknown
}

function cloisonner(
  args: unknown,
  model: Prisma.ModelName,
  operation: string,
  organisationId: string,
) {
  const requete: ArgumentsRequete = estEnregistrement(args) ? args : {}
  const filtre = filtrePour(model, organisationId)
  const resultat: ArgumentsRequete & Enregistrement = { ...requete }

  if (MODELES_RESERVES.has(model)) {
    throw new ErreurDonnees(
      'ACCES_INTERDIT',
      `Le modèle ${model} n'est accessible que par les fonctions dédiées du contexte`,
    )
  }
  if (MODELES_AJOUT_SEUL.has(model) && !OPERATIONS_AJOUT_SEUL.has(operation)) {
    throw new ErreurDonnees(
      'MODIFICATION_INTERDITE',
      `${model} est en ajout seul : ${operation} refusé`,
    )
  }
  if (model === 'Organisation' && !operation.startsWith('find') && operation !== 'count') {
    throw new ErreurDonnees('ACCES_INTERDIT', "L'organisation ne se modifie pas depuis un contexte")
  }

  const refuserContenuVariante = (data: unknown): void => {
    if (model === 'Variante' && estEnregistrement(data) && 'contenu' in data) {
      throw new ErreurDonnees(
        'ECRITURE_CONTENU_INTERDITE',
        'Variante.contenu ne s’écrit que par contexte.ecrireContenuVariante (§7)',
      )
    }
  }

  if (OPERATIONS_AVEC_FILTRE.has(operation)) {
    resultat.where = avecFiltre(requete.where, filtre)
    if ('data' in requete) {
      refuserContenuVariante(requete.data)
      resultat.data = avecOrganisation(requete.data, organisationId)
    }
    if (operation === 'upsert') {
      refuserContenuVariante(requete.update)
      resultat.create = avecOrganisation(requete.create, organisationId)
      resultat.update = avecOrganisation(requete.update, organisationId)
    }
    return resultat
  }
  if (OPERATIONS_DE_CREATION.has(operation)) {
    resultat.data = avecOrganisation(requete.data, organisationId)
    return resultat
  }
  throw new ErreurDonnees(
    'OPERATION_NON_PRISE_EN_CHARGE',
    `Opération ${operation} sur ${model} non prise en charge par le contexte`,
  )
}

function etendre(client: PrismaClient, organisationId: string) {
  return client.$extends({
    name: 'cloisonnement-organisation',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          const argumentsCloisonnes = cloisonner(args, model, operation, organisationId)
          return query(argumentsCloisonnes as typeof args)
        },
      },
    },
  })
}

type ClientEtendu = ReturnType<typeof etendre>
type ClientTransaction = Parameters<Parameters<ClientEtendu['$transaction']>[0]>[0]

type MembresInterdits =
  | '$queryRaw'
  | '$executeRaw'
  | '$queryRawUnsafe'
  | '$executeRawUnsafe'
  | '$extends'
  | '$on'
  | '$use'
  | '$connect'
  | '$disconnect'
  | 'compteurReference'
  | 'journalAudit'

/**
 * Le client tel qu'il est exposé dans une transaction interactive.
 *
 * Il porte `journaliser` : une trace d'audit s'écrit dans la **même**
 * transaction que le changement qu'elle décrit, sinon l'une des deux peut
 * manquer et le journal ment par omission.
 */
export type ContexteTransaction = Omit<ClientTransaction, MembresInterdits> & {
  journaliser(ecriture: EcritureAudit): Promise<void>
}

export interface EcritureContenuVariante {
  varianteId: string
  contenu: Prisma.InputJsonValue
  origine: OrigineTexte
  /** Auteur humain de l'écriture ; absent pour une écriture d'agent. */
  auteurId?: string
}

export interface AmendementDeFait {
  faitId: string
  nouvelleValeur: string
  justification: string
  /** Source invoquée (référence libre) quand la valeur ne vient pas de la fiche. */
  sourceInvoquee?: string
  /** L'auteur assume la valeur sans source : le fait devient DECLARE (§11). */
  responsabiliteAssumee: boolean
  auteurId: string
}

export interface EcritureAudit {
  action: ActionAudit
  objet: ObjetAudit
  /** Identifiant de l'objet touché, dans sa propre table. */
  objetId: string
  /** Libellé lisible de l'objet au moment du geste. */
  objetLibelle: string
  /** Produit par `resumerChangement` (core) : secrets déjà masqués. */
  changements: readonly ChangementAudit[]
}

export interface FiltresAudit {
  objet?: ObjetAudit
  action?: ActionAudit
  /** Nombre maximal de lignes rendues ; borné par `LIGNES_AUDIT_MAX`. */
  limite?: number
}

export interface LigneAudit {
  id: string
  acteurCourriel: string
  action: ActionAudit
  objet: ObjetAudit
  objetId: string
  objetLibelle: string
  changements: ChangementAudit[]
  creeLe: Date
}

/** Un écran de consultation pagine ; il ne tire jamais le journal entier. */
export const LIGNES_AUDIT_MAX = 200

export interface FonctionsContexte {
  readonly organisationId: string
  readonly utilisateurId: string | undefined
  /** Écrit le contenu d'une variante en traçant la version (§7). */
  ecrireContenuVariante(ecriture: EcritureContenuVariante): Promise<void>
  /** Amende un fait ; les approbations des variantes concernées tombent (§11). */
  amenderFait(amendement: AmendementDeFait): Promise<{ amendementId: string }>
  /** Réserve la prochaine référence `COM-AAAA-NNNN`. */
  prochaineReference(annee: number): Promise<string>
  /**
   * Ajoute une ligne au journal d'audit. Hors transaction : à n'employer
   * que si le changement décrit a déjà abouti. Dans une transaction, passer
   * par `tx.journaliser` pour que trace et changement tombent ensemble.
   */
  journaliser(ecriture: EcritureAudit): Promise<void>
  /** Lit le journal, de la ligne la plus récente à la plus ancienne. */
  listerAudit(filtres?: FiltresAudit): Promise<LigneAudit[]>
  /** Transaction interactive ; le client reçu est lui aussi cloisonné. */
  $transaction<R>(fn: (tx: ContexteTransaction) => Promise<R>): Promise<R>
}

export type ContexteDonnees = Omit<ClientEtendu, MembresInterdits | '$transaction'> &
  FonctionsContexte

function proxifier<T extends object>(cible: T, extras: Enregistrement): T {
  return new Proxy(cible, {
    get(objet, propriete) {
      if (typeof propriete === 'string') {
        if (propriete in extras) return extras[propriete]
        if (MEMBRES_INTERDITS.has(propriete)) {
          throw new ErreurDonnees(
            'ACCES_INTERDIT',
            `${propriete} n'est pas disponible depuis un contexte cloisonné`,
          )
        }
      }
      const valeur = Reflect.get(objet, propriete)
      return typeof valeur === 'function' ? valeur.bind(objet) : valeur
    },
  })
}

export function creerContexte(connexion: Connexion, identite: IdentiteContexte): ContexteDonnees {
  const brut = connexion[CLIENT_BRUT]
  const { organisationId } = identite
  const etendu = etendre(brut, organisationId)

  const ecrireContenuVariante = async (ecriture: EcritureContenuVariante): Promise<void> => {
    await brut.$transaction(async (tx) => {
      const variante = await tx.variante.findFirst({
        where: { id: ecriture.varianteId, organisationId },
        select: { id: true, etat: true, communication: { select: { etat: true } } },
      })
      if (!variante) {
        throw new ErreurDonnees('INTROUVABLE', `Variante ${ecriture.varianteId} introuvable`)
      }
      if (variante.etat === 'ENVOYEE' || ETATS_CONTENU_FIGE.has(variante.communication.etat)) {
        throw new ErreurDonnees(
          'CONTENU_FIGE',
          `Variante ${variante.id} : contenu figé (variante ${variante.etat}, communication ${variante.communication.etat})`,
        )
      }
      // Le déclencheur SQL remet l'état à A_REVOIR et annule les approbations ;
      // on l'écrit aussi ici pour que l'intention soit lisible.
      await tx.variante.update({
        where: { id: variante.id },
        data: {
          contenu: ecriture.contenu,
          etat: 'A_REVOIR',
          score: null,
          longueurMots: compterMotsDocument(ecriture.contenu),
        },
      })
      await tx.versionTexte.create({
        data: {
          organisationId,
          varianteId: variante.id,
          contenu: ecriture.contenu,
          origine: ecriture.origine,
          auteurId: ecriture.auteurId ?? null,
        },
      })
    })
  }

  const amenderFait = async (amendement: AmendementDeFait): Promise<{ amendementId: string }> => {
    if (!amendement.responsabiliteAssumee && !amendement.sourceInvoquee) {
      throw new ErreurDonnees(
        'AMENDEMENT_SANS_APPUI',
        'Un amendement invoque une source ou assume la responsabilité de la valeur (§11)',
      )
    }
    return brut.$transaction(async (tx) => {
      const fait = await tx.fait.findFirst({
        where: { id: amendement.faitId, organisationId },
        select: { id: true, valeur: true },
      })
      if (!fait) throw new ErreurDonnees('INTROUVABLE', `Fait ${amendement.faitId} introuvable`)
      const cree = await tx.amendementFait.create({
        data: {
          organisationId,
          faitId: fait.id,
          ancienneValeur: fait.valeur,
          nouvelleValeur: amendement.nouvelleValeur,
          justification: amendement.justification,
          sourceInvoquee: amendement.sourceInvoquee ?? null,
          responsabiliteAssumee: amendement.responsabiliteAssumee,
          auteurId: amendement.auteurId,
        },
        select: { id: true },
      })
      await tx.fait.update({
        where: { id: fait.id },
        data: {
          valeur: amendement.nouvelleValeur,
          statut: amendement.responsabiliteAssumee ? 'DECLARE' : 'CONFIRME',
        },
      })
      return { amendementId: cree.id }
    })
  }

  const prochaineReference = async (annee: number): Promise<string> => {
    const compteur = await brut.compteurReference.upsert({
      where: { annee },
      create: { annee, dernier: 1 },
      update: { dernier: { increment: 1 } },
      select: { dernier: true },
    })
    return formaterReferenceCommunication(annee, compteur.dernier)
  }

  /**
   * Le journal d'audit se remplit par le client cloisonné (qui pose
   * l'organisation) mais jamais depuis le code appelant : le membre
   * `journalAudit` lui est refusé par le proxy. Dans une transaction, c'est
   * le client de cette transaction qui écrit, donc la trace tombe avec le
   * changement qu'elle décrit.
   */
  const journaliserAvec = async (
    client: { journalAudit: { create(args: { data: Enregistrement }): Promise<unknown> } },
    ecriture: EcritureAudit,
  ): Promise<void> => {
    const { utilisateurId, utilisateurCourriel } = identite
    if (!utilisateurId || !utilisateurCourriel) {
      throw new ErreurDonnees(
        'AUDIT_SANS_ACTEUR',
        "Une ligne d'audit nomme son acteur : contexte ouvert sans utilisateur",
      )
    }
    await client.journalAudit.create({
      data: {
        organisationId,
        acteurId: utilisateurId,
        acteurCourriel: utilisateurCourriel,
        action: ecriture.action,
        objet: ecriture.objet,
        objetId: ecriture.objetId,
        objetLibelle: ecriture.objetLibelle,
        changements: [...ecriture.changements],
      },
    })
  }

  type ClientAudit = Parameters<typeof journaliserAvec>[0]

  const listerAudit = async (filtres: FiltresAudit = {}): Promise<LigneAudit[]> => {
    const lignes = await etendu.journalAudit.findMany({
      where: {
        ...(filtres.objet === undefined ? {} : { objet: filtres.objet }),
        ...(filtres.action === undefined ? {} : { action: filtres.action }),
      },
      orderBy: { creeLe: 'desc' },
      take: Math.min(filtres.limite ?? LIGNES_AUDIT_MAX, LIGNES_AUDIT_MAX),
    })
    return lignes.map((ligne) => ({
      id: ligne.id,
      acteurCourriel: ligne.acteurCourriel,
      action: ligne.action,
      objet: ligne.objet,
      objetId: ligne.objetId,
      objetLibelle: ligne.objetLibelle,
      changements: Array.isArray(ligne.changements)
        ? (ligne.changements as unknown as ChangementAudit[])
        : [],
      creeLe: ligne.creeLe,
    }))
  }

  const $transaction = <R>(fn: (tx: ContexteTransaction) => Promise<R>): Promise<R> =>
    etendu.$transaction((tx) => {
      const extrasTransaction = {
        journaliser: (ecriture: EcritureAudit) =>
          journaliserAvec(tx as unknown as ClientAudit, ecriture),
      }
      return fn(proxifier(tx, extrasTransaction) as unknown as ContexteTransaction)
    })

  const extras: FonctionsContexte = {
    organisationId,
    utilisateurId: identite.utilisateurId,
    ecrireContenuVariante,
    amenderFait,
    prochaineReference,
    journaliser: (ecriture) => journaliserAvec(etendu as unknown as ClientAudit, ecriture),
    listerAudit,
    $transaction,
  }

  return proxifier(etendu, extras as unknown as Enregistrement) as unknown as ContexteDonnees
}
