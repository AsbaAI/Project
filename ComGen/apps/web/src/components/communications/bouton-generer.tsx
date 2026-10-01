'use client'

import { Sparkles } from 'lucide-react'
import { useActionState } from 'react'

import { actionGenererVariante } from '@/app/[locale]/(app)/communications/actions'
import { ETAT_INITIAL, cleFormulaire } from '@/app/[locale]/(app)/communications/etat-formulaire'
import { Button } from '@/components/ui/button'

import { ErreurFormulaire } from './erreur-formulaire'

/*
 * Lance la génération d'une version. Un formulaire, pas un appel depuis le
 * navigateur : la décision, les droits et l'écriture restent côté serveur.
 *
 * L'erreur s'affiche ici même. Une génération refusée — une valeur écrite
 * à la main par le rédacteur, une référence inconnue — doit se lire à
 * l'endroit où on l'a demandée, pas dans un journal.
 */
export function BoutonGenerer({ varianteId, libelle }: { varianteId: string; libelle: string }) {
  const [etat, action, enCours] = useActionState(actionGenererVariante, ETAT_INITIAL)

  return (
    <form key={cleFormulaire(etat)} action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="varianteId" value={varianteId} />
      <Button
        type="submit"
        variant="primary"
        icon={<Sparkles aria-hidden="true" />}
        loading={enCours}
      >
        {libelle}
      </Button>
      <ErreurFormulaire etat={etat} />
    </form>
  )
}
