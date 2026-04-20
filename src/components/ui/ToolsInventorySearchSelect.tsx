import { ChevronDown, Search } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ToolCategory } from '../../store/toolsTypes'
import { useToolsStore } from '../../store/useToolsStore'
import { cn } from '../../lib/cn'

const MENU_Z = 10055

type Props = {
  category: ToolCategory
  valueId: string | null | undefined
  onChangeId: (id: string | null) => void
  placeholderPick: string
  ariaLabel: string
  disabled?: boolean
}

export function ToolsInventorySearchSelect({
  category,
  valueId,
  onChangeId,
  placeholderPick,
  ariaLabel,
  disabled = false,
}: Props) {
  const items = useToolsStore((s) => s.items)
  const filteredByCat = useMemo(() => items.filter((i) => i.category === category), [items, category])

  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [geom, setGeom] = useState<{
    top: number
    left: number
    width: number
    maxHeight: number
  } | null>(null)

  const selected = valueId ? filteredByCat.find((i) => i.id === valueId) : undefined

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return filteredByCat
    return filteredByCat.filter((i) => i.name.toLowerCase().includes(qq))
  }, [filteredByCat, q])

  const close = useCallback(() => {
    setOpen(false)
    setQ('')
  }, [])

  const updatePosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    const space = vh - r.bottom - 12
    setGeom({
      top: r.bottom + 6,
      left: r.left,
      width: r.width,
      maxHeight: Math.min(320, Math.max(120, space)),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open || disabled) {
      setGeom(null)
      return
    }
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
    const onDoc = (e: MouseEvent) => {
      const n = e.target as Node
      if (triggerRef.current?.contains(n)) return
      if (menuRef.current?.contains(n)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const menu =
    open && geom && !disabled && typeof document !== 'undefined' ? (
      createPortal(
        <div
          ref={menuRef}
          className="flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.04]"
          style={{
            position: 'fixed',
            top: geom.top,
            left: geom.left,
            minWidth: geom.width,
            maxWidth: 'min(calc(100vw - 16px), 24rem)',
            maxHeight: geom.maxHeight,
            zIndex: MENU_Z,
          }}
          role="listbox"
        >
          <div className="flex items-center gap-2 border-b border-gray-100 px-2 py-2">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder=""
              autoFocus
            />
          </div>
          <div className="max-h-[min(240px,50vh)] overflow-y-auto overscroll-contain p-1">
            <button
              type="button"
              className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
              onClick={() => {
                onChangeId(null)
                close()
              }}
            >
              —
            </button>
            {list.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-gray-400">—</p>
            ) : (
              list.map((opt) => {
                const sel = opt.id === valueId
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={sel}
                    className={cn(
                      'flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors',
                      sel ? 'bg-green-50 font-medium text-green-900' : 'text-gray-700 hover:bg-gray-50',
                    )}
                    onClick={() => {
                      onChangeId(opt.id)
                      close()
                    }}
                  >
                    {opt.name}
                  </button>
                )
              })
            )}
          </div>
        </div>,
        document.body,
      )
    ) : null

  return (
    <>
      <div className="relative w-full">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={cn(
            'flex w-full min-h-[42px] items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm font-normal text-gray-800',
            disabled ? 'cursor-not-allowed opacity-60' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50',
          )}
        >
          <span className={cn('min-w-0 truncate', !selected && 'text-gray-500')}>
            {selected ? selected.name : placeholderPick}
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition', open && 'rotate-180')} />
        </button>
      </div>
      {menu}
    </>
  )
}
