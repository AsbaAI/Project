import type { EtatCommunication, ModeEntree } from '@comgen/core'

import { exigerDroit } from '@/server/auth/droits'

import type { Acteur } from './erreurs'

/* oxlint-disable no-underscore-dangle -- `_count` et `_all` sont les noms des agrégats de Prisma */
/**
 * Indicateurs de l'organisation, COMPTÉS en base à chaque lecture : rien
 * n'est estimé, rien n'est mis en cache. Le périmètre est celui du
 * contexte — jamais une autre organisation. Un indicateur sans donnée
 * vaut `null` (« pas de mesure »), pas zéro : un zéro dirait qu'on a mesuré.
 */
export interface Analyses {
  total: number
  parEtat: Partial<Record<EtatCommunication, number>>
  parOrigine: Partial<Record<ModeEntree, number>>
  decisions: { approuvees: number; rejetees: number }
  /** Part d'approbations parmi les décisions prises ; `null` s'il n'y en a aucune. */
  tauxApprobation: number | null
  envois: { total: number; remis: number; simules: number }
  /** Délai médian création → envoi, en heures ; `null` sans envoi daté. */
  delaiMedianHeures: number | null
  controlesBloquants: { type: string; nombre: number }[]
}

function mediane(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null
  const tri = valeurs.toSorted((a, b) => a - b)
  const milieu = Math.floor(tri.length / 2)
  const bas = tri[milieu - 1] ?? 0
  const haut = tri[milieu] ?? 0
  return tri.length % 2 === 1 ? haut : (bas + haut) / 2
}

export async function chargerAnalyses(acteur: Acteur): Promise<Analyses> {
  exigerDroit(acteur.utilisateur, 'CONSULTER')
  const c = acteur.contexte
  const [parEtat, parOrigine, decisions, envois, controles] = await Promise.all([
    c.communication.groupBy({ by: ['etat'], _count: { _all: true } }),
    c.communication.groupBy({ by: ['modeEntree'], _count: { _all: true } }),
    c.approbation.groupBy({
      by: ['decision'],
      where: { decision: { in: ['APPROUVEE', 'REJETEE'] }, annuleeLe: null },
      _count: { _all: true },
    }),
    c.envoi.findMany({
      select: {
        envoyeLe: true,
        etatRemise: true,
        variante: { select: { communication: { select: { creeLe: true } } } },
      },
    }),
    c.controle.groupBy({
      by: ['type'],
      where: { bloquant: true },
      _count: { _all: true },
      orderBy: { _count: { type: 'desc' } },
    }),
  ])

  const compte = (decision: string) =>
    decisions.find((d) => d.decision === decision)?._count._all ?? 0
  const approuvees = compte('APPROUVEE')
  const rejetees = compte('REJETEE')

  const remis = envois.filter(
    (e) =>
      typeof e.etatRemise === 'object' &&
      e.etatRemise !== null &&
      !Array.isArray(e.etatRemise) &&
      e.etatRemise['remis'] === true,
  ).length
  const delais = envois.flatMap((e) =>
    e.envoyeLe === null
      ? []
      : [(e.envoyeLe.getTime() - e.variante.communication.creeLe.getTime()) / 3_600_000],
  )

  return {
    total: parEtat.reduce((somme, g) => somme + g._count._all, 0),
    parEtat: Object.fromEntries(parEtat.map((g) => [g.etat, g._count._all])),
    parOrigine: Object.fromEntries(parOrigine.map((g) => [g.modeEntree, g._count._all])),
    decisions: { approuvees, rejetees },
    tauxApprobation: approuvees + rejetees === 0 ? null : approuvees / (approuvees + rejetees),
    envois: { total: envois.length, remis, simules: envois.length - remis },
    delaiMedianHeures: mediane(delais),
    controlesBloquants: controles.map((g) => ({ type: g.type, nombre: g._count._all })),
  }
}
