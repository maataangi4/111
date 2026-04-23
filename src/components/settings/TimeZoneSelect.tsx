import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { filterTimeZoneIdsBySearchQuery, formatTimeZoneSelectLabel } from '../../lib/timeZones'

const MENU_Z = 10050
const CHEVRON_GAP_PX = 36

type TimeZoneSelectProps = {
  value: string
  onChange: (id: string) => void
  optionIds: readonly string[]
  'aria-label': string
  id?: string
  searchPlaceholder: string
  searchEmptyLabel: string
}

export function TimeZoneSelect({
  value,
  onChange,
  optionIds,
  'aria-label': ariaLabel,
  id,
  searchPlaceholder,
  searchEmptyLabel,
}: TimeZoneSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const reduceMotion = useReducedMotion()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeOptionRef = useRef<HTMLButtonElement | null>(null)
  const wasOpenRef = useRef(false)
  const listboxId = useId()
  const [triggerWidth, setTriggerWidth] = useState(200)
  const [menuGeom, setMenuGeom] = useState<{
    top: number
    left: number
    width: number
    maxHeight: number
  } | null>(null)

  const filteredOptionIds = useMemo(
    () => filterTimeZoneIdsBySearchQuery(optionIds, query),
    [optionIds, query],
  )

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    let maxW = 0
    for (const tzId of optionIds) {
      el.textContent = formatTimeZoneSelectLabel(tzId)
      maxW = Math.max(maxW, el.offsetWidth)
    }
    const padded = Math.ceil(maxW + CHEVRON_GAP_PX)
    const capped = Math.min(
      Math.max(padded, 120),
      typeof window !== 'undefined' ? window.innerWidth - 32 : padded,
    )
    setTriggerWidth(capped)
  }, [optionIds])

  const close = useCallback(() => setOpen(false), [])

  const updatePosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth
    const space = vh - r.bottom - 12
    const listW = Math.min(vw - 24, Math.max(r.width, triggerWidth, 280))
    setMenuGeom({
      top: r.bottom + 6,
      left: Math.min(r.left, vw - listW - 12),
      width: listW,
      maxHeight: Math.min(360, Math.max(160, space)),
    })
  }, [triggerWidth])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const onScroll = () => updatePosition()
    window.addEventListener('resize', onScroll)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setQuery('')
      const idx = optionIds.indexOf(value)
      setHighlightedIndex(idx >= 0 ? idx : 0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
    if (!open && wasOpenRef.current) {
      setQuery('')
    }
    wasOpenRef.current = open
  }, [open, optionIds, value])

  useLayoutEffect(() => {
    if (!open) return
    activeOptionRef.current?.scrollIntoView({ block: 'nearest' })
  }, [open, highlightedIndex, filteredOptionIds.length])

  useEffect(() => {
    setHighlightedIndex((hi) => {
      const max = Math.max(0, filteredOptionIds.length - 1)
      return Math.min(hi, max)
    })
  }, [filteredOptionIds.length])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: PointerEvent) => {
      const node = e.target as Node
      if (triggerRef.current?.contains(node)) return
      if (menuRef.current?.contains(node)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        return
      }
      const inMenu =
        menuRef.current?.contains(document.activeElement as Node) ||
        document.activeElement === inputRef.current
      if (!inMenu) return
      const len = filteredOptionIds.length
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (len === 0) return
        setHighlightedIndex((i) => Math.min(i + 1, len - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (len === 0) return
        setHighlightedIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' && !e.repeat) {
        const pick = filteredOptionIds[highlightedIndex]
        if (pick) {
          e.preventDefault()
          onChange(pick)
          close()
        }
      }
    }
    document.addEventListener('pointerdown', onDoc, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close, filteredOptionIds, highlightedIndex, onChange])

  const menuTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const }

  const chipText = formatTimeZoneSelectLabel(value)

  const activeDescendantId =
    open && filteredOptionIds.length > 0 ? `${listboxId}-opt-${highlightedIndex}` : undefined

  const menu =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence
            onExitComplete={() => {
              setMenuGeom(null)
            }}
          >
            {open && menuGeom ? (
              <motion.div
                key="tz-select-menu"
                ref={menuRef}
                role="presentation"
                initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                transition={menuTransition}
                className={cn(
                  'overflow-hidden rounded-2xl border border-white/[0.06] py-1',
                  'bg-[#161616] text-[#e8e8e8] shadow-[0_20px_50px_rgba(0,0,0,0.55)]',
                )}
                style={{
                  position: 'fixed',
                  top: menuGeom.top,
                  left: menuGeom.left,
                  width: menuGeom.width,
                  maxHeight: menuGeom.maxHeight,
                  zIndex: MENU_Z,
                  transformOrigin: 'top center',
                }}
              >
                <div className="border-b border-white/[0.06] px-2 pb-2 pt-1.5">
                  <input
                    ref={inputRef}
                    type="search"
                    autoComplete="off"
                    spellCheck={false}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setHighlightedIndex(0)
                    }}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    aria-controls={listboxId}
                    aria-activedescendant={activeDescendantId}
                    role="combobox"
                    aria-expanded
                    className={cn(
                      'w-full rounded-xl border border-white/[0.08] bg-[#1f1f1f] px-3 py-2 text-sm',
                      'text-[#f1f1f1] outline-none placeholder:text-[#7a7a7a]',
                      'focus-visible:border-emerald-500/40 focus-visible:ring-2 focus-visible:ring-emerald-500/25',
                    )}
                  />
                </div>
                <div
                  id={listboxId}
                  role="listbox"
                  aria-label={ariaLabel}
                  className="max-h-[min(280px,calc(100%-3.5rem))] overflow-y-auto overscroll-contain p-1 scrollbar-modern-dark"
                >
                  {filteredOptionIds.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-[#8c8c8c]">{searchEmptyLabel}</p>
                  ) : (
                    filteredOptionIds.map((tzId, i) => {
                      const selected = tzId === value
                      const highlighted = i === highlightedIndex
                      const label = formatTimeZoneSelectLabel(tzId)
                      const optId = `${listboxId}-opt-${i}`
                      return (
                        <button
                          key={tzId}
                          id={optId}
                          ref={highlighted ? activeOptionRef : undefined}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={cn(
                            'flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors',
                            selected
                              ? 'bg-white/[0.1] font-medium text-white'
                              : 'text-[#c4c4c4] hover:bg-white/[0.06] hover:text-[#f1f1f1]',
                            highlighted && !selected && 'bg-white/[0.05]',
                          )}
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setHighlightedIndex(i)}
                          onClick={() => {
                            onChange(tzId)
                            close()
                          }}
                        >
                          {label}
                        </button>
                      )
                    })
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null

  return (
    <div className="relative mt-5 block w-max max-w-full">
      <span
        ref={measureRef}
        aria-hidden
        className={cn(
          'pointer-events-none absolute left-[-9999px] top-0 z-0 whitespace-nowrap',
          'text-sm font-normal text-gray-900 dark:text-[#f1f1f1]',
        )}
      />
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ width: triggerWidth, maxWidth: '100%' }}
        className={cn(
          'flex max-w-full items-center justify-between gap-2 rounded-full border-0',
          'bg-gray-100 px-3.5 py-2 text-left text-sm font-normal text-gray-900 outline-none transition',
          'hover:bg-gray-200/90',
          'focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f1f1f1]',
          'dark:bg-[#252525] dark:text-[#f1f1f1] dark:hover:bg-[#2e2e2e]',
          'dark:focus-visible:ring-offset-[#181818]',
          open && 'dark:bg-[#2a2a2a]',
        )}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
      >
        <span className="min-w-0 flex-1 truncate">{chipText}</span>
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
            className="h-3.5 w-3.5 text-gray-500 dark:text-[#8c8c8c]"
            strokeWidth={2}
            aria-hidden
          />
        </motion.span>
      </button>
      {menu}
    </div>
  )
}
