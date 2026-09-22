import type fr from '../../messages/fr.json'
import type { Locale as LocaleApp } from '../i18n/routing'

/**
 * Typage des messages : `useTranslations('x')('y')` refuse à la
 * compilation une clé absente de `messages/fr.json`. Le fichier français
 * est la référence ; `en.json` doit avoir exactement les mêmes clés
 * (vérifié par `src/i18n/messages.test.ts`).
 */
declare module 'next-intl' {
  interface AppConfig {
    Locale: LocaleApp
    Messages: typeof fr
  }
}
