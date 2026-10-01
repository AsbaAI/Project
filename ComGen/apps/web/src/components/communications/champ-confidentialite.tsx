'use client'

import { NIVEAUX } from '@comgen/core'
import { useTranslations } from 'next-intl'

import { Field, Select } from '@/components/ui/field'

/** Niveau de confidentialité : quatre niveaux, toujours explicite. */
export function ChampConfidentialite({
  valeurParDefaut = 'INTERNE',
  erreur,
  libelle,
  aide,
  className,
}: {
  valeurParDefaut?: string
  erreur?: string | undefined
  libelle: string
  aide?: string
  className?: string | undefined
}) {
  const t = useTranslations('communications.niveaux')
  return (
    <Field label={libelle} hint={aide} error={erreur} {...(className ? { className } : {})}>
      <Select name="confidentialite" defaultValue={valeurParDefaut}>
        {NIVEAUX.map((niveau) => (
          <option key={niveau} value={niveau}>
            {t(niveau)}
          </option>
        ))}
      </Select>
    </Field>
  )
}
