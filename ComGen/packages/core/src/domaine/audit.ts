/**
 * Journal d'audit (§13, plan L3).
 *
 * Deux listes orthogonales plutôt qu'une liste de verbes composés : le
 * nombre d'objets et le nombre d'actions grandissent séparément, et une
 * lecture peut filtrer sur l'un sans connaître l'autre.
 *
 * Le résumé d'un changement est construit **ici**, hors de la base et hors
 * de l'interface : c'est le seul endroit qui décide ce qui a le droit de
 * sortir. Un champ dont le nom évoque un secret est signalé comme modifié
 * mais sa valeur ne quitte jamais le serveur (§19 : pas de clé en base).
 */

export const ACTIONS_AUDIT = [
  'CREATION',
  'MODIFICATION',
  'SUPPRESSION',
  'DECISION',
  'TRANSITION',
] as const
export type ActionAudit = (typeof ACTIONS_AUDIT)[number]

export const OBJETS_AUDIT = [
  'CONSIGNE_AGENT',
  'PERSONA',
  'LISTE_DIFFUSION',
  'GABARIT',
  'CONNECTEUR_ITSM',
  'APPROBATION',
  'ENVOI',
  'COMMUNICATION',
] as const
export type ObjetAudit = (typeof OBJETS_AUDIT)[number]

/** Un champ dont le nom correspond ne livre jamais sa valeur. */
const CHAMP_SECRET =
  /(mot[_-]?de[_-]?passe|password|secret|jeton|token|^cle|cle[_-]|[_-]cle|key|authorization|identifiantClient|signature)/i

/** Valeur affichée à la place d'un secret : le changement reste visible. */
export const VALEUR_MASQUEE = '(masqué)'

/** Au-delà, une valeur est coupée : un journal se lit, il n'archive pas. */
export const LONGUEUR_MAX_VALEUR = 120

export interface ChangementAudit {
  champ: string
  avant: string
  apres: string
}

function rendre(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return '∅'
  if (typeof valeur === 'string') return valeur
  if (typeof valeur === 'number' || typeof valeur === 'boolean') return String(valeur)
  if (valeur instanceof Date) return valeur.toISOString()
  return JSON.stringify(valeur) ?? '∅'
}

function couper(texte: string): string {
  return texte.length <= LONGUEUR_MAX_VALEUR ? texte : `${texte.slice(0, LONGUEUR_MAX_VALEUR - 1)}…`
}

/**
 * Compare deux états d'un objet et décrit ce qui a bougé.
 *
 * Seuls les champs présents dans `apres` sont examinés : l'appelant choisit
 * ce qu'il soumet au journal, un objet complet n'est jamais passé par
 * réflexe. Un champ inchangé n'apparaît pas.
 */
export function resumerChangement(
  avant: Readonly<Record<string, unknown>>,
  apres: Readonly<Record<string, unknown>>,
): ChangementAudit[] {
  const changements: ChangementAudit[] = []
  for (const champ of Object.keys(apres)) {
    const rendusAvant = rendre(avant[champ])
    const rendusApres = rendre(apres[champ])
    if (rendusAvant === rendusApres) continue
    const masque = CHAMP_SECRET.test(champ)
    changements.push({
      champ,
      avant: masque ? VALEUR_MASQUEE : couper(rendusAvant),
      apres: masque ? VALEUR_MASQUEE : couper(rendusApres),
    })
  }
  return changements
}

/** Rend une liste de changements en une ligne lisible dans un tableau. */
export function formaterResume(changements: readonly ChangementAudit[]): string {
  return changements.map(({ champ, avant, apres }) => `${champ} : ${avant} → ${apres}`).join(' ; ')
}
