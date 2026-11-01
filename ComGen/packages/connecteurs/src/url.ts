import { ErreurItsm } from './erreurs.ts'

/**
 * Où les identifiants ont le droit de partir.
 *
 * L'adresse de l'instance est saisie par un administrateur, mais c'est elle
 * qui décide vers quel serveur le connecteur envoie ses secrets. Elle est
 * donc bornée : https, un hôte de la liste autorisée, jamais une adresse IP
 * ni un nom local — sans quoi la configuration devient un moyen de faire
 * parler le serveur à son propre réseau interne (SSRF).
 *
 * Limite assumée : on juge le NOM, pas l'adresse qu'il résout. Un nom
 * autorisé qui pointerait vers une adresse interne n'est pas détecté ici ;
 * la liste autorisée est la défense, et elle est maintenue par l'équipe.
 */
export interface PolitiqueUrl {
  /**
   * Un hôte entier (`itsm.entreprise.example`) ou, s'il commence par un
   * point, un suffixe de domaine (`.service-now.com`) qui couvre ses
   * sous-domaines mais pas le domaine nu.
   */
  hotesAutorises: readonly string[]
  /** Pour les tests contre un faux serveur. Jamais en production. */
  autoriserHttp?: boolean
  autoriserAdressesPrivees?: boolean
  autoriserPorts?: boolean
}

export const POLITIQUE_PAR_DEFAUT: PolitiqueUrl = { hotesAutorises: ['.service-now.com'] }

function refus(raison: string): never {
  // Jamais l'adresse saisie : elle peut porter un mot de passe.
  throw new ErreurItsm('CONFIG', `Adresse d'instance refusée : ${raison}`)
}

function estAdresseOuNomLocal(hote: string): boolean {
  return (
    hote.startsWith('[') ||
    hote.includes(':') ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(hote) ||
    hote === 'localhost' ||
    hote.endsWith('.localhost') ||
    hote.endsWith('.local') ||
    hote.endsWith('.internal')
  )
}

function estAutorise(hote: string, hotesAutorises: readonly string[]): boolean {
  return hotesAutorises.some((entree) => {
    const valeur = entree.toLowerCase()
    return valeur.startsWith('.')
      ? hote.endsWith(valeur) && hote.length > valeur.length
      : hote === valeur
  })
}

/** L'origine de l'instance (`https://hote`), ou une `ErreurItsm('CONFIG')`. */
export function verifierUrlInstance(
  brut: string,
  politique: PolitiqueUrl = POLITIQUE_PAR_DEFAUT,
): string {
  let url: URL
  try {
    url = new URL(brut.trim())
  } catch {
    return refus('adresse illisible')
  }

  if (
    url.protocol !== 'https:' &&
    !(politique.autoriserHttp === true && url.protocol === 'http:')
  ) {
    return refus('https est obligatoire')
  }
  if (url.username !== '' || url.password !== '') {
    return refus('des identifiants ne se glissent pas dans l’adresse')
  }
  if (url.port !== '' && politique.autoriserPorts !== true) {
    return refus('seul le port de https est admis')
  }

  const hote = url.hostname.toLowerCase()
  if (politique.autoriserAdressesPrivees !== true && estAdresseOuNomLocal(hote)) {
    return refus('une adresse IP ou un nom local n’est pas admis')
  }
  if (!estAutorise(hote, politique.hotesAutorises)) {
    return refus('cet hôte n’est pas dans la liste autorisée')
  }
  return url.origin
}
