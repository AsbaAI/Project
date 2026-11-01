import { Sparkles, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/cn'
import type { RoleAgentAffiche } from '@/lib/cles-messages'

/*
 * Les agents qui ont travaillé, un par pastille : son nom, sa durée, et
 * qu'il était simulé quand il l'était. Un agent qui a échoué le dit en
 * toutes lettres, avec sa raison dessous — la couleur et l'icône redoublent
 * le mot, elles ne le remplacent pas.
 */
export interface AgentAffiche {
  id: string
  agent: string
  dureeMs: number
  simule: boolean
  succes: boolean
  /** Pourquoi il a échoué ; `null` s'il a réussi. */
  raison: string | null
}

export function PucesAgents({ agents }: { agents: readonly AgentAffiche[] }) {
  const t = useTranslations('generation')
  if (agents.length === 0) return null

  const libelle = (role: string): string => {
    const cle = `roles.${role}` as `roles.${RoleAgentAffiche}`
    return t.has(cle) ? t(cle) : role
  }
  const echecs = agents.filter((agent) => !agent.succes && agent.raison !== null)

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-2">
        {agents.map((agent) => (
          <li
            key={agent.id}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border-w px-2.5 py-1 text-xs',
              agent.succes
                ? 'border-ai-line bg-ai-bg text-ai-ink'
                : 'border-danger-line bg-danger-bg text-danger-ink',
            )}
          >
            {agent.succes ? (
              <Sparkles aria-hidden="true" className="size-3" />
            ) : (
              <X aria-hidden="true" className="size-3" strokeWidth={3} />
            )}
            {libelle(agent.agent)}
            <span className={agent.succes ? 'text-ink-tertiary' : undefined}>
              {t('duree', { ms: agent.dureeMs })}
              {agent.simule ? ` · ${t('agentSimule')}` : ''}
              {agent.succes ? '' : ` · ${t('agentEchec')}`}
            </span>
          </li>
        ))}
      </ul>
      {echecs.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs text-ink-secondary">
          {echecs.map((agent) => (
            <li key={agent.id}>
              {libelle(agent.agent)} : {agent.raison}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
