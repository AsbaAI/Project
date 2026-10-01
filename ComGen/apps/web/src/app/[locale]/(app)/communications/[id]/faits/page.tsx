import { FileSearch, OctagonX } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { BoutonTransition } from '@/components/communications/bouton-transition'
import { CarteFait } from '@/components/communications/carte-fait'
import { EnTeteCommunication } from '@/components/communications/en-tete-communication'
import { FormulaireAjoutFait } from '@/components/communications/formulaire-ajout-fait'
import { TexteSource } from '@/components/communications/texte-source'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import { Progress } from '@/components/ui/progress'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { formaterInstant } from '@/lib/dates'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage, ou404 } from '@/server/pages'
import { fuseauDeSaisie } from '@/server/services/communications'
import { ETATS_ENTREE_OUVERTE, ETATS_FICHE_OUVERTE } from '@/server/services/etat'
import { chargerFiche } from '@/server/services/faits'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('communications.fiche')
  return { title: t('title') }
}

/*
 * Revue de la fiche de faits (§15) : fait par fait, citation en regard,
 * texte des sources à côté. Les contradictions sont en tête, bloquantes,
 * avec ce qu'il faut faire pour les trancher. La validation de la fiche
 * est en pied, avec tous ses motifs de refus.
 */
export default async function FichePage({ params }: PageProps) {
  const locale = await resolveLocale(params)
  const { id } = await params
  const t = await getTranslations('communications')
  const acteur = await acteurDePage()
  const [fiche, fuseau] = await Promise.all([
    ou404(chargerFiche(acteur, id)),
    fuseauDeSaisie(acteur),
  ])
  const { communication: c, faits, sources, contradictions, transitions, modifiable } = fiche
  const nomSource = new Map(sources.map((s) => [s.id, s.nom]))
  const revus = faits.filter((f) => f.statut !== 'PROPOSE').length
  const validation = transitions.find((tr) => tr.vers === 'PRETE_A_GENERER')
  const peutEditer = verifierDroit(acteur.utilisateur, 'EDITER').autorise

  return (
    <>
      <EnTeteCommunication id={c.id} reference={c.reference} titre={c.titre} etat={c.etat} />
      <p className="mb-4 max-w-measure text-sm text-ink-secondary">{t('fiche.description')}</p>

      {!ETATS_FICHE_OUVERTE.has(c.etat) ? (
        <Notice level="info" title={t('fiche.frozen.title')} className="mb-4">
          {t('fiche.frozen.description')}
        </Notice>
      ) : !peutEditer ? (
        <Notice level="info" title={t('fiche.readOnly')} className="mb-4" />
      ) : null}

      {faits.length === 0 ? (
        <Panel flush>
          <EmptyState
            icon={FileSearch}
            title={t('fiche.empty.title')}
            description={t('fiche.empty.description')}
            action={
              ETATS_ENTREE_OUVERTE.has(c.etat) && peutEditer ? (
                <Button asChild variant="primary">
                  <Link href={`/communications/${c.id}/entree`}>{t('fiche.empty.action')}</Link>
                </Button>
              ) : null
            }
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {contradictions.length > 0 ? (
            <Notice
              level="blocking"
              title={t('fiche.contradictions.title', { count: contradictions.length })}
            >
              <p>{t('fiche.contradictions.description')}</p>
              <ul className="mt-2 flex flex-col gap-2">
                {contradictions.map((contradiction) => (
                  <li key={contradiction.faits.map((f) => f.id).join('-')}>
                    <p className="font-medium text-ink-primary">
                      {t('fiche.contradictions.item', { enonce: contradiction.enonce })}
                    </p>
                    <ul className="list-disc pl-5">
                      {contradiction.faits.map((f) => {
                        const reference = faits.find((x) => x.id === f.id)?.reference ?? ''
                        return (
                          <li key={f.id}>
                            <a
                              href={`#fait-${reference}`}
                              className="rounded-xs text-ink-primary underline focus-ring"
                            >
                              {t('fiche.contradictions.value', {
                                valeur: f.valeur ?? '',
                                source: nomSource.get(f.sourceId) ?? '',
                                reference,
                              })}
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </Notice>
          ) : null}

          <Progress
            label={t('fiche.title')}
            valueText={t('fiche.progress', { revus, total: faits.length })}
            value={revus}
            max={faits.length}
            tone={revus === faits.length ? 'success' : 'accent'}
            className="max-w-xl"
          />

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <section aria-labelledby="titre-faits" className="flex min-w-0 flex-col gap-3">
              <h2 id="titre-faits" className="visually-hidden">
                {t('detail.facts')}
              </h2>
              {faits.map((fait) => (
                <CarteFait
                  key={fait.id}
                  fait={fait}
                  nomSource={nomSource.get(fait.sourceId) ?? ''}
                  modifiable={modifiable}
                  fuseau={fuseau}
                />
              ))}

              {modifiable ? (
                <Panel title={t('fiche.add.title')} description={t('fiche.add.description')}>
                  <FormulaireAjoutFait
                    communicationId={c.id}
                    sources={sources.map((s) => ({ id: s.id, nom: s.nom }))}
                  />
                </Panel>
              ) : null}

              {validation && peutEditer ? (
                <Panel title={t('fiche.next.title')} description={t('fiche.next.description')}>
                  <BoutonTransition
                    communicationId={c.id}
                    vers="PRETE_A_GENERER"
                    autorisee={validation.resultat.autorisee}
                    motifs={validation.resultat.autorisee ? [] : [...validation.resultat.motifs]}
                    principal
                  />
                </Panel>
              ) : null}
            </section>

            <aside
              aria-labelledby="titre-sources"
              className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-[calc(var(--layout-header-height)+1rem)] lg:max-h-[calc(100dvh-var(--layout-header-height)-2rem)] lg:overflow-y-auto"
            >
              <h2 id="titre-sources" className="text-base font-semibold text-ink-primary">
                {t('fiche.sourcePanel.title')}
              </h2>
              <p className="text-xs text-ink-secondary">{t('fiche.sourcePanel.description')}</p>
              {sources.map((source) => (
                <Panel
                  key={source.id}
                  headingLevel={3}
                  title={source.nom}
                  description={[
                    t(`typesSource.${source.type}`),
                    t(`niveaux.${source.confidentialite}`),
                    source.langue === 'fr' || source.langue === 'en'
                      ? t(`langues.${source.langue}`)
                      : t('entree.result.languageUnknown'),
                  ].join(' · ')}
                  footer={
                    <div className="flex flex-col gap-1 text-xs text-ink-secondary">
                      <p>
                        {t('fiche.sourcePanel.frozenOn', {
                          date: formaterInstant(source.figeeLe, locale, fuseau),
                        })}
                      </p>
                      <p className="flex flex-wrap gap-x-2">
                        <span>{t('fiche.sourcePanel.fingerprint')}</span>
                        <span className="font-mono break-all text-ink-tertiary">
                          {source.empreinte}
                        </span>
                      </p>
                    </div>
                  }
                >
                  {source.contenuTexte.length > 0 ? (
                    <TexteSource
                      contenu={source.contenuTexte}
                      faits={faits.filter((f) => f.sourceId === source.id)}
                    />
                  ) : (
                    <p className="flex items-center gap-2 text-sm text-ink-secondary">
                      <OctagonX aria-hidden="true" className="size-4" />
                      {t('fiche.sourcePanel.noText')}
                    </p>
                  )}
                </Panel>
              ))}
            </aside>
          </div>
        </div>
      )}
    </>
  )
}
