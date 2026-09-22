import { CircleAlert, FileUp, X } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { resolveLocale } from '@/i18n/params'
import { cn } from '@/lib/cn'
import { COMMUNICATION_STATES, STATE_TONE } from '@/lib/state-tone'

import { TableDemo } from './demos'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('design')
  return { title: t('title') }
}

/* ------------------------------------------------------------------
 * Inventaires. Les classes sont écrites en toutes lettres : Tailwind ne
 * génère que ce qu'il lit dans les sources.
 * ------------------------------------------------------------------ */
const SURFACES = [
  ['surface-sunken', 'bg-surface-sunken'],
  ['surface-base', 'bg-surface-base'],
  ['surface-raised', 'bg-surface-raised'],
  ['surface-overlay', 'bg-surface-overlay'],
  ['surface-selected', 'bg-surface-selected'],
  ['surface-inverse', 'bg-surface-inverse'],
] as const

/*
 * `ink-disabled` n'est licite que sur un contrôle inactif (exemption WCAG
 * 1.4.3) : son spécimen est donc un vrai bouton désactivé, pas un texte.
 */
const INKS = [
  ['ink-primary', 'text-ink-primary', false],
  ['ink-secondary', 'text-ink-secondary', false],
  ['ink-tertiary', 'text-ink-tertiary', false],
  ['ink-disabled', 'text-ink-disabled', true],
  ['ink-accent', 'text-ink-accent', false],
  ['ink-link', 'text-ink-link', false],
] as const

const LINES = [
  ['line-subtle', 'border-line-subtle'],
  ['line-default', 'border-line-default'],
  ['line-control', 'border-line-control'],
  ['line-strong', 'border-line-strong'],
  ['line-accent', 'border-line-accent'],
  ['focus', 'border-focus'],
] as const

const SEMANTIC = [
  ['success', 'border-success-line bg-success-bg text-success-ink', 'bg-success-solid'],
  ['warning', 'border-warning-line bg-warning-bg text-warning-ink', 'bg-warning-solid'],
  ['danger', 'border-danger-line bg-danger-bg text-danger-ink', 'bg-danger-solid'],
  ['accent', 'border-accent-line bg-accent-bg text-ink-accent', 'bg-action'],
] as const

const TYPE_SCALE = [
  ['2xs', 'text-2xs'],
  ['xs', 'text-xs'],
  ['sm', 'text-sm'],
  ['base', 'text-base'],
  ['md', 'text-md'],
  ['lg', 'text-lg font-semibold tracking-snug'],
  ['xl', 'text-xl font-semibold tracking-snug'],
  ['2xl', 'text-2xl font-semibold tracking-tight'],
] as const

const RADII = [
  ['xs · 3', 'rounded-xs'],
  ['sm · 5', 'rounded-sm'],
  ['md · 7', 'rounded-md'],
  ['lg · 10', 'rounded-lg'],
  ['xl · 14', 'rounded-xl'],
] as const

const SPACINGS = [
  ['1 · 4', 'w-1'],
  ['2 · 8', 'w-2'],
  ['3 · 12', 'w-3'],
  ['4 · 16', 'w-4'],
  ['6 · 24', 'w-6'],
  ['8 · 32', 'w-8'],
  ['12 · 48', 'w-12'],
] as const

/* ------------------------------------------------------------------
 * Blocs de présentation propres à cette page.
 * ------------------------------------------------------------------ */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titre`} className="flex flex-col gap-6">
      <h2 id={`${id}-titre`} className="border-b-w border-line-default pb-2">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Specimen({
  title,
  intro,
  children,
  flush = false,
}: {
  title: string
  intro?: string
  children: ReactNode
  flush?: boolean
}) {
  return (
    <Panel title={title} description={intro} headingLevel={3} flush={flush}>
      {children}
    </Panel>
  )
}

function TokenName({ children }: { children: string }) {
  return <code className="shrink-0 whitespace-nowrap text-2xs text-ink-tertiary">{children}</code>
}

export default async function DesignPage({ params }: PageProps) {
  await resolveLocale(params)
  const t = await getTranslations('design')
  const tStates = await getTranslations('states')
  const tCommon = await getTranslations('common')

  const tableRows = (['r1', 'r2', 'r3'] as const).map((key, index) => {
    const state = (['ENVOYEE', 'A_CORRIGER', 'EN_APPROBATION'] as const)[index] ?? 'BROUILLON'
    return {
      id: key,
      subject: t(`table.rows.${key}.subject`),
      audience: t(`table.rows.${key}.audience`),
      stateLabel: tStates(state),
      stateTone: STATE_TONE[state],
      assertions: t(`table.rows.${key}.assertions`),
      updated: t(`table.rows.${key}.updated`),
    }
  })

  return (
    <div className="flex flex-col gap-12">
      <PageHeader title={t('title')} description={t('description')} />

      {/* ============================ FONDATIONS ============================ */}
      <Section id="fondations" title={t('sections.foundations')}>
        <Specimen title={t('colors.title')} intro={t('colors.intro')}>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-caps text-ink-tertiary">
                {t('colors.surfaces')}
              </h4>
              <ul className="grid grid-cols-3 gap-2">
                {SURFACES.map(([name, className]) => (
                  <li key={name} className="flex flex-col gap-1">
                    <div
                      className={cn('h-12 rounded-sm border-w border-line-default', className)}
                    />
                    <TokenName>{name}</TokenName>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-caps text-ink-tertiary">
                {t('colors.ink')}
              </h4>
              <ul className="grid grid-cols-3 gap-2">
                {INKS.map(([name, className, disabled]) => (
                  <li
                    key={name}
                    className="flex min-h-12 flex-col justify-between gap-1 rounded-sm border-w border-line-subtle bg-surface-base px-2 py-1"
                  >
                    {disabled ? (
                      <button
                        type="button"
                        disabled
                        className={cn('self-start text-lg font-semibold leading-none', className)}
                      >
                        Aa
                      </button>
                    ) : (
                      /* Spécimen purement visuel : le nom du jeton porte l'information. */
                      <span
                        aria-hidden="true"
                        className={cn('text-lg font-semibold leading-none', className)}
                      >
                        Aa
                      </span>
                    )}
                    <TokenName>{name}</TokenName>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-caps text-ink-tertiary">
                {t('colors.lines')}
              </h4>
              <ul className="grid grid-cols-3 gap-2">
                {LINES.map(([name, className]) => (
                  <li key={name} className="flex flex-col gap-1">
                    <div
                      className={cn('h-12 rounded-sm border-w-strong bg-surface-base', className)}
                    />
                    <TokenName>{name}</TokenName>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-caps text-ink-tertiary">
                {t('colors.semantic')}
              </h4>
              <ul className="grid grid-cols-2 gap-2">
                {SEMANTIC.map(([name, className, solid]) => (
                  <li
                    key={name}
                    className={cn(
                      'flex h-12 items-center justify-between rounded-sm border-w px-2 text-xs font-semibold',
                      className,
                    )}
                  >
                    <span>{name}</span>
                    <span aria-hidden="true" className={cn('size-3 rounded-full', solid)} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Specimen>

        <Specimen title={t('typography.title')} intro={t('typography.intro')}>
          <ul className="flex flex-col divide-y divide-line-subtle">
            {TYPE_SCALE.map(([name, className]) => (
              <li key={name} className="flex items-baseline gap-4 py-2">
                <TokenName>{`text-${name}`}</TokenName>
                <p className={cn('min-w-0 truncate text-ink-primary', className)}>
                  {t('typography.sample')}
                </p>
              </li>
            ))}
            <li className="flex items-baseline gap-4 py-2">
              <TokenName>font-mono</TokenName>
              <p className="min-w-0 truncate font-mono text-sm text-ink-primary">
                {t('typography.mono')}
              </p>
            </li>
          </ul>
        </Specimen>

        <Specimen title={t('spacing.title')} intro={t('spacing.intro')}>
          <div className="grid gap-6 md:grid-cols-2">
            <ul className="flex flex-col gap-2">
              {SPACINGS.map(([name, className]) => (
                <li key={name} className="flex items-center gap-3">
                  <span aria-hidden="true" className={cn('h-3 rounded-xs bg-action', className)} />
                  <TokenName>{name}</TokenName>
                </li>
              ))}
            </ul>
            <ul className="flex flex-wrap items-end gap-3">
              {RADII.map(([name, className]) => (
                <li key={name} className="flex flex-col items-center gap-1">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'block size-12 border-w-strong border-line-strong bg-surface-base',
                      className,
                    )}
                  />
                  <TokenName>{name}</TokenName>
                </li>
              ))}
            </ul>
          </div>
        </Specimen>
      </Section>

      {/* ============================ COMPOSANTS ============================ */}
      <Section id="composants" title={t('sections.components')}>
        <Specimen title={t('buttons.title')} intro={t('buttons.intro')}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary">{t('buttons.primary')}</Button>
              <Button variant="secondary">{t('buttons.secondary')}</Button>
              <Button variant="ghost">{t('buttons.ghost')}</Button>
              <Button variant="danger">{t('buttons.danger')}</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" loading>
                {t('buttons.loading')}
              </Button>
              <Button variant="primary" disabled>
                {t('buttons.disabled')}
              </Button>
              <Button variant="secondary" iconOnly icon={<X aria-hidden="true" />}>
                {t('buttons.iconOnly')}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-caps text-ink-tertiary">
                {t('buttons.sizes')}
              </span>
              <Button size="sm" icon={<FileUp aria-hidden="true" />}>
                {t('buttons.secondary')}
              </Button>
              <Button size="md" icon={<FileUp aria-hidden="true" />}>
                {t('buttons.secondary')}
              </Button>
              <Button size="lg" icon={<FileUp aria-hidden="true" />}>
                {t('buttons.secondary')}
              </Button>
            </div>
          </div>
        </Specimen>

        <Specimen title={t('fields.title')} intro={t('fields.intro')}>
          <form className="grid max-w-2xl gap-5 md:grid-cols-2" onSubmit={undefined}>
            <Field
              label={t('fields.subjectLabel')}
              hint={t('fields.subjectHint')}
              required
              requirementLabel={t('fields.required')}
              className="md:col-span-2"
            >
              <Input name="objet" placeholder={t('fields.subjectPlaceholder')} />
            </Field>
            <Field
              label={t('fields.audienceLabel')}
              hint={t('fields.audienceHint')}
              error={t('fields.audienceError')}
              required
              requirementLabel={t('fields.required')}
            >
              <Input name="audience" defaultValue={t('fields.audienceValue')} />
            </Field>
            <Field
              label={t('fields.notesLabel')}
              hint={t('fields.notesHint')}
              requirementLabel={t('fields.optional')}
              disabled
            >
              <Textarea name="notes" rows={2} />
            </Field>
          </form>
        </Specimen>

        <Specimen title={t('badges.title')} intro={t('badges.intro')}>
          <ul className="flex flex-wrap gap-2">
            {COMMUNICATION_STATES.map((state) => (
              <li key={state}>
                <Badge tone={STATE_TONE[state]}>{tStates(state)}</Badge>
              </li>
            ))}
          </ul>
        </Specimen>

        <Specimen title={t('notices.title')} intro={t('notices.intro')}>
          <div className="flex flex-col gap-3">
            <Notice level="info" title={t('notices.info.title')}>
              {t('notices.info.body')}
            </Notice>
            <Notice level="warning" title={t('notices.warning.title')}>
              {t('notices.warning.body')}
            </Notice>
            <Notice
              level="blocking"
              title={t('notices.blocking.title')}
              action={
                <Button variant="secondary" size="sm">
                  {t('notices.blocking.action')}
                </Button>
              }
            >
              {t('notices.blocking.body')}
            </Notice>
          </div>
        </Specimen>

        <Specimen title={t('tabs.title')} intro={t('tabs.intro')}>
          <Tabs defaultValue="facts">
            <TabsList>
              <TabsTrigger value="facts">{t('tabs.facts')}</TabsTrigger>
              <TabsTrigger value="variants">{t('tabs.variants')}</TabsTrigger>
              <TabsTrigger value="checks">{t('tabs.checks')}</TabsTrigger>
              <TabsTrigger value="history">{t('tabs.history')}</TabsTrigger>
            </TabsList>
            <TabsContent value="facts">
              <p className="text-sm text-ink-secondary">{t('tabs.factsBody')}</p>
            </TabsContent>
            <TabsContent value="variants">
              <p className="text-sm text-ink-secondary">{t('tabs.variantsBody')}</p>
            </TabsContent>
            <TabsContent value="checks">
              <p className="text-sm text-ink-secondary">{t('tabs.checksBody')}</p>
            </TabsContent>
            <TabsContent value="history">
              <p className="text-sm text-ink-secondary">{t('tabs.historyBody')}</p>
            </TabsContent>
          </Tabs>
        </Specimen>

        <Specimen title={t('table.title')} intro={t('table.intro')} flush>
          <TableDemo
            columns={{
              subject: t('table.columns.subject'),
              audience: t('table.columns.audience'),
              state: t('table.columns.state'),
              assertions: t('table.columns.assertions'),
              updated: t('table.columns.updated'),
            }}
            rows={tableRows}
          />
        </Specimen>

        <Specimen title={t('progress.title')} intro={t('progress.intro')}>
          <div className="flex max-w-md flex-col gap-4">
            <Progress
              label={t('progress.label')}
              value={2}
              max={3}
              valueText={t('progress.value', { done: 2, total: 3 })}
            />
            <Progress
              label={t('progress.label')}
              value={3}
              max={3}
              tone="success"
              valueText={t('progress.value', { done: 3, total: 3 })}
            />
          </div>
        </Specimen>
      </Section>

      {/* ========================== ÉTATS D'ÉCRAN =========================== */}
      <Section id="etats" title={t('sections.states')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title={t('screenStates.empty')} headingLevel={3} flush>
            <EmptyState
              icon={FileUp}
              headingLevel={4}
              title={t('screenStates.emptyTitle')}
              description={t('screenStates.emptyDescription')}
              action={<Button variant="primary">{t('screenStates.emptyAction')}</Button>}
            />
          </Panel>

          <Panel title={t('screenStates.loading')} headingLevel={3}>
            <div className="flex flex-col gap-3" aria-hidden="true">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-4 w-2/5" />
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-ink-secondary">
              <Spinner label={t('screenStates.loadingLabel')} />
              <span aria-hidden="true">{tCommon('loading')}</span>
            </div>
          </Panel>

          <Panel title={t('screenStates.error')} headingLevel={3} flush>
            <EmptyState
              icon={CircleAlert}
              tone="error"
              headingLevel={4}
              title={t('screenStates.errorTitle')}
              description={t('screenStates.errorDescription')}
              action={<Button variant="secondary">{tCommon('retry')}</Button>}
            />
          </Panel>

          <Panel title={t('screenStates.blocking')} headingLevel={3}>
            <Notice
              level="blocking"
              title={t('notices.blocking.title')}
              action={
                <Button variant="secondary" size="sm">
                  {t('notices.blocking.action')}
                </Button>
              }
            >
              {t('notices.blocking.body')}
            </Notice>
          </Panel>
        </div>
      </Section>
    </div>
  )
}
