import { FileQuestion } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Panel } from '@/components/ui/panel'
import { Link } from '@/i18n/navigation'

export default function NotFound() {
  const t = useTranslations('notFound')
  return (
    <Panel flush className="mx-auto mt-8 max-w-xl">
      <EmptyState
        icon={FileQuestion}
        title={t('title')}
        description={t('description')}
        action={
          <Button asChild variant="primary">
            <Link href="/">{t('action')}</Link>
          </Button>
        }
      />
    </Panel>
  )
}
