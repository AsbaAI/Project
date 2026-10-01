'use client'

import { CircleCheck, OctagonX, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionDeposerFichiers } from '@/app/[locale]/(app)/communications/actions'
import { ETAT_INITIAL } from '@/app/[locale]/(app)/communications/etat-formulaire'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Notice } from '@/components/ui/notice'
import { Link } from '@/i18n/navigation'
import type { LangueAffichee } from '@/lib/cles-messages'

import { ChampConfidentialite } from './champ-confidentialite'
import { ErreurFormulaire, useErreurDeChamp } from './erreur-formulaire'
import { ZoneFichiers } from './zone-fichiers'

/*
 * Dépôt de fichiers (§10, mode FICHIER). Le résultat est rendu fichier par
 * fichier : déposé avec le nombre de faits relevés, ou refusé avec sa
 * raison. Une analyse antivirale absente est dite, pas tue.
 */
const FORMATS_ACCEPTES =
  '.docx,.pdf,.xlsx,.csv,.md,.markdown,.txt,.pptx,.eml,.msg,.png,.jpg,.jpeg,.tif,.tiff,.webp'

export function FormulaireDepot({ communicationId }: { communicationId: string }) {
  const t = useTranslations('communications')
  const [etat, action, enCours] = useActionState(actionDeposerFichiers, ETAT_INITIAL)
  const erreur = useErreurDeChamp(etat)
  const depot = etat.statut === 'depot' ? etat.depot : null
  const deposes = depot?.fichiers.filter((f) => f.statut === 'DEPOSE').length ?? 0
  // Deux fichiers d'un même dépôt peuvent porter le même nom : le rang
  // dans le dépôt fait partie de la clé.
  const lignes = depot?.fichiers.map((fichier, rang) => ({
    fichier,
    cle: `${rang}:${fichier.nom}`,
  }))
  const libelleLangue = (langue: string) => {
    const cle = `langues.${langue}` as `langues.${LangueAffichee}`
    return t.has(cle) ? t(cle) : langue
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="communicationId" value={communicationId} />
        <ErreurFormulaire etat={etat} />
        <Field
          label={t('entree.files.label')}
          hint={t('entree.files.hint')}
          error={erreur('fichiers')}
          required
        >
          {/* Remontée à chaque réponse : React vide le formulaire après l'action. */}
          <ZoneFichiers
            key={etat.statut === 'repos' ? 0 : etat.jeton}
            name="fichiers"
            accept={FORMATS_ACCEPTES}
          />
        </Field>
        <ChampConfidentialite
          libelle={t('entree.confidentiality.label')}
          aide={t('entree.confidentiality.hint')}
          erreur={erreur('confidentialite')}
          className="sm:max-w-xs"
        />
        <div>
          <Button
            type="submit"
            variant="primary"
            loading={enCours}
            icon={<Upload aria-hidden="true" />}
          >
            {t('entree.files.submit')}
          </Button>
        </div>
      </form>

      {/* Région vivante présente avant le résultat, pour qu'il soit annoncé. */}
      <div aria-live="polite">
        {depot && lignes ? (
          <section aria-labelledby="resultat-depot" className="flex flex-col gap-3">
            <h3 id="resultat-depot" className="text-sm font-semibold text-ink-primary">
              {t('entree.result.title')}
            </h3>
            {depot.analyseAntivirale === 'aucun' ? (
              <Notice level="warning" title={t('entree.antivirusOff.title')}>
                {t('entree.antivirusOff.description')}
              </Notice>
            ) : null}
            <ul className="flex flex-col divide-y divide-line-subtle rounded-sm border-w border-line-subtle">
              {lignes.map(({ fichier, cle }) => (
                <li key={cle} className="flex items-start gap-2.5 px-3 py-2.5 text-sm">
                  {fichier.statut === 'DEPOSE' ? (
                    <CircleCheck
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-success-ink"
                    />
                  ) : (
                    <OctagonX
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-danger-ink"
                    />
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="break-all font-medium text-ink-primary">
                      {fichier.nom}{' '}
                      <span className="font-regular text-ink-secondary">
                        —{' '}
                        {fichier.statut === 'DEPOSE'
                          ? t('entree.result.accepted')
                          : t('entree.result.refused')}
                      </span>
                    </p>
                    <p className="text-xs text-ink-secondary">
                      {fichier.statut === 'DEPOSE'
                        ? [
                            t('entree.result.deposited', { count: fichier.faitsProposes }),
                            fichier.langue
                              ? t('entree.result.languageDetected', {
                                  langue: libelleLangue(fichier.langue),
                                })
                              : t('entree.result.languageUnknown'),
                          ].join(' · ')
                        : t(`entree.motifs.${fichier.motif}`, {
                            detail: fichier.detail ?? '',
                          })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {deposes > 0 ? (
              <div>
                <Button asChild variant="secondary">
                  <Link href={`/communications/${communicationId}/faits`}>
                    {t('entree.result.toFacts')}
                  </Link>
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  )
}
