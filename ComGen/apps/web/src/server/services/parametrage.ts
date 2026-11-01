import { CANAUX, NIVEAUX, type Niveau, lireGardeFous } from '@comgen/core'
import type { Prisma } from '@comgen/db'
import { z } from 'zod'

import { exigerDroit } from '@/server/auth/droits'

import { type Acteur, ErreurMetier, introuvable } from './erreurs'
import { resoudreListes } from './etat'

/**
 * Paramétrage de l'organisation : personas (garde-fous, approbateurs) et
 * listes de diffusion. Réservé à qui peut PARAMETRER.
 *
 * Ce que ces réglages gouvernent est du contrôle, pas du confort : le
 * GARDIEN lit les garde-fous, la soumission lit les approbateurs, l'envoi
 * lit les listes. Un réglage illisible ne passe donc jamais pour « aucune
 * règle » — l'écran le dit, et le contrôle bloque.
 */

const MOT = z.string().trim().min(2).max(60)
const LISTE_MOTS = z.array(MOT).max(100)

const SchemaPersona = z.object({
  nom: z.string().trim().min(2).max(100),
  actif: z.boolean(),
  canalDefaut: z.enum(CANAUX),
  interditsFr: LISTE_MOTS,
  interditsEn: LISTE_MOTS,
  sujetsInterdits: LISTE_MOTS,
  confidentialiteMax: z.enum(NIVEAUX),
  approbateurIds: z.array(z.string().min(1)).max(50),
})

export type EntreePersona = z.input<typeof SchemaPersona>

export interface PersonaParametre {
  id: string
  nom: string
  actif: boolean
  canalDefaut: string
  interditsFr: readonly string[]
  interditsEn: readonly string[]
  sujetsInterdits: readonly string[]
  confidentialiteMax: Niveau
  approbateurIds: string[]
  /** Faux si les garde-fous enregistrés sont illisibles : le contrôle bloque. */
  gardeFousLisibles: boolean
}

export interface Approbateur {
  id: string
  nom: string
}

export interface EcranPersonas {
  personas: PersonaParametre[]
  approbateurs: Approbateur[]
}

export async function chargerPersonas(acteur: Acteur): Promise<EcranPersonas> {
  exigerDroit(acteur.utilisateur, 'PARAMETRER')
  const [lignes, approbateurs] = await Promise.all([
    acteur.contexte.persona.findMany({ orderBy: { nom: 'asc' } }),
    acteur.contexte.utilisateur.findMany({
      where: { roles: { has: 'APPROBATEUR' } },
      select: { id: true, nom: true },
      orderBy: { nom: 'asc' },
    }),
  ])
  return {
    approbateurs,
    personas: lignes.map((p) => {
      const fr = lireGardeFous(p.lexique, p.gardeFous, 'fr')
      const en = lireGardeFous(p.lexique, p.gardeFous, 'en')
      return {
        id: p.id,
        nom: p.nom,
        actif: p.actif,
        canalDefaut: p.canalDefaut,
        interditsFr: fr?.interdits ?? [],
        interditsEn: en?.interdits ?? [],
        sujetsInterdits: fr?.sujetsInterdits ?? [],
        confidentialiteMax: fr?.confidentialiteMax ?? 'SECRET',
        approbateurIds: p.approbateurIds,
        gardeFousLisibles: fr !== null && en !== null,
      }
    }),
  }
}

function objet(valeur: unknown): Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
    ? (valeur as Record<string, unknown>)
    : {}
}

export async function modifierPersona(
  acteur: Acteur,
  personaId: string,
  brute: unknown,
): Promise<void> {
  exigerDroit(acteur.utilisateur, 'PARAMETRER')
  const analyse = SchemaPersona.safeParse(brute)
  if (!analyse.success) {
    const champs: Record<string, string> = {}
    for (const issue of analyse.error.issues) champs[String(issue.path[0])] ??= 'invalide'
    throw new ErreurMetier('DONNEES_INVALIDES', 'Persona invalide', { champs })
  }
  const saisi = analyse.data

  await acteur.contexte.$transaction(async (tx) => {
    const persona = await tx.persona.findUnique({ where: { id: personaId } })
    if (!persona) throw introuvable('Persona', personaId)

    // Un approbateur désigné est un approbateur de l'organisation — pas un
    // identifiant libre qui ne désignerait personne.
    const eligibles = await tx.utilisateur.findMany({
      where: { roles: { has: 'APPROBATEUR' }, id: { in: saisi.approbateurIds } },
      select: { id: true },
    })
    if (eligibles.length !== new Set(saisi.approbateurIds).size) {
      throw new ErreurMetier('DONNEES_INVALIDES', 'Approbateur inconnu', {
        champs: { approbateurIds: 'invalide' },
      })
    }

    // On fusionne : `preferes`, `voix` et `exemples` ne sont pas à l'écran
    // et ne doivent pas disparaître à l'enregistrement.
    const lexique = objet(persona.lexique)
    const lexiqueFinal = {
      ...lexique,
      fr: { ...objet(lexique['fr']), interdits: saisi.interditsFr },
      en: { ...objet(lexique['en']), interdits: saisi.interditsEn },
    } satisfies Prisma.InputJsonObject
    const gardeFous = {
      ...objet(persona.gardeFous),
      sujetsInterdits: saisi.sujetsInterdits,
      confidentialiteMax: saisi.confidentialiteMax,
    } satisfies Prisma.InputJsonObject

    await tx.persona.update({
      where: { id: personaId },
      data: {
        nom: saisi.nom,
        actif: saisi.actif,
        canalDefaut: saisi.canalDefaut,
        lexique: lexiqueFinal as Prisma.InputJsonObject,
        gardeFous: gardeFous as Prisma.InputJsonObject,
        approbateurIds: [...new Set(saisi.approbateurIds)],
      },
    })
  })
}

// ---------------------------------------------------------------------------
// Listes de diffusion
// ---------------------------------------------------------------------------

const COURRIEL = z.string().trim().toLowerCase().email().max(254)

export interface ListeParametre {
  id: string
  nom: string
  personaNom: string | null
  type: string
  /** Éditable seulement pour une liste statique : les autres types ne se résolvent pas ici. */
  editable: boolean
  /** Une adresse par ligne, éventuellement « Nom, adresse ». */
  destinataires: string
  effectif: number | null
}

export async function chargerListes(acteur: Acteur): Promise<ListeParametre[]> {
  exigerDroit(acteur.utilisateur, 'PARAMETRER')
  const lignes = await acteur.contexte.listeDiffusion.findMany({
    include: { persona: { select: { nom: true } } },
    orderBy: { nom: 'asc' },
  })
  return lignes.map((l) => {
    const brut = objet(l.definition)['destinataires']
    const entrees = Array.isArray(brut) ? brut : []
    const destinataires = entrees
      .map((e) => {
        const o = objet(e)
        const courriel = typeof o['courriel'] === 'string' ? o['courriel'] : ''
        const nom = typeof o['nom'] === 'string' && o['nom'] !== courriel ? o['nom'] : ''
        return nom === '' ? courriel : `${nom}, ${courriel}`
      })
      .join('\n')
    return {
      id: l.id,
      nom: l.nom,
      personaNom: l.persona?.nom ?? null,
      type: l.type,
      editable: l.type === 'STATIQUE',
      destinataires,
      effectif: resoudreListes([l]).effectif,
    }
  })
}

export async function modifierListe(
  acteur: Acteur,
  listeId: string,
  lignesBrutes: readonly string[],
): Promise<{ effectif: number }> {
  exigerDroit(acteur.utilisateur, 'PARAMETRER')
  const destinataires: { nom: string; courriel: string }[] = []
  const champs: Record<string, string> = {}
  for (const brute of lignesBrutes.map((l) => l.trim()).filter((l) => l !== '')) {
    const [nomBrut, ...reste] = brute.split(',')
    const adresse = reste.length === 0 ? nomBrut : reste.join(',')
    const courriel = COURRIEL.safeParse(adresse)
    if (!courriel.success) {
      champs['destinataires'] = 'invalide'
      continue
    }
    destinataires.push({
      nom: reste.length === 0 ? courriel.data : (nomBrut ?? '').trim() || courriel.data,
      courriel: courriel.data,
    })
  }
  if (champs['destinataires'] !== undefined) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'Une adresse n’est pas valide', { champs })
  }

  await acteur.contexte.$transaction(async (tx) => {
    const liste = await tx.listeDiffusion.findUnique({ where: { id: listeId } })
    if (!liste) throw introuvable('Liste', listeId)
    if (liste.type !== 'STATIQUE') {
      throw new ErreurMetier('ETAT_INCOMPATIBLE', 'Seule une liste statique se modifie ici')
    }
    await tx.listeDiffusion.update({
      where: { id: listeId },
      data: { definition: { destinataires } },
    })
  })
  return { effectif: new Set(destinataires.map((d) => d.courriel)).size }
}
