import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { EnTeteCommunication } from '@/components/communications/en-tete-communication'
import { FormulaireDepot } from '@/components/communications/formulaire-depot'
import { FormulaireTexte } from '@/components/communications/formulaire-texte'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import { resolveLocale } from '@/i18n/params'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage, ou404 } from '@/server/pages'
import { chargerCommunication } from '@/server/services/communications'
import { ETATS_ENTREE_OUVERTE } from '@/server/services/etat'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('communications.entree')
  return { title: t('title') }
}

/*
 * Entrée des sources (§10). Le mode déclaré au cadrage vient en premier ;
 * l'autre reste disponible, car une communication réelle mêle souvent un
 * texte rédigé et une pièce (un journal, une fiche).
 */
export default async function EntreePage({ params }: PageProps) {
  await resolveLocale(params)
  const { id } = await params
  const t = await getTranslations('communications.entree')
  const acteur = await acteurDePage()
  const { communication: c } = await ou404(chargerCommunication(acteur, id))
  const ouverte = ETATS_ENTREE_OUVERTE.has(c.etat)
  const peutEditer = verifierDroit(acteur.utilisateur, 'EDITER').autorise

  const fichiers = (
    <Panel key="fichiers" title={t('files.title')} description={t('files.description')}>
      <FormulaireDepot communicationId={c.id} />
    </Panel>
  )
  const texte = (
    <Panel key="texte" title={t('text.title')} description={t('text.description')}>
      <FormulaireTexte communicationId={c.id} />
    </Panel>
  )

  return (
    <>
      <EnTeteCommunication
        id={c.id}
        reference={c.reference}
        titre={c.titre}
        etat={c.etat}
        criticite={c.criticite}
      />
      <p className="mb-4 max-w-measure text-sm text-ink-secondary">{t('description')}</p>
      {!ouverte ? (
        <Notice level="info" title={t('closed.title')}>
          {t('closed.description')}
        </Notice>
      ) : !peutEditer ? (
        <Notice level="info" title={t('closed.title')}>
          {(await getTranslations('communications.fiche'))('readOnly')}
        </Notice>
      ) : (
        <div className="grid max-w-5xl gap-4 xl:grid-cols-2">
          {c.modeEntree === 'TEXTE_SAISI' ? [texte, fichiers] : [fichiers, texte]}
        </div>
      )}
    </>
  )
}
