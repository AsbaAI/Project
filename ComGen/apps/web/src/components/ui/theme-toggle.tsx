'use client'

import * as RadioGroup from '@radix-ui/react-radio-group'
import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useTheme } from '@/components/theme/theme-provider'
import { cn } from '@/lib/cn'
import { THEME_PREFERENCES, type ThemePreference, isThemePreference } from '@/lib/theme'

/*
 * Bascule de thème : un contrôle segmenté à trois positions, construit sur
 * un groupe radio (une seule valeur, navigation aux flèches, annoncé comme
 * tel). Le segment actif se distingue par sa surface ET son texte : la
 * couleur n'est pas le seul signal.
 */

const ICONS: Record<ThemePreference, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('theme')
  const { preference, setPreference } = useTheme()

  return (
    <RadioGroup.Root
      value={preference}
      onValueChange={(value) => {
        if (isThemePreference(value)) setPreference(value)
      }}
      aria-label={t('label')}
      orientation="horizontal"
      className={cn(
        'inline-flex h-control-md items-center gap-0.5 rounded-sm border-w border-line-default bg-surface-sunken p-0.5',
        className,
      )}
    >
      {THEME_PREFERENCES.map((value) => {
        const Icon = ICONS[value]
        return (
          <RadioGroup.Item
            key={value}
            value={value}
            aria-label={t(value)}
            className={cn(
              'inline-flex h-full min-w-7 items-center justify-center gap-1.5 rounded-xs px-1.5 text-xs font-medium',
              'text-ink-secondary transition-colors-token focus-ring',
              'hover:text-ink-primary',
              'data-[state=checked]:bg-surface-raised data-[state=checked]:text-ink-primary data-[state=checked]:shadow-sm',
            )}
          >
            <Icon aria-hidden="true" className="size-3.5" strokeWidth={2} />
            <span aria-hidden="true" className="hidden md:inline">
              {t(value)}
            </span>
          </RadioGroup.Item>
        )
      })}
    </RadioGroup.Root>
  )
}
