import type { StatutFait, TypeValeur } from './enumerations.ts'

/**
 * Contradictions entre faits (spécification §15 : « les contradictions
 * entre sources doivent être tranchées avant de continuer »).
 *
 * Règle déterministe, sans modèle : deux faits VIVANTS de la même
 * communication portent le même énoncé (à la casse et aux blancs près),
 * le même type de valeur, et des valeurs différentes. L'énoncé est le
 * libellé humain du fait (« Heure de rétablissement du service ») ; deux
 * faits qui répondent à la même question avec deux valeurs se contredisent.
 *
 * Trancher = retirer l'un des faits (RETIRE) ou amender sa valeur pour
 * qu'elle rejoigne l'autre. Un fait PERIME ne compte plus. L'ARBITRE
 * (lot 3) proposera des rapprochements sémantiques ; il ne remplace pas
 * cette règle, il l'alimente en rendant les énoncés comparables.
 */

export interface FaitComparable {
  id: string
  enonce: string
  typeValeur: TypeValeur | null
  valeur: string | null
  statut: StatutFait
}

export interface Contradiction {
  /** Énoncé partagé, tel que normalisé pour la comparaison. */
  enonce: string
  typeValeur: TypeValeur | null
  /** Faits en désaccord, dans l'ordre reçu ; deux au moins. */
  faits: readonly [FaitComparable, FaitComparable, ...FaitComparable[]]
  /** Valeurs distinctes en présence, dans l'ordre d'apparition. */
  valeurs: readonly string[]
}

const STATUTS_VIVANTS: ReadonlySet<StatutFait> = new Set<StatutFait>([
  'PROPOSE',
  'CONFIRME',
  'DECLARE',
])

export function estFaitVivant(statut: StatutFait): boolean {
  return STATUTS_VIVANTS.has(statut)
}

/** Casse, accents conservés ; blancs réduits ; ponctuation finale ignorée. */
export function normaliserEnonce(enonce: string): string {
  return enonce
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\s.:;,!?]+$/u, '')
    .trim()
}

export function detecterContradictions(faits: readonly FaitComparable[]): Contradiction[] {
  const groupes = new Map<string, FaitComparable[]>()
  for (const fait of faits) {
    if (!estFaitVivant(fait.statut)) continue
    if (fait.valeur === null) continue
    const cle = `${fait.typeValeur ?? ''}\u0000${normaliserEnonce(fait.enonce)}`
    const groupe = groupes.get(cle) ?? []
    groupe.push(fait)
    groupes.set(cle, groupe)
  }

  const contradictions: Contradiction[] = []
  for (const groupe of groupes.values()) {
    const [premier, second] = groupe
    if (premier === undefined || second === undefined) continue
    const valeurs = [...new Set(groupe.map((fait) => fait.valeur ?? ''))]
    if (valeurs.length < 2) continue
    contradictions.push({
      enonce: normaliserEnonce(premier.enonce),
      typeValeur: premier.typeValeur,
      faits: [premier, second, ...groupe.slice(2)],
      valeurs,
    })
  }
  return contradictions
}
