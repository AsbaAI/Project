'use client'

import { Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { type ReactNode, useEffect, useRef, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import type { CodeErreurAffiche } from '@/lib/cles-messages'
import { type EtapeFlux, messagesDuFlux } from '@/lib/flux-agents'

import { ChronologieAgents } from './chronologie-agents'

/*
 * Une version, et le bouton qui la génère.
 *
 * Le navigateur ne décide de rien : il appelle la route de génération, lit
 * ce qu'elle raconte (qui répond, l'état de chaque agent, la fin ou
 * l'échec) et l'affiche. Les droits, l'état de la communication et les
 * gardes de la contrainte cardinale sont ceux du service, de l'autre côté.
 *
 * Fermer la page coupe la connexion : le serveur le voit et arrête la
 * chaîne avant le prochain agent, sans rien écrire.
 */
export interface PanneauGenerationProps {
  varianteId: string
  titre: string
  description: string
  libelle: string
  peutGenerer: boolean
  children: ReactNode
}

type Phase = 'repos' | 'en_cours' | 'termine' | 'echec'

interface Lancement {
  phase: Phase
  etapes: readonly EtapeFlux[]
  mode: 'simulation' | 'reel' | null
  erreur: { code: string; detail?: string | undefined } | null
}

const REPOS: Lancement = { phase: 'repos', etapes: [], mode: null, erreur: null }

/** Ce que dit une réponse HTTP refusée avant même que le flux ne commence. */
function codeDeStatut(statut: number): string {
  if (statut === 401) return 'NON_AUTHENTIFIE'
  if (statut === 403) return 'ORIGINE_REFUSEE'
  return 'INCONNUE'
}

export function PanneauGeneration({
  varianteId,
  titre,
  description,
  libelle,
  peutGenerer,
  children,
}: PanneauGenerationProps) {
  const t = useTranslations('generation')
  const te = useTranslations('communications')
  const router = useRouter()
  const [rafraichissement, rafraichir] = useTransition()
  const [lancement, setLancement] = useState<Lancement>(REPOS)
  const controleur = useRef<AbortController | null>(null)

  // Quitter la page coupe la requête : le serveur arrête la chaîne.
  useEffect(() => () => controleur.current?.abort(), [])

  async function lancer() {
    controleur.current?.abort()
    const courant = new AbortController()
    controleur.current = courant
    setLancement({ ...REPOS, phase: 'en_cours' })

    const echouer = (code: string, detail?: string) =>
      setLancement((precedent) => ({ ...precedent, phase: 'echec', erreur: { code, detail } }))

    try {
      const reponse = await fetch(`/api/variantes/${encodeURIComponent(varianteId)}/generation`, {
        method: 'POST',
        signal: courant.signal,
      })
      if (!reponse.ok || reponse.body === null) {
        echouer(codeDeStatut(reponse.status))
        return
      }

      let conclu = false
      for await (const message of messagesDuFlux(reponse.body)) {
        if (courant.signal.aborted) return
        if (message.type === 'debut') {
          setLancement((precedent) => ({ ...precedent, mode: message.mode }))
        } else if (message.type === 'etat') {
          setLancement((precedent) => ({ ...precedent, etapes: message.etapes }))
        } else if (message.type === 'fin') {
          conclu = true
          setLancement((precedent) => ({ ...precedent, phase: 'termine' }))
          // Le texte écrit vient du serveur : on le relit, on ne le recompose pas.
          rafraichir(() => router.refresh())
        } else {
          conclu = true
          echouer(message.code, message.detail)
        }
      }
      // Un flux qui s'arrête sans dire ni « fin » ni « erreur » est une coupure :
      // on ne la présente pas comme une réussite.
      if (!conclu) echouer('INCONNUE')
    } catch {
      if (!courant.signal.aborted) echouer('INCONNUE')
    }
  }

  const enCours = lancement.phase === 'en_cours'
  const afficherChronologie =
    enCours || lancement.phase === 'echec' || (lancement.phase === 'termine' && rafraichissement)

  const erreur = lancement.erreur
  const cleErreur =
    erreur === null ? null : (`erreurs.${erreur.code}` as `erreurs.${CodeErreurAffiche}`)

  return (
    <Panel
      title={titre}
      description={description}
      actions={
        peutGenerer ? (
          <Button
            type="button"
            variant="primary"
            icon={<Sparkles aria-hidden="true" />}
            loading={enCours}
            disabled={enCours || rafraichissement}
            onClick={() => void lancer()}
          >
            {libelle}
          </Button>
        ) : null
      }
    >
      {afficherChronologie ? (
        <div className="mb-5 flex flex-col gap-3">
          {lancement.etapes.length > 0 ? (
            <ChronologieAgents etapes={lancement.etapes} mode={lancement.mode} />
          ) : null}
          {erreur === null || cleErreur === null ? null : (
            <Notice level="blocking" title={t('chronologie.echec')}>
              <p>{te.has(cleErreur) ? te(cleErreur) : te('erreurs.INCONNUE')}</p>
              {erreur.detail === undefined ? null : <p className="mt-1">{erreur.detail}</p>}
            </Notice>
          )}
        </div>
      ) : null}
      {children}
    </Panel>
  )
}
