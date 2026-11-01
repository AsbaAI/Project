/**
 * Rapprocher une audience nommée par la source d'un persona qui existe.
 *
 * L'analyste d'impact lit « les clients doivent renouveler leur clé » et
 * suggère la dimension « Clients ». Les destinataires, eux, sont des
 * personas : « Clients grands comptes », « Support client »… Cette fonction
 * dit lesquels la suggestion désigne. Elle ne décide de rien — elle éclaire
 * le choix de l'humain, qui reste seul à retenir un persona.
 *
 * Règle volontairement stricte : la dimension doit correspondre au DÉBUT du
 * nom du persona, mot pour mot (au singulier ou au pluriel près). « Clients »
 * désigne « Clients grands comptes » mais pas « Support client » : ce
 * dernier s'adresse à ceux qui soutiennent les clients. Mieux vaut une
 * suggestion qui n'allume rien qu'une fausse piste.
 */

export interface PersonaNomme {
  id: string
  nom: string
}

const MOTS_VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'd', 'l', 'un', 'une'])

/** Mots en minuscules sans accent, sans mot vide : de quoi comparer deux libellés. */
function mots(libelle: string): string[] {
  return libelle
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((mot) => mot.length > 0 && !MOTS_VIDES.has(mot))
}

/** Le même mot, au singulier ou au pluriel près (« client », « clients »). */
function memeMot(a: string, b: string): boolean {
  return a === b || a === `${b}s` || b === `${a}s`
}

/** Les personas que désigne une dimension d'audience, par leur identifiant. */
export function personasCorrespondants(
  dimension: string,
  personas: readonly PersonaNomme[],
): readonly string[] {
  const attendus = mots(dimension)
  if (attendus.length === 0) return []
  return personas
    .filter((persona) => {
      const nom = mots(persona.nom)
      return attendus.every((attendu, rang) => {
        const present = nom[rang]
        return present !== undefined && memeMot(attendu, present)
      })
    })
    .map((persona) => persona.id)
}
