import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { Button } from './button'

describe('Button', () => {
  it('est de type button par défaut (jamais submit par accident)', () => {
    render(<Button>Enregistrer</Button>)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toHaveAttribute('type', 'button')
  })

  it('en chargement : garde son libellé, s’annonce occupé et ignore le clic', () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Générer
      </Button>,
    )
    const bouton = screen.getByRole('button', { name: 'Générer' })
    expect(bouton).toHaveAttribute('aria-busy', 'true')
    expect(bouton).toHaveAttribute('aria-disabled', 'true')
    // Pas `disabled` : un bouton désactivé perd le focus clavier.
    expect(bouton).not.toBeDisabled()
    fireEvent.click(bouton)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('icône seule : l’icône est rendue, le libellé reste dans l’arbre d’accessibilité', () => {
    render(
      <Button iconOnly icon={<svg aria-hidden="true" data-testid="icone" />}>
        Fermer le panneau
      </Button>,
    )
    const bouton = screen.getByRole('button', { name: 'Fermer le panneau' })
    expect(bouton).toContainElement(screen.getByTestId('icone'))
    expect(screen.getByText('Fermer le panneau')).toHaveClass('visually-hidden')
  })

  it('asChild : habille le lien sans ajouter de bouton', () => {
    render(
      <Button asChild variant="primary">
        <a href="/design">Voir</a>
      </Button>,
    )
    expect(screen.queryByRole('button')).toBeNull()
    const lien = screen.getByRole('link', { name: 'Voir' })
    expect(lien).toHaveAttribute('href', '/design')
    expect(lien.className).toContain('bg-action')
  })
})
