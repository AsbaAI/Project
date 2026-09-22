import * as core from '@comgen/core'
import { describe, expect, it } from 'vitest'

import * as Enums from './generated/enums.ts'

/**
 * Les énumérations Prisma reprennent à l'identique les listes de
 * `@comgen/core` (§6) : mêmes valeurs, même ordre, et aucune énumération
 * dans un camp sans son miroir dans l'autre.
 */
const CORRESPONDANCES: Record<string, readonly string[]> = {
  Nature: core.NATURES,
  Criticite: core.CRITICITES,
  Portee: core.PORTEES,
  ModeEntree: core.MODES_ENTREE,
  TypeSource: core.TYPES_SOURCE,
  IntentionReprise: core.INTENTIONS_REPRISE,
  Niveau: core.NIVEAUX,
  TypeValeur: core.TYPES_VALEUR,
  StatutFait: core.STATUTS_FAIT,
  FormatTemplate: core.FORMATS_TEMPLATE,
  Canal: core.CANAUX,
  EtatCommunication: core.ETATS_COMMUNICATION,
  EtatVariante: core.ETATS_VARIANTE,
  Verdict: core.VERDICTS,
  TypeControle: core.TYPES_CONTROLE,
  Gravite: core.GRAVITES,
  OrigineTexte: core.ORIGINES_TEXTE,
  TypeEntite: core.TYPES_ENTITE,
  RoleMention: core.ROLES_MENTION,
  OrigineSuggestion: core.ORIGINES_SUGGESTION,
  DecisionSuggestion: core.DECISIONS_SUGGESTION,
  TypeListe: core.TYPES_LISTE,
  Regime: core.REGIMES,
  Decision: core.DECISIONS_APPROBATION,
  RoleAgent: core.ROLES_AGENT,
  RoleUtilisateur: core.ROLES_UTILISATEUR,
}

function enumerationsGenerees(): Record<string, readonly string[]> {
  const resultat: Record<string, readonly string[]> = {}
  for (const [nom, valeur] of Object.entries(Enums)) {
    if (typeof valeur === 'object' && valeur !== null) {
      resultat[nom] = Object.values(valeur as Record<string, string>)
    }
  }
  return resultat
}

describe('parité des énumérations core ↔ Prisma', () => {
  const generees = enumerationsGenerees()

  it('chaque énumération Prisma a son miroir dans core', () => {
    expect(Object.keys(generees).toSorted()).toEqual(Object.keys(CORRESPONDANCES).toSorted())
  })

  for (const [nom, attendu] of Object.entries(CORRESPONDANCES)) {
    it(`${nom} : mêmes valeurs, même ordre`, () => {
      expect(generees[nom]).toEqual([...attendu])
    })
  }
})
