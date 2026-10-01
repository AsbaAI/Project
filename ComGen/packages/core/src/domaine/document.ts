/**
 * Lecture d'un document de variante (`Variante.contenu`, JSON ProseMirror /
 * TipTap). Fonctions pures, tolérantes à la forme : tout ce qui n'est pas un
 * nœud texte est parcouru, rien n'est interprété.
 */

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
}

/**
 * Concatène les nœuds texte d'un document, dans l'ordre, en séparant les
 * blocs par un saut de ligne pour que deux paragraphes ne se soudent pas.
 */
export function texteDuDocument(document: unknown): string {
  const morceaux: string[] = []
  const visiter = (noeud: unknown): void => {
    if (Array.isArray(noeud)) {
      for (const enfant of noeud) visiter(enfant)
      return
    }
    if (!estObjet(noeud)) return
    if (noeud['type'] === 'text' && typeof noeud['text'] === 'string') {
      morceaux.push(noeud['text'])
      return
    }
    if (noeud['type'] === 'hardBreak') {
      morceaux.push('\n')
      return
    }
    const contenu = noeud['content']
    if (Array.isArray(contenu)) {
      visiter(contenu)
      if (noeud['type'] !== 'doc') morceaux.push('\n')
    }
  }
  visiter(document)
  return morceaux.join('').replace(/\n+$/, '')
}

/** Nombre de mots : suites de lettres, chiffres ou apostrophes séparées par des blancs. */
export function compterMots(texte: string): number {
  const mots = texte.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,-]*/gu)
  return mots?.length ?? 0
}

export function compterMotsDocument(document: unknown): number {
  return compterMots(texteDuDocument(document))
}
