/**
 * Indépendance des familles de modèles entre REDACTEUR et VERIFICATEUR
 * (spécification §5.4, critère d'acceptation §17).
 *
 * Fonction pure : elle ne connaît ni fournisseur ni base de données. C'est
 * la garde qui empêche une génération de démarrer quand le vérificateur
 * partagerait les angles morts du rédacteur.
 */

/** Ce que la garde a besoin de savoir d'un modèle affecté à un rôle. */
export interface ModeleAffecte {
  /** `Capacites.famille` du fournisseur, ou famille déclarée à l'enregistrement. */
  famille: string
  identifiantModele: string
  /** Pour un modèle affiné : modèle de base (`ModeleEnregistre.baseAffinage`). */
  baseAffinage?: string | undefined
}

export interface AffectationsControlees {
  REDACTEUR?: ModeleAffecte | undefined
  VERIFICATEUR?: ModeleAffecte | undefined
}

export type MotifDependance = 'ROLE_NON_AFFECTE' | 'MEME_FAMILLE' | 'MEME_BASE_AFFINAGE'

export type ResultatIndependance =
  | { independant: true }
  | { independant: false; motif: 'ROLE_NON_AFFECTE'; role: 'REDACTEUR' | 'VERIFICATEUR' }
  | { independant: false; motif: 'MEME_FAMILLE' | 'MEME_BASE_AFFINAGE'; famille: string }

/** Normalisation minimale : la casse et les espaces ne font pas une famille. */
function normaliser(famille: string): string {
  return famille.trim().toLowerCase()
}

/**
 * Les « lignées » d'un modèle : sa famille, plus sa base d'affinage s'il en
 * a une. Deux modèles sont dépendants dès qu'une lignée leur est commune.
 */
function lignees(modele: ModeleAffecte): Set<string> {
  const ensemble = new Set<string>([normaliser(modele.famille)])
  if (modele.baseAffinage !== undefined && modele.baseAffinage.trim() !== '') {
    ensemble.add(normaliser(modele.baseAffinage))
  }
  return ensemble
}

export function verifierIndependanceFamilles(
  affectations: AffectationsControlees,
): ResultatIndependance {
  const redacteur = affectations.REDACTEUR
  const verificateur = affectations.VERIFICATEUR
  if (redacteur === undefined) {
    return { independant: false, motif: 'ROLE_NON_AFFECTE', role: 'REDACTEUR' }
  }
  if (verificateur === undefined) {
    return { independant: false, motif: 'ROLE_NON_AFFECTE', role: 'VERIFICATEUR' }
  }

  const familleRedacteur = normaliser(redacteur.famille)
  const familleVerificateur = normaliser(verificateur.famille)
  if (familleRedacteur === familleVerificateur) {
    return { independant: false, motif: 'MEME_FAMILLE', famille: redacteur.famille.trim() }
  }

  const ligneesVerificateur = lignees(verificateur)
  for (const lignee of lignees(redacteur)) {
    if (ligneesVerificateur.has(lignee)) {
      return { independant: false, motif: 'MEME_BASE_AFFINAGE', famille: lignee }
    }
  }

  return { independant: true }
}
