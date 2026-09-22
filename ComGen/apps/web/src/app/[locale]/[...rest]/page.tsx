import { notFound } from 'next/navigation'

/*
 * Toute route inconnue sous une langue valide déclenche la page 404
 * traduite (`not-found.tsx` du segment `[locale]`).
 */
export default function CatchAllPage() {
  notFound()
}
