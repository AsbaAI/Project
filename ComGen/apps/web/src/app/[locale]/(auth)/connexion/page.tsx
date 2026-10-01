import { type CompteSimulable, listerComptesSimulables } from '@comgen/db'
import { KeyRound, LogIn } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { Field, Select } from '@/components/ui/field'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import { redirect } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { connecterOidc, connecterSimulateur } from '@/server/auth/actions'
import { fournisseursDisponibles } from '@/server/auth/config'
import { utilisateurCourant } from '@/server/auth/session'
import { connexion } from '@/server/donnees/connexion'
import { environnement } from '@/server/env'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ erreur?: string | string[]; error?: string | string[] }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth')
  return { title: t('signIn.title') }
}

/** Codes d'erreur affichables ; tout autre code donne le message générique (rien de sensible ne transite). */
const ERREURS_CONNUES = new Set(['compte-inconnu'])

function codeErreur(brut: string | string[] | undefined): 'compte-inconnu' | 'generique' | null {
  if (brut === undefined) return null
  const valeur = Array.isArray(brut) ? brut[0] : brut
  if (valeur === undefined || valeur === '') return null
  return ERREURS_CONNUES.has(valeur) ? 'compte-inconnu' : 'generique'
}

function grouperParOrganisation(comptes: readonly CompteSimulable[]) {
  const groupes = new Map<string, CompteSimulable[]>()
  for (const compte of comptes) {
    const liste = groupes.get(compte.organisationNom) ?? []
    liste.push(compte)
    groupes.set(compte.organisationNom, liste)
  }
  return [...groupes.entries()]
}

/*
 * Écran de connexion. Il n'affiche que les moyens de connexion réellement
 * configurés : un bouton SSO si un fournisseur OIDC est déclaré, le choix
 * d'un compte de démonstration si le simulateur est actif hors production.
 * Aucun des deux : l'écran le dit, plutôt que de montrer un formulaire
 * qui ne peut pas aboutir.
 */
export default async function ConnexionPage({ params, searchParams }: PageProps) {
  const locale = await resolveLocale(params)
  if (await utilisateurCourant()) redirect({ href: '/', locale })

  const t = await getTranslations('auth')
  const tRoles = await getTranslations('roles')
  const env = environnement()
  const fournisseurs = fournisseursDisponibles(env)
  const comptes = fournisseurs.simulateur ? await listerComptesSimulables(connexion()) : []
  const recherche = await searchParams
  const erreur = codeErreur(recherche.erreur ?? recherche.error)

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-ink-primary">{t('signIn.title')}</h1>
        <p className="text-sm text-ink-secondary">{t('signIn.description')}</p>
      </div>

      {erreur ? (
        <Notice level="blocking" title={t(`signIn.errors.${erreur}.title`)}>
          {t(`signIn.errors.${erreur}.description`)}
        </Notice>
      ) : null}

      {fournisseurs.oidc ? (
        <Panel title={t('signIn.oidc.title')} description={t('signIn.oidc.description')}>
          <form action={connecterOidc}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="primary" icon={<KeyRound aria-hidden="true" />}>
              {t('signIn.oidc.submit')}
            </Button>
          </form>
        </Panel>
      ) : null}

      {fournisseurs.simulateur ? (
        <Panel
          title={t('signIn.simulator.title')}
          description={
            env.COMGEN_ENV === 'demo'
              ? t('signIn.simulator.descriptionDemo')
              : t('signIn.simulator.description')
          }
        >
          <form action={connecterSimulateur} className="flex flex-col gap-4">
            <input type="hidden" name="locale" value={locale} />
            <Field label={t('signIn.simulator.account')} hint={t('signIn.simulator.hint')} required>
              <Select name="courriel" defaultValue={comptes[0]?.courriel}>
                {grouperParOrganisation(comptes).map(([organisation, membres]) => (
                  <optgroup key={organisation} label={organisation}>
                    {membres.map((compte) => (
                      <option key={compte.id} value={compte.courriel}>
                        {compte.nom} — {compte.roles.map((role) => tRoles(role)).join(', ')}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <div>
              <Button
                type="submit"
                variant={fournisseurs.oidc ? 'secondary' : 'primary'}
                icon={<LogIn aria-hidden="true" />}
                disabled={comptes.length === 0}
              >
                {t('signIn.simulator.submit')}
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      {!fournisseurs.oidc && !fournisseurs.simulateur ? (
        <Notice level="warning" title={t('signIn.none.title')}>
          {t('signIn.none.description')}
        </Notice>
      ) : null}
    </div>
  )
}
