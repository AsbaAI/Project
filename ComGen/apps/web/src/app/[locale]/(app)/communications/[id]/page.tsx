import { ClipboardCheck, FileInput } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { BoutonTransition } from '@/components/communications/bouton-transition'
import { EnTeteCommunication } from '@/components/communications/en-tete-communication'
import { Panel } from '@/components/ui/panel'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { formaterInstant } from '@/lib/dates'
import { acteurDePage, ou404 } from '@/server/pages'
import { chargerCommunication, fuseauDeSaisie } from '@/server/services/communications'
import { ETATS_ENTREE_OUVERTE, ETATS_FICHE_OUVERTE } from '@/server/services/etat'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const acteur = await acteurDePage()
  const detail = await ou404(chargerCommunication(acteur, id))
  return { title: `${detail.communication.reference} · ${detail.communication.titre}` }
}

function Donnee({ terme, children }: { terme: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-ink-tertiary">{terme}</dt>
      <dd className="text-sm text-ink-primary">{children}</dd>
    </div>
  )
}

export default async function CommunicationPage({ params }: PageProps) {
  const locale = await resolveLocale(params)
  const { id } = await params
  const t = await getTranslations('communications')
  const acteur = await acteurDePage()
  const [detail, fuseau] = await Promise.all([
    ou404(chargerCommunication(acteur, id)),
    fuseauDeSaisie(acteur),
  ])
  const { communication: c, compteurs, transitions, droits } = detail
  const date = (d: Date | null) => (d ? formaterInstant(d, locale, fuseau) : t('detail.notSet'))
  const entreeOuverte = ETATS_ENTREE_OUVERTE.has(c.etat)
  const ficheOuverte = ETATS_FICHE_OUVERTE.has(c.etat)
  const versAvant = transitions.filter((tr) => tr.vers !== 'ARCHIVEE' && tr.vers !== 'BROUILLON')
  const autres = transitions.filter((tr) => tr.vers === 'ARCHIVEE' || tr.vers === 'BROUILLON')

  return (
    <>
      <EnTeteCommunication
        id={c.id}
        reference={c.reference}
        titre={c.titre}
        etat={c.etat}
        criticite={c.criticite}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          <Panel title={t('detail.steps.title')} flush>
            <ol className="divide-y divide-line-subtle">
              {[
                {
                  href: `/communications/${c.id}/entree`,
                  icone: FileInput,
                  titre: t('detail.steps.entree'),
                  description: t('detail.steps.entreeDescription'),
                  ouvert: entreeOuverte,
                  compte: `${compteurs.sources} ${t('detail.sources').toLowerCase()}`,
                },
                {
                  href: `/communications/${c.id}/faits`,
                  icone: ClipboardCheck,
                  titre: t('detail.steps.fiche'),
                  description: t('detail.steps.ficheDescription'),
                  ouvert: ficheOuverte,
                  compte: `${compteurs.faits} ${t('detail.facts').toLowerCase()} · ${compteurs.faitsAValider} ${t('detail.toReview').toLowerCase()}`,
                },
              ].map((etape) => (
                <li key={etape.href} className="flex items-start gap-3 px-4 py-3">
                  <etape.icone
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-ink-tertiary"
                    strokeWidth={1.75}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link
                      href={etape.href}
                      className="self-start rounded-xs text-sm font-medium text-ink-primary focus-ring hover:text-ink-accent"
                    >
                      {etape.titre}
                    </Link>
                    <p className="text-xs text-ink-secondary">{etape.description}</p>
                  </div>
                  <p className="shrink-0 text-xs text-ink-secondary tnum">
                    {etape.ouvert ? etape.compte : t('detail.steps.closed')}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title={t('detail.metadata')}>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              <Donnee terme={t('list.columns.nature')}>{t(`natures.${c.nature}`)}</Donnee>
              <Donnee terme={t('detail.scope')}>{t(`portees.${c.portee}`)}</Donnee>
              <Donnee terme={t('detail.language')}>
                {c.langue === 'fr' || c.langue === 'en' ? t(`langues.${c.langue}`) : c.langue}
              </Donnee>
              <Donnee terme={t('detail.mode')}>{t(`modes.${c.modeEntree}`)}</Donnee>
              <Donnee terme={t('detail.effectiveDate')}>{date(c.dateEffet)}</Donnee>
              <Donnee terme={t('detail.deadline')}>{date(c.echeance)}</Donnee>
              <Donnee terme={t('detail.author')}>{c.auteurNom}</Donnee>
              <Donnee terme={t('detail.createdOn')}>{date(c.creeLe)}</Donnee>
              <Donnee terme={t('detail.updatedOn')}>{date(c.modifieLe)}</Donnee>
              {c.parent ? (
                <Donnee terme={t('detail.parent')}>
                  <Link
                    href={`/communications/${c.parent.id}`}
                    className="rounded-xs text-ink-accent focus-ring"
                  >
                    <span className="font-mono text-xs">{c.parent.reference}</span> {c.parent.titre}
                  </Link>
                  {c.intentionReprise ? (
                    <span className="block text-xs text-ink-secondary">
                      {t(`intentions.${c.intentionReprise}`)}
                    </span>
                  ) : null}
                </Donnee>
              ) : null}
            </dl>
          </Panel>
        </div>

        <Panel
          title={t('detail.transitions.title')}
          description={t('detail.transitions.description')}
        >
          {transitions.length === 0 || !droits.editer ? (
            <p className="text-sm text-ink-secondary">{t('detail.transitions.none')}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {[...versAvant, ...autres].map((tr) => (
                <BoutonTransition
                  key={tr.vers}
                  communicationId={c.id}
                  vers={tr.vers}
                  autorisee={tr.resultat.autorisee}
                  motifs={tr.resultat.autorisee ? [] : [...tr.resultat.motifs]}
                  principal={versAvant[0]?.vers === tr.vers}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}
