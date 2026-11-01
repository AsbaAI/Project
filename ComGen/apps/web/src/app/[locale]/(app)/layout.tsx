import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import { contextePour, exigerUtilisateur } from '@/server/auth/session'
import { verifierDroit } from '@/server/auth/droits'
import { environnement } from '@/server/env'
import { statutMoteur } from '@/server/moteur'
import { lireEspaceDeTravail } from '@/server/services/espace'

/*
 * Tout ce qui est sous `(app)` exige une session. La vérification est
 * faite ici, côté serveur, avant tout rendu ; les pages ne la refont pas
 * pour l'affichage mais chaque ACTION relit l'utilisateur et ses droits.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const utilisateur = await exigerUtilisateur()
  const [moteur, espace] = await Promise.all([
    statutMoteur(),
    lireEspaceDeTravail({ utilisateur, contexte: contextePour(utilisateur) }),
  ])
  return (
    <AppShell
      utilisateur={{ nom: utilisateur.nom, courriel: utilisateur.courriel }}
      espace={espace}
      peutCreer={verifierDroit(utilisateur, 'CREER').autorise}
      demo={environnement().COMGEN_ENV === 'demo'}
      moteur={{ etat: moteur.etat, reference: moteur.reference }}
      version={process.env['COMGEN_VERSION']}
    >
      {children}
    </AppShell>
  )
}
