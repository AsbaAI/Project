/**
 * Références lisibles (spécification §6) : `COM-2026-0001` pour une
 * communication, `F-01` pour un fait. Stables, affichées à l'utilisateur.
 */

function exigerEntierPositif(valeur: number, nom: string): void {
  if (!Number.isInteger(valeur) || valeur < 1) {
    throw new RangeError(`${nom} doit être un entier strictement positif (reçu ${valeur})`)
  }
}

export function formaterReferenceCommunication(annee: number, numero: number): string {
  exigerEntierPositif(annee, 'annee')
  exigerEntierPositif(numero, 'numero')
  return `COM-${annee}-${String(numero).padStart(4, '0')}`
}

const MOTIF_REFERENCE_COMMUNICATION = /^COM-(\d{4})-(\d{4,})$/

export function analyserReferenceCommunication(
  reference: string,
): { annee: number; numero: number } | null {
  const resultat = MOTIF_REFERENCE_COMMUNICATION.exec(reference)
  if (!resultat) return null
  const [, annee, numero] = resultat
  if (annee === undefined || numero === undefined) return null
  return { annee: Number(annee), numero: Number(numero) }
}

export function formaterReferenceFait(numero: number): string {
  exigerEntierPositif(numero, 'numero')
  return `F-${String(numero).padStart(2, '0')}`
}
