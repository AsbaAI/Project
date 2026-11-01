/**
 * Le jeton OAuth, gardé en mémoire du serveur et nulle part ailleurs.
 *
 * Demandé quand il manque ou qu'il est sur le point d'expirer ; une rafale
 * de lectures n'en demande qu'un. Jamais écrit en base, jamais renvoyé au
 * navigateur, jamais journalisé.
 */

/** On renouvelle un peu avant l'expiration : un jeton qui expire en vol est refusé. */
export const MARGE_RENOUVELLEMENT_MS = 60_000

/** Délai que ServiceNow donne par défaut à un jeton, si la réponse ne le dit pas. */
export const DUREE_PAR_DEFAUT_S = 1800

export interface JetonObtenu {
  jeton: string
  expireDansSecondes: number
}

export class FournisseurJeton {
  private courant: { valeur: string; expireA: number } | null = null
  private enCours: Promise<string> | null = null
  private readonly demander: () => Promise<JetonObtenu>
  private readonly maintenant: () => number

  constructor(demander: () => Promise<JetonObtenu>, maintenant: () => number) {
    this.demander = demander
    this.maintenant = maintenant
  }

  obtenir(): Promise<string> {
    if (
      this.courant !== null &&
      this.maintenant() < this.courant.expireA - MARGE_RENOUVELLEMENT_MS
    ) {
      return Promise.resolve(this.courant.valeur)
    }
    // Une demande déjà partie sert tous ceux qui attendent.
    this.enCours ??= this.demander()
      .then((obtenu) => {
        this.courant = {
          valeur: obtenu.jeton,
          expireA: this.maintenant() + obtenu.expireDansSecondes * 1000,
        }
        return obtenu.jeton
      })
      .finally(() => {
        this.enCours = null
      })
    return this.enCours
  }

  /** Le serveur a refusé ce jeton : le prochain appel en demandera un autre. */
  invalider(): void {
    this.courant = null
  }
}
