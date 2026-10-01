/**
 * Quels formats de gabarit servent quel canal (§6).
 *
 * Un persona déclare son canal (`canalDefaut`) ; un gabarit déclare son
 * format. La correspondance est ici, explicite et ordonnée par préférence,
 * plutôt que devinée au moment de générer. Un canal sans gabarit disponible
 * est un refus nommé (`PERSONA_SANS_TEMPLATE`), pas un repli sur le premier
 * gabarit venu : envoyer une note PDF à qui attend un message instantané
 * n'est pas « mieux que rien ».
 */

import type { Canal, FormatTemplate } from './enumerations.ts'

const FORMATS_PAR_CANAL: Readonly<Record<Canal, readonly FormatTemplate[]>> = {
  COURRIEL: ['MAIL_HTML', 'MAIL_TEXTE', 'NEWSLETTER'],
  MESSAGERIE_INSTANTANEE: ['MESSAGE_INSTANTANE'],
  PORTAIL: ['ARTICLE', 'UNE_PAGE'],
  DOCUMENT: ['PDF', 'UNE_PAGE'],
}

export function formatsPourCanal(canal: Canal): readonly FormatTemplate[] {
  return FORMATS_PAR_CANAL[canal]
}

/**
 * Gabarit retenu pour un canal : le premier format disponible dans l'ordre
 * de préférence du canal. `null` quand aucun ne convient — l'appelant
 * refuse alors, il ne choisit pas à la place.
 */
export function choisirGabarit<T extends { format: FormatTemplate }>(
  canal: Canal,
  gabarits: readonly T[],
): T | null {
  for (const format of formatsPourCanal(canal)) {
    const trouve = gabarits.find((gabarit) => gabarit.format === format)
    if (trouve !== undefined) return trouve
  }
  return null
}
