'use client'
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- le glisser-déposer est un raccourci à la souris : le contrôle de fichier natif, dans ce même libellé, reste le chemin du clavier et des lecteurs d'écran */

import { CloudUpload, File } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { type DragEvent, useRef, useState } from 'react'

import { useFieldControl } from '@/components/ui/field'
import { cn } from '@/lib/cn'

/*
 * Zone de dépôt de fichiers. Le contrôle reste un `<input type="file">`
 * natif (envoi du formulaire, clavier, lecteurs d'écran), masqué
 * visuellement : la zone qui l'entoure est son libellé, dans la langue de
 * l'interface et non dans celle du navigateur, et accepte le glisser-déposer.
 * À placer dans un `Field`, qui lui donne son identifiant et ses
 * descriptions.
 */
export interface ZoneFichiersProps {
  name: string
  accept: string
}

interface FichierChoisi {
  /** Deux fichiers peuvent porter le même nom : le rang fait partie de la clé. */
  cle: string
  nom: string
  taille: number
}

function lister(fichiers: FileList | null): FichierChoisi[] {
  return Array.from(fichiers ?? [], (f, rang) => ({
    cle: `${rang}:${f.name}`,
    nom: f.name,
    taille: f.size,
  }))
}

export function ZoneFichiers({ name, accept }: ZoneFichiersProps) {
  const t = useTranslations('communications.entree.files')
  const locale = useLocale()
  const champ = useRef<HTMLInputElement>(null)
  const controle = useFieldControl()
  const decritPar = [controle?.hintId, controle?.errorId].filter(Boolean).join(' ')
  const [choisis, setChoisis] = useState<FichierChoisi[]>([])
  const [survol, setSurvol] = useState(false)
  const taille = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'kilobyte',
    unitDisplay: 'short',
    maximumFractionDigits: 0,
  })

  const deposer = (evenement: DragEvent<HTMLLabelElement>) => {
    evenement.preventDefault()
    setSurvol(false)
    const input = champ.current
    if (input === null || evenement.dataTransfer.files.length === 0) return
    input.files = evenement.dataTransfer.files
    setChoisis(lister(input.files))
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        onDragOver={(evenement) => {
          evenement.preventDefault()
          setSurvol(true)
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={deposer}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-1.5 rounded-md border-w border-dashed border-line-control bg-surface-base px-4 py-6 text-center',
          'transition-colors-token hover:border-line-control-hover hover:bg-surface-hover',
          'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-line-accent',
          'has-aria-invalid:border-danger-solid',
          survol && 'border-line-accent bg-surface-selected',
        )}
      >
        <input
          ref={champ}
          id={controle?.controlId}
          type="file"
          name={name}
          multiple
          accept={accept}
          aria-describedby={decritPar === '' ? undefined : decritPar}
          aria-invalid={controle?.invalid || undefined}
          aria-required={controle?.required || undefined}
          className="sr-only"
          onChange={(evenement) => setChoisis(lister(evenement.currentTarget.files))}
        />
        <CloudUpload aria-hidden="true" className="size-5 text-ink-secondary" />
        <span className="text-sm font-medium text-ink-accent">{t('drop')}</span>
        <span className="text-xs text-ink-secondary">
          {choisis.length === 0 ? t('none') : t('selected', { count: choisis.length })}
        </span>
      </label>
      {choisis.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs text-ink-secondary">
          {choisis.map((fichier) => (
            <li key={fichier.cle} className="flex min-w-0 items-center gap-1.5">
              <File aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate text-ink-primary">{fichier.nom}</span>
              <span className="shrink-0 tnum">
                {taille.format(Math.ceil(fichier.taille / 1024))}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
