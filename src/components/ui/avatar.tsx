import { type ComponentProps } from 'react'

import { cn } from '@/lib/cn'

/** Внешняя оболочка: без overflow, чтобы AvatarBadge не обрезался. Задайте размер (например h-10 w-10). */
export function Avatar({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('relative inline-flex shrink-0 align-middle', className)} {...props} />
}

/** Внутренний круг — только фото/инициалы обрезаются по кругу. */
export function AvatarCircle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('h-full w-full overflow-hidden rounded-full', className)} {...props} />
  )
}

export function AvatarImage({ className, alt = '', ...props }: ComponentProps<'img'>) {
  return (
    <img
      className={cn('block h-full w-full object-cover', className)}
      alt={alt}
      {...props}
    />
  )
}

export function AvatarFallback({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600 dark:bg-[#3f3f3f] dark:text-[#d4d4d4]',
        className,
      )}
      {...props}
    />
  )
}

export function AvatarBadge({ className, children, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'absolute -bottom-0.5 -right-0.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-700 shadow-sm outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-[#1c1c1c] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:focus-visible:ring-offset-[#1c1c1c]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
