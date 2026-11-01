import type { ReactNode } from 'react'

import { PageHeader } from '@/components/layout/page-header'
import { Notice } from '@/components/ui/notice'

/*
 * Écran refusé faute de droit.
 *
 * Un refus reste une page : elle garde son titre — donc son `<h1>`, son
 * fil d'Ariane et son onglet — et dit en clair ce qui manque. Renvoyer un
 * encart seul laissait une page sans titre ; lever une erreur rendait un
 * 500, qui ment sur la cause.
 */
export interface EcranRestreintProps {
  /** Titre de la page, inchangé : l'adresse reste celle qu'on a demandée. */
  titre: ReactNode
  description?: ReactNode
  /** Titre de l'encart : ce qui est refusé. */
  motifTitre: ReactNode
  /** Ce que l'on peut faire à la place. */
  motifDescription: ReactNode
}

export function EcranRestreint({
  titre,
  description,
  motifTitre,
  motifDescription,
}: EcranRestreintProps) {
  return (
    <>
      <PageHeader title={titre} {...(description === undefined ? {} : { description })} />
      <Notice level="info" title={motifTitre}>
        {motifDescription}
      </Notice>
    </>
  )
}
