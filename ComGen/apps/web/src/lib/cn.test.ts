import { cn } from './cn'

/*
 * Les utilitaires maison ne doivent jamais être avalés par `tailwind-merge`
 * au motif qu'ils ressemblent à une classe Tailwind d'un autre groupe.
 */
describe('cn', () => {
  it('garde l’épaisseur de bordure à côté de sa couleur', () => {
    expect(cn('border-w border-line-default', 'bg-surface-raised')).toBe(
      'border-w border-line-default bg-surface-raised',
    )
  })

  it('garde une épaisseur directionnelle avec sa couleur', () => {
    expect(cn('border-b-w border-line-subtle')).toBe('border-b-w border-line-subtle')
  })

  it('fusionne deux épaisseurs concurrentes en gardant la dernière', () => {
    expect(cn('border-w', 'border-w-strong')).toBe('border-w-strong')
  })

  it('distingue la taille de texte de sa couleur', () => {
    expect(cn('text-sm text-ink-primary', 'text-xs')).toBe('text-ink-primary text-xs')
  })

  it('laisse la dernière classe l’emporter au sein d’un même groupe', () => {
    expect(cn('bg-surface-base', 'bg-surface-raised')).toBe('bg-surface-raised')
  })
})
