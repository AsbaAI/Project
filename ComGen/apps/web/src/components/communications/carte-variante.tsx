import { Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { BoutonGenerer } from '@/components/communications/bouton-generer'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/cn'
import type { VarianteLue } from '@/server/services/generation'

/*
 * Une version, et tout ce qui permet de la juger : le texte, le rapport de
 * vérification phrase par phrase, ce qui bloque, et quels agents sont
 * passés.
 *
 * Le verdict de chaque phrase est écrit en toutes lettres à côté d'un
 * liseré coloré : la couleur redouble le mot, elle ne le remplace pas.
 */
export interface CarteVarianteProps {
  variante: VarianteLue
  peutGenerer: boolean
}

const LISERE: Record<string, string> = {
  SOUTENUE: 'border-l-success-line',
  CONTREDITE: 'border-l-danger-line',
  SANS_APPUI: 'border-l-warning-line',
  NON_FACTUELLE: 'border-l-line-default',
}

export function CarteVariante({ variante, peutGenerer }: CarteVarianteProps) {
  const t = useTranslations('generation')
  const factuelles = variante.affirmations.filter((a) => a.verdict !== 'NON_FACTUELLE')
  const soutenues = factuelles.filter((a) => a.verdict === 'SOUTENUE')
  const vide = variante.etat === 'EN_GENERATION'

  return (
    <Panel
      title={variante.personaNom}
      description={vide ? t('attente.description') : t('mots', { mots: variante.longueurMots })}
      actions={
        peutGenerer ? (
          <BoutonGenerer varianteId={variante.id} libelle={vide ? t('generer') : t('regenerer')} />
        ) : null
      }
    >
      {vide ? (
        <p className="flex items-center gap-2 text-sm text-ink-secondary">
          <Sparkles aria-hidden="true" className="size-4 text-ai-solid" />
          {t('attente.title')}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {variante.blocages.length > 0 ? (
            <Notice level="blocking" title={t('blocages.title')}>
              <p>{t('blocages.description')}</p>
              <ul className="mt-2 list-disc pl-5">
                {variante.blocages.map((blocage) => (
                  <li key={blocage.id}>{blocage.message}</li>
                ))}
              </ul>
            </Notice>
          ) : (
            <Notice level="success" title={t('conforme.title')}>
              {t('conforme.description')}
            </Notice>
          )}

          <Progress
            label={t('score')}
            valueText={t('scoreValeur', {
              soutenues: soutenues.length,
              factuelles: factuelles.length,
            })}
            value={soutenues.length}
            max={Math.max(factuelles.length, 1)}
            tone={variante.blocages.length > 0 ? 'danger' : 'success'}
          />

          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink-primary">{t('rapport')}</h3>
            <ol className="flex flex-col gap-2">
              {variante.affirmations.map((affirmation) => (
                <li
                  key={affirmation.id}
                  className={cn(
                    'rounded-sm border-l-w border-l-4 bg-surface-sunken py-2 pr-3 pl-3',
                    LISERE[affirmation.verdict] ?? 'border-l-line-default',
                  )}
                >
                  <p className="text-sm text-ink-primary">{affirmation.texte}</p>
                  <p className="mt-1 text-xs text-ink-secondary">
                    <span className="font-medium">{t(`verdict.${affirmation.verdict}`)}</span>
                    {' · '}
                    {affirmation.appuis.length > 0
                      ? t('appuis', { references: affirmation.appuis.join(', ') })
                      : t('sansAppui')}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Pas de titre sans contenu : une version importée n'a pas de
              trace d'agent, et un intitulé seul laisserait croire à un
              chargement inachevé. */}
          {variante.executions.length === 0 ? null : (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-ink-primary">{t('agents')}</h3>
              <ul className="flex flex-wrap gap-2">
                {variante.executions.map((execution) => (
                  <li
                    key={execution.id}
                    className="inline-flex items-center gap-1.5 rounded-full border-w border-ai-line bg-ai-bg px-2.5 py-1 text-xs text-ai-ink"
                  >
                    <Sparkles aria-hidden="true" className="size-3" />
                    {execution.agent}
                    <span className="text-ink-tertiary">
                      {t('duree', { ms: execution.dureeMs })}
                      {execution.simule ? ` · ${t('agentSimule')}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Panel>
  )
}
