import { render, screen } from '@testing-library/react'

import { Field, Input, Textarea } from './field'

/*
 * Le câblage ARIA d'un champ est la partie qu'on ne voit pas et qu'on
 * casse sans s'en apercevoir. Ces tests le figent.
 */
describe('Field', () => {
  it('relie le libellé au contrôle et décrit le contrôle par l’aide', () => {
    render(
      <Field label="Objet" hint="Tel qu’il apparaîtra.">
        <Input />
      </Field>,
    )
    const input = screen.getByRole('textbox', { name: 'Objet' })
    expect(input).toHaveAccessibleDescription('Tel qu’il apparaîtra.')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toBeRequired()
  })

  it('ajoute l’erreur à la description, après l’aide, et marque le champ invalide', () => {
    render(
      <Field label="Audience" hint="Une liste par persona." error="Audience inconnue.">
        <Input />
      </Field>,
    )
    const input = screen.getByRole('textbox', { name: 'Audience' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Une liste par persona. Audience inconnue.')
  })

  it('propage obligatoire et désactivé au contrôle', () => {
    render(
      <Field label="Notes" required disabled requirementLabel="obligatoire">
        <Textarea />
      </Field>,
    )
    const zone = screen.getByRole('textbox', { name: /Notes/ })
    expect(zone).toBeRequired()
    expect(zone).toBeDisabled()
    expect(screen.getByText('obligatoire')).toBeInTheDocument()
  })

  it('laisse l’appelant choisir l’identifiant (sur le Field) et compléter la description', () => {
    render(
      <>
        <p id="externe">Contexte externe</p>
        <Field id="mon-id" label="Objet" hint="Aide">
          <Input aria-describedby="externe" />
        </Field>
      </>,
    )
    const input = screen.getByRole('textbox', { name: 'Objet' })
    expect(input).toHaveAttribute('id', 'mon-id')
    expect(input).toHaveAccessibleDescription('Contexte externe Aide')
  })

  it('reste utilisable hors de tout Field', () => {
    render(<Input aria-label="Seul" />)
    expect(screen.getByRole('textbox', { name: 'Seul' })).toBeInTheDocument()
  })
})
