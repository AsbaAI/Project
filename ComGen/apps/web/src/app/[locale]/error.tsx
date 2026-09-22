'use client'

import { CircleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Panel } from '@/components/ui/panel'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/*
 * Frontière d'erreur du segment. On ne montre jamais le message brut de
 * l'exception (il peut contenir des chemins ou des données) : seulement la
 * référence d'incident (`digest`) que le journal serveur permet de
 * retrouver, et une action de reprise.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations()
  return (
    <Panel flush className="mx-auto mt-8 max-w-xl">
      <EmptyState
        icon={CircleAlert}
        tone="error"
        title={t('error.title')}
        description={
          <>
            {t('error.description')}
            {error.digest ? (
              <>
                <br />
                <span className="text-xs text-ink-tertiary">
                  {t('error.reference')} : <code>{error.digest}</code>
                </span>
              </>
            ) : null}
          </>
        }
        action={
          <Button variant="primary" onClick={reset}>
            {t('common.retry')}
          </Button>
        }
      />
    </Panel>
  )
}
