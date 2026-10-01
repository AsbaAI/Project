import type { Messages } from 'next-intl'

/*
 * Clés de messages construites à partir d'un code venu du serveur (code
 * d'erreur, motif de refus, langue). Le typage de next-intl exige une clé
 * connue : ces types la décrivent, et chaque usage vérifie d'abord à
 * l'exécution (`t.has`) que le code a bien un message.
 */
type Communications = Messages['communications']

export type CodeErreurAffiche = keyof Communications['erreurs']
export type MotifAffiche = keyof Communications['motifs']
export type CodeChamp = keyof Communications['champs']
export type LangueAffichee = keyof Communications['langues']
export type CanalAffiche = keyof Communications['canaux']
export type MotifDepot = keyof Communications['entree']['motifs']
