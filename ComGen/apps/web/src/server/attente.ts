/**
 * Attente de la simulation.
 *
 * Un agent simulé qui répond instantanément ne se voit pas travailler : la
 * chronologie clignote et personne ne comprend qu'il s'est passé quelque
 * chose. Les agents marquent donc des paliers, mais n'attendent jamais
 * eux-mêmes — c'est l'appelant qui fournit `attendre`, ici, au bord du
 * serveur. Les tests n'en fournissent pas et ne perdent aucune seconde.
 *
 * L'attente se laisse interrompre : quand le navigateur ferme la page, le
 * signal part et la chaîne s'arrête au lieu de finir un travail que
 * personne ne regarde.
 */
export function attente(signal?: AbortSignal): (ms: number) => Promise<void> {
  return (ms) =>
    new Promise<void>((resolve) => {
      if (signal?.aborted === true) {
        resolve()
        return
      }
      const fin = () => {
        clearTimeout(minuteur)
        signal?.removeEventListener('abort', fin)
        resolve()
      }
      const minuteur = setTimeout(fin, ms)
      signal?.addEventListener('abort', fin, { once: true })
    })
}
