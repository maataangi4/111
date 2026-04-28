import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { type LucideIcon, ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

export type SoftSelectOption<T extends string = string> = { value: T; label: string }

type SoftSelectProps<T extends string> = {
  value: T
  onChange: (next: T) => void
  options: SoftSelectOption<T>[]
  /** Text shown on the closed trigger */
  chipText: string
  icon?: LucideIcon
  ariaLabel: string
  className?: string
  variant?: 'pill' | 'field' | 'compact'
  disabled?: boolean
  triggerClassName?: string
  /** Amber border (e.g. required reason not chosen) */
  warning?: boolean
  /** Clases en el texto del chip (p. ej. placeholder gris). */
  chipClassName?: string
  /** Sin borde en el trigger ni en el panel (p. ej. filtros en Cultivo). */
  borderless?: boolean
}

const MENU_Z = 10050

export function SoftSelect<T extends string>({
  value,
  onChange,
  options,
  chipText,
  icon: Icon,
  ariaLabel,
  className,
  variant = 'pill',
  disabled = false,
  triggerClassName,
  warning = false,
  chipClassName,
  borderless = false,
}: SoftSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuGeom, setMenuGeom] = useState<{
    top: number
    left: number
    width: number
    maxHeight: number
  } | null>(null)

  const close = useCallback(() => setOpen(false), [])

  const updatePosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    const space = vh - r.bottom - 12
    setMenuGeom({
      top: r.bottom + 6,
      left: r.left,
      width: r.width,
      maxHeight: Math.min(280, Math.max(96, space)),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open || disabled) return
    updatePosition()
    const onScroll = () => updatePosition()
    window.addEventListener('resize', onScroll)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [open, disabled, updatePosition])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: PointerEvent) => {
      const node = e.target as Node
      if (triggerRef.current?.contains(node)) return
      if (menuRef.current?.contains(node)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onDoc, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const triggerDark = borderless && !warning
    ? 'dark:bg-[#252525] dark:text-[#f1f1f1] dark:hover:bg-[#2a2a2a]'
    : 'dark:border-[#3d3d3d] dark:bg-[#252525] dark:text-[#f1f1f1] dark:hover:border-[#4a4a4a] dark:hover:bg-[#2a2a2a]'

  const triggerBase =
    variant === 'pill'
      ? borderless && !warning
        ? cn(
            'inline-flex max-w-[min(100vw-2rem,15rem)] items-center justify-between gap-1.5 rounded-full border-0 bg-white py-2 pl-2.5 pr-2 text-sm font-medium text-gray-800 shadow-sm',
            'transition-colors hover:bg-gray-50/80',
            triggerDark,
          )
        : cn(
            'inline-flex max-w-[min(100vw-2rem,15rem)] items-center justify-between gap-1.5 rounded-full border bg-white py-2 pl-2.5 pr-2 text-sm font-medium text-gray-800 shadow-sm',
            warning ? 'border-amber-300/90' : 'border-gray-200',
            'transition-colors hover:border-gray-300 hover:bg-gray-50/80',
            triggerDark,
          )
      : variant === 'compact'
        ? borderless && !warning
          ? cn(
              'inline-flex min-w-0 max-w-full items-center justify-between gap-1 rounded-lg border-0 bg-white px-2 py-1 text-xs font-medium text-gray-800',
              'hover:bg-gray-50/80',
              triggerDark,
            )
          : cn(
              'inline-flex min-w-0 max-w-full items-center justify-between gap-1 rounded-lg border bg-white px-2 py-1 text-xs font-medium text-gray-800',
              warning ? 'border-amber-300/90' : 'border-gray-200',
              'hover:border-gray-300 hover:bg-gray-50/80',
              triggerDark,
            )
        : borderless && !warning
          ? cn(
              'flex w-full min-h-[42px] items-center justify-between gap-2 rounded-xl border-0 bg-white px-3 py-2 text-left text-sm font-normal text-gray-800',
              'hover:bg-gray-50/50',
              triggerDark,
            )
          : cn(
              'flex w-full min-h-[42px] items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm font-normal text-gray-800',
              warning ? 'border-amber-300/80' : 'border-gray-200',
              'hover:border-gray-300 hover:bg-gray-50/50',
              triggerDark,
            )

  const menuTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }

  const menu =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence
            onExitComplete={() => {
              setMenuGeom(null)
            }}
          >
            {open && menuGeom && !disabled ? (
              <motion.div
                key="soft-select-menu"
                ref={menuRef}
                role="listbox"
                initial={reduceMotion ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
                transition={menuTransition}
                className={cn(
                  'overflow-hidden rounded-2xl py-1 backdrop-blur-xl backdrop-saturate-150',
                  borderless && !warning
                    ? cn(
                        'border-0 bg-white/72 shadow-[0_16px_48px_rgba(0,0,0,0.12)] ring-0',
                        'dark:bg-[#1c1c1c]/70 dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)]',
                      )
                    : cn(
                        'border border-gray-200/70 bg-white/72 shadow-[0_16px_48px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.05]',
                        'dark:border-white/[0.08] dark:bg-[#1c1c1c]/78 dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] dark:ring-white/[0.06]',
                      ),
                )}
                style={{
                  position: 'fixed',
                  top: menuGeom.top,
                  left: menuGeom.left,
                  minWidth: menuGeom.width,
                  maxWidth: 'min(calc(100vw - 16px), 22rem)',
                  maxHeight: menuGeom.maxHeight,
                  zIndex: MENU_Z,
                  transformOrigin: 'top center',
                }}
              >
                <div className="scrollbar-modern scrollbar-modern-dark max-h-[inherit] overflow-y-auto overscroll-contain p-1">
                  {options.map((opt, i) => {
                    const selected = opt.value === value
                    const optKey = `${String(opt.value)}-${i}-${opt.label.slice(0, 24)}`
                    return (
                      <button
                        key={optKey}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={cn(
                          'flex w-full items-start rounded-xl px-3 py-2.5 text-left text-sm leading-snug transition-colors whitespace-normal break-words',
                          selected
                            ? 'bg-green-50/90 font-medium text-green-900 dark:bg-white/[0.08] dark:text-[#f1f1f1]'
                            : 'text-gray-700 hover:bg-gray-100/80 dark:text-[#d4d4d4] dark:hover:bg-white/[0.06]',
                        )}
                        onClick={() => {
                          onChange(opt.value)
                          close()
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null

  return (
    <>
      <div
        className={cn(
          variant === 'pill' ? 'relative inline-flex max-w-full' : 'relative w-full',
          className,
        )}
      >
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={cn(
            triggerBase,
            'focus:outline-none',
            !open &&
              'focus-visible:ring-2 focus-visible:ring-green-500/35 focus-visible:ring-offset-2',
            open &&
              cn(
                'focus-visible:ring-0 focus-visible:ring-offset-0',
                !warning &&
                  !borderless &&
                  cn(
                    'border-gray-200 bg-white hover:border-gray-200 hover:bg-white',
                    'dark:border-[#3d3d3d] dark:bg-[#252525] dark:hover:border-[#3d3d3d] dark:hover:bg-[#252525]',
                  ),
                !warning &&
                  borderless &&
                  cn('bg-white hover:bg-white dark:bg-[#252525] dark:hover:bg-[#252525]'),
              ),
            disabled && 'cursor-not-allowed opacity-50',
            triggerClassName,
          )}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span
            className={cn(
              'inline-flex min-w-0 items-center gap-1.5',
              variant === 'field' && 'flex-1',
            )}
          >
            {Icon ? (
              <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-[#9a9a9a]" aria-hidden />
            ) : null}
            <span
              className={cn(
                'truncate',
                variant === 'field' && 'text-left',
                chipClassName,
              )}
            >
              {chipText}
            </span>
          </span>
          <motion.span
            className="inline-flex shrink-0"
            aria-hidden
            initial={false}
            animate={{ rotate: open ? 180 : 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
            }
            style={{ transformOrigin: '50% 50%' }}
          >
            <ChevronDown
              className={cn(
                'text-gray-400 dark:text-[#8c8c8c]',
                variant === 'compact' ? 'h-3 w-3' : 'h-3.5 w-3.5',
              )}
              aria-hidden
            />
          </motion.span>
        </button>
      </div>
      {menu}
    </>
  )
}
