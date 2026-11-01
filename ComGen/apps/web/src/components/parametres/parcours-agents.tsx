import {
  Bot,
  Check,
  ChevronRight,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  SquarePen,
  Users,
  Wand2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Fragment } from 'react'

import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type { AgentDecrit, EtapeAgent } from '@/server/services/agents'

/*
 * Le parcours des agents, en graphe.
 *
 * Trois colonnes — entrée, génération, contrôles — et, dans chacune, les
 * agents dans l'ordre où ils interviennent. Chaque carte est un lien vers
 * sa fiche : la sélection vit dans l'adresse, l'écran marche sans script et
 * se partage.
 *
 * Ce que la carte dit est vrai : un agent simulé le dit, un rôle non livré
 * le dit, le GARDIEN dit qu'il est du code. La couleur ne porte jamais
 * seule cette information — elle redouble un mot.
 */

const ICONES: Record<string, LucideIcon> = {
  EXTRACTEUR: ScanSearch,
  ANALYSTE_IMPACT: Users,
  SUGGESTEUR: Sparkles,
  REDACTEUR: SquarePen,
  VERIFICATEUR: Check,
  GARDIEN: ShieldCheck,
  CORRECTEUR: Wand2,
  ARBITRE: Bot,
}

const ETAPES: readonly EtapeAgent[] = ['entree', 'generation', 'controle']

export interface ParcoursAgentsProps {
  agents: readonly AgentDecrit[]
  /** Rôle ouvert dans l'inspecteur, ou `null`. */
  selection: string | null
  /** Adresse de la fiche d'un agent. */
  lien: (role: string) => string
}

export function ParcoursAgents({ agents, selection, lien }: ParcoursAgentsProps) {
  const t = useTranslations('settings.agents')

  return (
    <nav aria-label={t('legend')} className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      {ETAPES.map((etape, rang) => (
        <Fragment key={etape}>
          {rang === 0 ? null : (
            <span
              aria-hidden="true"
              className="flex shrink-0 items-center justify-center text-ink-tertiary lg:pt-10"
            >
              <ChevronRight className="size-5 rotate-90 lg:rotate-0" strokeWidth={1.6} />
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {/* L'étape porte son nom ; le rang est celui des agents (01 à 08). */}
            <h3 className="font-display text-sm font-medium tracking-tight text-ink-primary">
              {t(`etapes.${etape}`)}
            </h3>
            <ul className="flex flex-1 flex-col gap-2">
              {agents
                .filter((agent) => agent.etape === etape)
                .map((agent) => {
                  const Icone = ICONES[agent.role] ?? Bot
                  const actif = selection === agent.role
                  return (
                    <li key={agent.role}>
                      <Link
                        href={lien(agent.role)}
                        aria-current={actif ? 'true' : undefined}
                        className={cn(
                          'flex h-full items-start gap-3 rounded-md border-w p-3 no-underline transition-colors-token focus-ring',
                          actif
                            ? 'border-ai-line bg-ai-bg/40'
                            : 'border-line-default bg-surface-raised hover:border-line-strong',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-md',
                            agent.etat === 'absent'
                              ? 'bg-surface-sunken text-ink-tertiary'
                              : 'bg-ai-bg text-ai-ink',
                          )}
                        >
                          <Icone className="size-4.5" strokeWidth={1.6} />
                        </span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-2xs tracking-caps text-ink-tertiary uppercase">
                              {String(agent.rang).padStart(2, '0')}
                            </span>
                            <span className="truncate text-sm font-medium text-ink-primary">
                              {t(`roles.${agent.role}.nom` as 'roles.GARDIEN.nom')}
                            </span>
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5 *:max-w-full">
                            <Badge
                              tone={
                                agent.etat === 'simule'
                                  ? 'ai'
                                  : agent.etat === 'code'
                                    ? 'success'
                                    : 'draft'
                              }
                            >
                              {t(`etats.${agent.etat}`)}
                            </Badge>
                            {agent.version === null ? null : (
                              <Badge tone="neutral">
                                {t('consigne.version', { version: agent.version })}
                              </Badge>
                            )}
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
            </ul>
          </div>
        </Fragment>
      ))}
    </nav>
  )
}
