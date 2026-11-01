'use server'

import { coche, executer, texte } from '@/server/actions-formulaire'
import { changerActivationGabarit, installerModele } from '@/server/services/gabarits'

import type { EtatFormulaire } from '../communications/etat-formulaire'

/*
 * Gabarits. Comme ailleurs, les actions ne décident de rien : le service
 * vérifie le droit, le modèle et la région.
 */

export async function actionInstallerModele(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  return executer(formulaire, async (acteur) => {
    await installerModele(
      acteur,
      texte(formulaire, 'modele') ?? '',
      texte(formulaire, 'regionId') ?? '',
      texte(formulaire, 'intitule') ?? '',
    )
  })
}

export async function actionChangerActivationGabarit(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  return executer(formulaire, async (acteur) => {
    await changerActivationGabarit(
      acteur,
      texte(formulaire, 'gabaritId') ?? '',
      coche(formulaire, 'actif'),
    )
  })
}
