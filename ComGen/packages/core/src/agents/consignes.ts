/**
 * Garde sur les CONSIGNES d'agent (§8, §19).
 *
 * Une consigne est le texte envoyé au modèle. Comme elle est écrite par un
 * administrateur, elle peut — sans mauvaise intention — demander exactement
 * ce que la contrainte cardinale interdit : écrire une valeur, inventer ce
 * qui manque, ignorer la source, répondre en texte libre. Le programme ne
 * peut pas empêcher un modèle d'obéir à une telle consigne ; il peut
 * refuser de l'enregistrer. C'est ce que fait cette fonction, par
 * comparaison de chaînes, hors de tout appel de modèle.
 *
 * Elle ne juge pas la qualité d'une consigne : elle ne cherche que les
 * quatre demandes interdites. Une consigne qui passe n'est pas « bonne »,
 * elle est seulement dépourvue de ces demandes-là.
 */

export const CODES_CONSIGNE = [
  /** Demande au modèle d'écrire un nombre, une date, une version, un identifiant. */
  'VALEUR_ECRITE',
  /** Demande de combler, deviner, estimer ce que la source ne dit pas. */
  'INVENTION',
  /** Demande de passer outre la source ou les faits. */
  'SOURCE_IGNOREE',
  /** Demande une sortie en texte libre, alors que la sortie est un schéma. */
  'TEXTE_LIBRE',
] as const
export type CodeConsigne = (typeof CODES_CONSIGNE)[number]

export interface ConstatConsigne {
  code: CodeConsigne
  /** Le morceau de consigne qui déclenche le refus, tel qu'il est écrit. */
  extrait: string
}

export const CONSIGNE_LONGUEUR_MIN = 20
export const CONSIGNE_LONGUEUR_MAX = 4000

/*
 * Les motifs travaillent sur un texte normalisé (minuscules, sans accents)
 * pour qu'« Écris la date » et « ecris la date » soient le même ordre. Ils
 * sont bornés : pas de répétition imbriquée, donc pas d'explosion.
 */
const VERBE_ECRIRE = String.raw`(?:ecri[st]|ecrire|recopi\w{0,4}|reecri\w{0,4}|rempla\w{0,5}|indiqu\w{0,4}|ajout\w{0,4}|mentionn\w{0,4}|renseign\w{0,4})`
const VALEUR = String.raw`(?:nombres?|chiffres?|dates?|heures?|versions?|identifiants?|references?|montants?|pourcentages?)`

const MOTIFS: readonly { code: CodeConsigne; motif: RegExp }[] = [
  {
    code: 'VALEUR_ECRITE',
    motif: new RegExp(String.raw`${VERBE_ECRIRE}(?:\s+\w+){0,3}\s+${VALEUR}\b`, 'u'),
  },
  {
    code: 'INVENTION',
    motif:
      /\b(?:invent\w{0,4}|imagin\w{0,4}|devin\w{0,4}|extrapol\w{0,4}|estim\w{0,4}|suppos\w{0,4}|complet\w{0,4}\s+(?:les\s+)?(?:trous|manques|vides)|au\s+besoin\s+invente)\b/u,
  },
  {
    code: 'SOURCE_IGNOREE',
    motif:
      /\b(?:ignor\w{0,4}|passe\s+outre|sans\s+tenir\s+compte\s+(?:de|des)|peu\s+importe|neglig\w{0,4})\s+(?:la|le|les|des|du)?\s*(?:sources?|citations?|faits?|fiche)\b/u,
  },
  {
    code: 'TEXTE_LIBRE',
    motif:
      /\b(?:texte\s+libre|format\s+libre|librement\s+redig\w{0,4}|prose\s+libre|sans\s+structure|hors\s+schema)\b/u,
  },
]

function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replaceAll(/[’']/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
}

/** La phrase d'origine qui contient la position donnée, raccourcie. */
function extraitAutour(texte: string, position: number): string {
  const debut = Math.max(0, texte.lastIndexOf('.', position) + 1)
  const fin = texte.indexOf('.', position)
  const phrase = texte.slice(debut, fin === -1 ? texte.length : fin).trim()
  return phrase.length > 160 ? `${phrase.slice(0, 157)}…` : phrase
}

/**
 * Les demandes interdites trouvées dans une consigne. Liste vide : rien de
 * connu ne s'y oppose.
 */
export function verifierConsigne(consigne: string): ConstatConsigne[] {
  const normalise = normaliser(consigne)
  const constats: ConstatConsigne[] = []
  for (const { code, motif } of MOTIFS) {
    const trouve = motif.exec(normalise)
    if (trouve === null) continue
    // La position dans le texte normalisé vaut celle du texte d'origine :
    // la normalisation ne change ni le nombre de caractères, ni leur ordre
    // — sauf les espaces répétés, qui déplacent au plus de quelques signes.
    constats.push({
      code,
      extrait: extraitAutour(consigne, Math.min(trouve.index, consigne.length - 1)),
    })
  }
  return constats
}
