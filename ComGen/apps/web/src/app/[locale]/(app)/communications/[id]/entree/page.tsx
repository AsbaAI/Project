import { Ticket } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { EnTeteCommunication } from '@/components/communications/en-tete-communication'
import { FormulaireDepot } from '@/components/communications/formulaire-depot'
import { FormulaireTexte } from '@/components/communications/formulaire-texte'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage, ou404 } from '@/server/pages'
import { chargerAvancement } from '@/server/services/assistant'
import { chargerCommunication } from '@/server/services/communications'
import { ETATS_ENTREE_OUVERTE } from '@/server/services/etat'
import { itsmDisponible, lireEtatItsm } from '@/server/services/itsm'

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
  const [{ communication: c }, avancement, etatItsm] = await Promise.all([
    ou404(chargerCommunication(acteur, id)),
    chargerAvancement(acteur, id),
    lireEtatItsm(acteur),
  ])
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

  /*
   * Troisième entrée : un ticket de l'outil ITSM. Le panneau n'apparaît
   * que si un connecteur est disponible — jamais un chemin qui mène à un
   * écran vide.
   */
  const itsm = itsmDisponible(etatItsm) ? (
    <Panel key="itsm" title={t('itsm.title')} description={t('itsm.description')}>
      <Button asChild variant="secondary" icon={<Ticket aria-hidden="true" />}>
        <Link href={`/communications/${c.id}/entree/itsm`}>{t('itsm.action')}</Link>
      </Button>
    </Panel>
  ) : null

  return (
    <>
      <EnTeteCommunication
        avancement={avancement}
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
        <div className="grid max-w-5xl items-start gap-4 xl:grid-cols-2">
          {c.modeEntree === 'CONNECTEUR' && itsm !== null
            ? [itsm, fichiers, texte]
            : c.modeEntree === 'TEXTE_SAISI'
              ? [texte, fichiers, itsm]
              : [fichiers, texte, itsm]}
        </div>
      )}
    </>
  )
}
