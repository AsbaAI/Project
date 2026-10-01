import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import { exigerUtilisateur } from '@/server/auth/session'

/*
 * Tout ce qui est sous `(app)` exige une session. La vérification est
 * faite ici, côté serveur, avant tout rendu ; les pages ne la refont pas
 * pour l'affichage mais chaque ACTION relit l'utilisateur et ses droits.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const utilisateur = await exigerUtilisateur()
  return (
    <AppShell utilisateur={{ nom: utilisateur.nom, courriel: utilisateur.courriel }}>
      {children}
    </AppShell>
  )
}
