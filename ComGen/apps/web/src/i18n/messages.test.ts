import { describe, expect, it } from 'vitest'

import en from '../../messages/en.json'
import fr from '../../messages/fr.json'

/** Aplatit un objet de messages en une table `chemin → valeur`. */
function feuilles(objet: unknown, prefixe = ''): Map<string, string> {
  const resultat = new Map<string, string>()
  if (typeof objet === 'string') {
    resultat.set(prefixe, objet)
    return resultat
  }
  if (typeof objet === 'object' && objet !== null) {
    for (const [cle, valeur] of Object.entries(objet)) {
      const chemin = prefixe === '' ? cle : `${prefixe}.${cle}`
      for (const [k, v] of feuilles(valeur, chemin)) resultat.set(k, v)
    }
  }
  return resultat
}

/** Extrait les arguments ICU `{nom}` d'un message, triés. */
function argumentsIcu(message: string): string[] {
  return [...message.matchAll(/\{(\w+)[},]/g)].map((m) => m[1] ?? '').toSorted()
}

/*
 * §3 et §13 : aucune chaîne en dur, deux langues. Une clé présente dans une
 * langue et pas dans l'autre produirait une chaîne brute à l'écran : on
 * échoue ici plutôt que devant l'utilisateur.
 */
describe('messages fr / en', () => {
  const feuillesFr = feuilles(fr)
  const feuillesEn = feuilles(en)

  it('ont exactement les mêmes clés', () => {
    expect([...feuillesEn.keys()].toSorted()).toEqual([...feuillesFr.keys()].toSorted())
  })

  it("n'ont aucune valeur vide", () => {
    for (const [cle, valeur] of [...feuillesFr, ...feuillesEn]) {
      expect(valeur.trim(), cle).not.toBe('')
    }
  })

  it('utilisent les mêmes arguments ICU dans les deux langues', () => {
    for (const [cle, valeur] of feuillesEn) {
      expect(argumentsIcu(valeur), cle).toEqual(argumentsIcu(feuillesFr.get(cle) ?? ''))
    }
  })
})
