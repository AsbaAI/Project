'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/lib/cn'

/*
 * Onglets (Radix, restylés). Soulignement de 2px sous l'onglet actif,
 * aligné sur la bordure de la liste : un seul trait, pas de fond.
 */

export const Tabs = TabsPrimitive.Root

export function TabsList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex items-end gap-1 overflow-x-auto border-b-w border-line-default',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative -mb-px h-control-lg shrink-0 rounded-t-xs px-3 text-sm font-medium whitespace-nowrap',
        'text-ink-secondary transition-colors-token hover:text-ink-primary',
        'focus-ring',
        'data-[state=active]:text-ink-primary',
        'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-action after:opacity-0 after:transition-opacity',
        'data-[state=active]:after:opacity-100',
        'disabled:cursor-not-allowed disabled:text-ink-disabled',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('pt-4 focus-visible:outline-none data-[state=active]:focus-ring', className)}
      {...props}
    />
  )
}
