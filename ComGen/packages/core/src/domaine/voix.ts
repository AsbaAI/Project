/**
 * La VOIX d'un persona : comment on écrit pour cette audience.
 *
 * Cinq réglages, tous déclaratifs, plus le jargon admis :
 *  - `registre` et `ton` : le style d'écriture ;
 *  - `personne` : qui parle (« nous », « vous », impersonnel) ;
 *  - `structure` : la méthode, c'est-à-dire le plan attendu, dans l'ordre ;
 *  - `longueurCible` : la longueur visée, en mots ;
 *  - le jargon (`lexique.<langue>.preferes`) : les mots de cette audience.
 *
 * Ce que ces réglages FONT, aujourd'hui :
 *  - `longueurCible` est vérifiée par du code après la génération
 *    (`ecartDeLongueur`), et un écart trop grand devient un contrôle ;
 *  - tout le reste est transmis au rédacteur comme consigne. L'agent simulé
 *    ne reformule pas (il recopie les citations de la source) : il n'en
 *    tient donc pas compte, et l'écran le dit. Un rédacteur réel les reçoit.
 *
 * Comme pour les garde-fous : une clé absente est une absence de règle, une
 * clé présente et mal formée rend `null` — l'appelant bloque plutôt que de
 * deviner.
 */

export const REGISTRES = ['soutenu', 'professionnel', 'direct', 'familier'] as const
export type Registre = (typeof REGISTRES)[number]

export const PERSONNES = ['nous', 'vous', 'impersonnel'] as const
export type Personne = (typeof PERSONNES)[number]

/** Un plan est une suite d'étapes nommées librement : « enjeu », « prochaine étape ». */
export const ETAPES_MAX = 10
export const ETAPE_LONGUEUR_MAX = 60

/** Bornes de la longueur cible, en mots. Hors de là, ce n'est plus une communication. */
export const LONGUEUR_MIN = 30
export const LONGUEUR_MAX = 1200

export interface Voix {
  registre: Registre
  /** Une phrase libre : « précis, opérationnel, horaires explicites ». */
  ton: string
  personne: Personne
  /** Le plan attendu, dans l'ordre ; vide = pas de plan imposé. */
  structure: readonly string[]
  /** Longueur visée en mots ; `null` = pas de cible, donc pas de contrôle. */
  longueurCible: number | null
}

export const VOIX_PAR_DEFAUT: Voix = {
  registre: 'professionnel',
  ton: '',
  personne: 'nous',
  structure: [],
  longueurCible: null,
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
}

/** Lit `Persona.voix`. `null` si une clé présente est mal formée. */
export function lireVoix(brut: unknown): Voix | null {
  if (brut === undefined || brut === null) return VOIX_PAR_DEFAUT
  if (!estObjet(brut)) return null

  const registre =
    brut['registre'] === undefined
      ? VOIX_PAR_DEFAUT.registre
      : REGISTRES.find((r) => r === brut['registre'])
  const personne =
    brut['personne'] === undefined
      ? VOIX_PAR_DEFAUT.personne
      : PERSONNES.find((p) => p === brut['personne'])
  if (registre === undefined || personne === undefined) return null

  const tonBrut = brut['ton']
  if (tonBrut !== undefined && typeof tonBrut !== 'string') return null

  const structureBrute = brut['structure']
  let structure: string[] = []
  if (structureBrute !== undefined) {
    if (!Array.isArray(structureBrute) || structureBrute.length > ETAPES_MAX) return null
    if (
      structureBrute.some(
        (e) => typeof e !== 'string' || e.trim() === '' || e.length > ETAPE_LONGUEUR_MAX,
      )
    ) {
      return null
    }
    structure = (structureBrute as string[]).map((e) => e.trim())
  }

  const longueurBrute = brut['longueurCible']
  let longueurCible: number | null = null
  if (longueurBrute !== undefined && longueurBrute !== null) {
    if (
      typeof longueurBrute !== 'number' ||
      !Number.isInteger(longueurBrute) ||
      longueurBrute < LONGUEUR_MIN ||
      longueurBrute > LONGUEUR_MAX
    ) {
      return null
    }
    longueurCible = longueurBrute
  }

  return { registre, ton: tonBrut ?? '', personne, structure, longueurCible }
}

/** Les mots de l'audience : `lexique.<langue>.preferes`. `null` si mal formé. */
export function lireJargon(lexique: unknown, langue: 'fr' | 'en'): readonly string[] | null {
  if (lexique === undefined || lexique === null) return []
  if (!estObjet(lexique)) return null
  const entree = lexique[langue]
  if (entree === undefined) return []
  if (!estObjet(entree)) return null
  const preferes = entree['preferes']
  if (preferes === undefined) return []
  if (!Array.isArray(preferes) || preferes.some((m) => typeof m !== 'string')) return null
  return preferes as string[]
}

/**
 * Écart à la longueur cible, en proportion (0,25 = un quart trop court ou
 * trop long). `null` quand il n'y a pas de cible : pas de cible, pas d'écart
 * — surtout pas un écart de zéro, qui se lirait comme « conforme ».
 */
export function ecartDeLongueur(mots: number, cible: number | null): number | null {
  if (cible === null || cible <= 0) return null
  return Math.abs(mots - cible) / cible
}

/** Au-delà, l'écart est signalé. Non bloquant : c'est un avertissement de forme. */
export const ECART_LONGUEUR_TOLERE = 0.4
