'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

function Item({
  className,
  asChild = false,
  variant = 'default',
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & {
  asChild?: boolean
  variant?: 'default' | 'outline' | 'muted'
  size?: 'default' | 'sm' | 'xs'
}) {
  const Comp = asChild ? Slot : 'div'
  return (
    <Comp
      data-slot="item"
      className={cn(
        'group/item flex w-full min-w-0 items-center gap-3 rounded-md text-sm',
        variant === 'outline' && 'border bg-background',
        variant === 'muted' && 'bg-muted/50',
        size === 'default' && 'p-4',
        size === 'sm' && 'p-3',
        size === 'xs' && 'p-2',
        className
      )}
      {...props}
    />
  )
}

function ItemGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-group"
      className={cn('flex w-full flex-col', className)}
      {...props}
    />
  )
}

function ItemMedia({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-media"
      className={cn('text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md border bg-background', className)}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-content"
      className={cn('flex min-w-0 flex-1 flex-col gap-1', className)}
      {...props}
    />
  )
}

function ItemTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-title"
      className={cn('font-medium leading-none', className)}
      {...props}
    />
  )
}

function ItemDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-description"
      className={cn('text-muted-foreground text-sm leading-relaxed', className)}
      {...props}
    />
  )
}

function ItemActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-actions"
      className={cn('flex shrink-0 items-center gap-2', className)}
      {...props}
    />
  )
}

export {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
}
