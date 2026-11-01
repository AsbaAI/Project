import { Ban, Check, Circle, Loader2, Sparkles, X } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { useId } from 'react'

import { cn } from '@/lib/cn'
import type { RoleAgentAffiche } from '@/lib/cles-messages'
import type { EtapeFlux } from '@/lib/flux-agents'

/*
 * Les agents au travail : un état par agent, mis à jour en direct.
 *
 * Chaque état est DIT en toutes lettres à côté de son icône — l'icône et la
 * couleur redoublent le mot, elles ne le remplacent pas. Un lecteur d'écran
 * reçoit, lui, une seule phrase à la fois (l'agent courant) plutôt que la
 * liste entière relue à chaque changement.
 *
 * Le filet de marque (dégradé) mesure l'avancement : c'est l'un des deux
 * seuls usages du dégradé, avec l'en-tête.
 *
 * Quand un agent échoue, il le dit avec sa raison, et ceux qui suivaient
 * sont « annulés » — pas « en attente » : ils ne reprendront pas seuls.
 */
export interface ChronologieAgentsProps {
  etapes: readonly EtapeFlux[]
  /** Qui répond. `null` tant que le serveur ne l'a pas encore annoncé. */
  mode: 'simulation' | 'reel' | null
}

export function ChronologieAgents({ etapes, mode }: ChronologieAgentsProps) {
  const t = useTranslations('generation')
  const format = useFormatter()
  const idTitre = useId()

  const libelleRole = (role: string): string => {
    const cle = `roles.${role}` as `roles.${RoleAgentAffiche}`
    return t.has(cle) ? t(cle) : role
  }
  const duree = (ms: number | undefined): string | null =>
    ms === undefined
      ? null
      : t('chronologie.secondes', {
          secondes: format.number(ms / 1000, { maximumFractionDigits: 1 }),
        })

  const faites = etapes.filter((etape) => etape.etat === 'TERMINEE').length
  const ratio = etapes.length === 0 ? 0 : faites / etapes.length
  // L'agent dont on parle à voix haute : celui qui travaille, sinon celui qui a échoué.
  const courante =
    etapes.find((etape) => etape.etat === 'EN_COURS') ??
    etapes.find((etape) => etape.etat === 'ECHOUEE') ??
    null

  return (
    <section
      aria-labelledby={idTitre}
      data-agents="chronologie"
      className="flex flex-col gap-3 rounded-sm border-w border-ai-line bg-ai-bg px-4 py-3"
    >
      <div className="flex flex-col gap-0.5">
        <h3 id={idTitre} className="flex items-center gap-2 text-sm font-semibold text-ai-ink">
          <Sparkles aria-hidden="true" className="size-4" />
          {t('chronologie.title')}
        </h3>
        {mode === null ? null : (
          <p className="text-xs text-ink-secondary">
            {mode === 'simulation' ? t('chronologie.simulation') : t('chronologie.reel')}
          </p>
        )}
      </div>

      <div aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-brand-gradient motion-safe:transition-[width] motion-safe:duration-slow motion-safe:ease-out"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      <output className="sr-only">
        {courante === null
          ? ''
          : `${libelleRole(courante.role)} : ${t(`chronologie.etats.${courante.etat}`)}`}
      </output>

      <ol className="flex flex-col gap-2">
        {etapes.map((etape) => (
          <li key={etape.role} className="flex items-start gap-3">
            <Pastille etat={etape.etat} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink-primary">
                {libelleRole(etape.role)}
              </span>
              <span className="block text-xs text-ink-secondary">
                {t(`chronologie.etats.${etape.etat}`)}
                {duree(etape.dureeMs) === null ? null : ` · ${duree(etape.dureeMs)}`}
              </span>
              {etape.etat === 'ECHOUEE' && etape.message !== undefined ? (
                <span className="mt-1 block text-xs text-ink-primary">{etape.message}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Pastille({ etat }: { etat: EtapeFlux['etat'] }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full',
        etat === 'EN_ATTENTE' && 'border-w border-line-default text-ink-tertiary',
        etat === 'EN_COURS' && 'border-w border-ai-line bg-ai-bg text-ai-ink',
        etat === 'TERMINEE' && 'bg-success-solid text-on-action',
        etat === 'ECHOUEE' && 'bg-danger-action text-on-danger',
        etat === 'ANNULEE' && 'border-w border-line-default text-ink-tertiary',
      )}
    >
      {etat === 'EN_ATTENTE' ? <Circle className="size-3" /> : null}
      {etat === 'EN_COURS' ? <Loader2 className="size-3.5 motion-safe:animate-spin" /> : null}
      {etat === 'TERMINEE' ? <Check className="size-3.5" strokeWidth={3} /> : null}
      {etat === 'ECHOUEE' ? <X className="size-3.5" strokeWidth={3} /> : null}
      {etat === 'ANNULEE' ? <Ban className="size-3" /> : null}
    </span>
  )
}
