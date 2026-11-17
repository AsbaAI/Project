import { describe, expect, it } from 'vitest'

import { formaterResume, LONGUEUR_MAX_VALEUR, resumerChangement, VALEUR_MASQUEE } from './audit.ts'

describe('resumerChangement', () => {
  it('ne retient que les champs qui ont bougé', () => {
    const changements = resumerChangement(
      { nom: 'Exploitation', actif: true },
      { nom: 'Exploitation EMEA', actif: true },
    )
    expect(changements).toEqual([
      { champ: 'nom', avant: 'Exploitation', apres: 'Exploitation EMEA' },
    ])
  })

  it('n’examine que les champs soumis par l’appelant', () => {
    const changements = resumerChangement({ nom: 'a', interne: 'secret-métier' }, { nom: 'b' })
    expect(changements.map((c) => c.champ)).toEqual(['nom'])
  })

  it('signale une absence sans la confondre avec une chaîne vide', () => {
    expect(resumerChangement({}, { note: '' })).toEqual([{ champ: 'note', avant: '∅', apres: '' }])
  })

  it('rend les valeurs structurées de façon stable', () => {
    const changements = resumerChangement(
      { destinataires: ['a@x.fr'] },
      { destinataires: ['a@x.fr', 'b@x.fr'] },
    )
    expect(changements[0]).toEqual({
      champ: 'destinataires',
      avant: '["a@x.fr"]',
      apres: '["a@x.fr","b@x.fr"]',
    })
  })

  it('coupe une valeur trop longue', () => {
    const longue = 'x'.repeat(LONGUEUR_MAX_VALEUR + 50)
    const [changement] = resumerChangement({ consigne: '' }, { consigne: longue })
    expect(changement?.apres).toHaveLength(LONGUEUR_MAX_VALEUR)
    expect(changement?.apres.endsWith('…')).toBe(true)
  })

  it.each([
    'motDePasse',
    'mot_de_passe',
    'password',
    'secretClient',
    'jetonApi',
    'cleApi',
    'apiKey',
    'authorization',
    'identifiantClient',
  ])('ne laisse jamais sortir la valeur du champ %s', (champ) => {
    const changements = resumerChangement(
      { [champ]: 'ancien-secret' },
      { [champ]: 'sk-ant-vraie-cle' },
    )
    expect(changements).toEqual([{ champ, avant: VALEUR_MASQUEE, apres: VALEUR_MASQUEE }])
    expect(JSON.stringify(changements)).not.toContain('sk-ant')
  })

  it('signale quand même qu’un secret a changé', () => {
    expect(resumerChangement({ jeton: 'a' }, { jeton: 'b' })).toHaveLength(1)
    expect(resumerChangement({ jeton: 'a' }, { jeton: 'a' })).toHaveLength(0)
  })
})

describe('formaterResume', () => {
  it('rend une ligne lisible', () => {
    expect(
      formaterResume([
        { champ: 'nom', avant: 'a', apres: 'b' },
        { champ: 'actif', avant: 'true', apres: 'false' },
      ]),
    ).toBe('nom : a → b ; actif : true → false')
  })

  it('rend une chaîne vide quand rien n’a bougé', () => {
    expect(formaterResume([])).toBe('')
  })
})
