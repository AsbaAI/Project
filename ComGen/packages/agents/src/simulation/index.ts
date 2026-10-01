/**
 * Agents simulés — la démonstration sans clé de modèle.
 *
 * Ils portent le même contrat `Agent` que les agents réels : l'appelant ne
 * change pas d'une ligne, et la trace dit toujours `simule: true`. Leur
 * sortie dérive du fichier réellement déposé, par les fonctions pures du
 * domaine — jamais d'un jeu de données écrit d'avance.
 */

export { DELAIS_SIMULATION, paliers } from './delais.ts'

export type { EntreeTexte, SortieExtracteur } from './extracteur.ts'
export { creerExtracteurSimule, schemaFaitReleve, schemaSortieExtracteur } from './extracteur.ts'

export type { SortieAnalyste } from './analyste.ts'
export { creerAnalysteSimule, schemaSortieAnalyste, schemaSuggestionAudience } from './analyste.ts'

export type { SortieSuggesteur } from './suggesteur.ts'
export { creerSuggesteurSimule, schemaSortieSuggesteur } from './suggesteur.ts'

import { creerAnalysteSimule } from './analyste.ts'
import { creerExtracteurSimule } from './extracteur.ts'
import { creerSuggesteurSimule } from './suggesteur.ts'

/** Le jeu complet, construit d'un coup : c'est ce que la fabrique assemble. */
export function agentsSimules() {
  return {
    extracteur: creerExtracteurSimule(),
    analyste: creerAnalysteSimule(),
    suggesteur: creerSuggesteurSimule(),
  }
}
