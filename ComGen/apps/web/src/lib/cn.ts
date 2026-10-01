import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/*
 * `tailwind-merge` doit connaître nos échelles et nos utilitaires maison
 * pour fusionner correctement :
 * - `text-sm` avec `text-ink-primary` (taille vs couleur) ;
 * - `border-w` avec `border-line-default` (épaisseur vs couleur) : sans
 *   déclaration, `border-w` est pris pour une couleur et supprimé.
 * Toute nouvelle `@utility` dont le nom commence comme une classe Tailwind
 * (`border-*`, `text-*`, `bg-*`…) doit être déclarée ici.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['2xs', 'xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', 'display'],
      radius: ['xs', 'sm', 'md', 'lg', 'xl', 'full'],
      shadow: ['sm', 'md', 'lg'],
    },
    classGroups: {
      'font-size': [{ text: ['2xs', 'xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', 'display'] }],
      'border-w': ['border-w', 'border-w-strong'],
      'border-w-t': ['border-t-w'],
      'border-w-b': ['border-b-w'],
      'border-w-l': ['border-l-w'],
      'border-w-r': ['border-r-w'],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
