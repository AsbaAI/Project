/**
 * Contrôle d'origine des routes API qui écrivent.
 *
 * Les actions serveur de Next vérifient déjà que la requête vient de la
 * page ; une route API, non. Elle s'appuie sur un cookie de session : sans
 * contrôle, une page d'un autre site pourrait faire POSTer le navigateur de
 * l'utilisateur (CSRF). Le cookie `SameSite=Lax` l'empêche déjà ; ce
 * contrôle est la seconde barrière, qui ne dépend pas d'un réglage de
 * cookie qu'on pourrait un jour assouplir.
 */

/** Vrai si la requête vient de l'hôte qui la reçoit, ou d'un client hors navigateur. */
export function requeteDeMemeOrigine(entetes: Headers): boolean {
  // Derrière un mandataire, l'hôte vu par le serveur n'est pas celui du navigateur.
  const hote = entetes.get('x-forwarded-host') ?? entetes.get('host')
  if (hote === null) return false

  const origine = entetes.get('origin')
  if (origine === null) {
    // Un navigateur envoie toujours Origin sur un POST. Son absence vient
    // d'un client sans navigateur (curl, test), qui n'a aucun cookie de
    // victime à détourner — sauf si le navigateur dit lui-même que la
    // requête vient d'ailleurs.
    const site = entetes.get('sec-fetch-site')
    return site === null || site === 'same-origin' || site === 'none'
  }

  try {
    return new URL(origine).host === hote
  } catch {
    // « null » (page isolée, iframe sandboxée) ou n'importe quoi d'illisible.
    return false
  }
}
