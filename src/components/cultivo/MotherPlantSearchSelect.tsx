import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import type { CultivationRoom, PlantRecord } from '../../store/cultivationTypes'
import { motherStockCandidates } from '../../lib/cultivo/motherStockCandidates'

const norm = (s: string) => s.trim().toLowerCase()

export function MotherPlantSearchSelect({
  plants,
  rooms,
  value,
  onChange,
  placeholder,
  emptyHint,
  className,
}: {
  plants: PlantRecord[]
  rooms: CultivationRoom[]
  value: string
  onChange: (plantId: string) => void
  placeholder: string
  emptyHint: string
  className?: string
}) {
  const candidates = useMemo(() => motherStockCandidates(plants, rooms), [plants, rooms])
  const roomLabel = useMemo(() => {
    const m = new Map(rooms.map((r) => [r.id, r.label]))
    return (roomId: string) => m.get(roomId)?.trim() ?? roomId
  }, [rooms])

  const selected = useMemo(
    () => (value.trim() ? candidates.find((p) => p.id === value.trim()) : undefined),
    [candidates, value],
  )

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selected) {
      setQuery(`${selected.strain} · ${selected.id}`)
    } else if (!value) {
      setQuery('')
    }
  }, [selected, value])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc, true)
    return () => document.removeEventListener('pointerdown', onDoc, true)
  }, [open])

  const filtered = useMemo(() => {
    const q = norm(query)
    if (!q) return candidates.slice(0, 24)
    return candidates
      .filter((p) => {
        const rl = norm(roomLabel(p.roomId))
        return (
          norm(p.id).includes(q) ||
          norm(p.strain).includes(q) ||
          rl.includes(q)
        )
      })
      .slice(0, 24)
  }, [candidates, query, roomLabel])

  const pick = (p: PlantRecord) => {
    onChange(p.id)
    setQuery(`${p.strain} · ${p.id}`)
    setOpen(false)
  }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <input
        type="text"
        className="box-border min-h-[42px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (value) onChange('')
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open ? (
        <div
          className={cn(
            'absolute z-[120] mt-1.5 max-h-64 w-full overflow-auto rounded-2xl border p-1.5 shadow-[var(--shadow-soft-lg)]',
            'border-gray-200/90 bg-white/98 dark:border-zinc-700 dark:bg-zinc-900/98',
          )}
          role="listbox"
        >
          {candidates.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-gray-500 dark:text-zinc-400">{emptyHint}</p>
          ) : filtered.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-gray-500 dark:text-zinc-400">{emptyHint}</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={value === p.id}
                className="flex w-full flex-col gap-0.5 rounded-xl px-2.5 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-800"
                onClick={() => pick(p)}
              >
                <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                  {p.strain}
                </span>
                <span className="text-xs text-gray-500 dark:text-zinc-400">
                  {p.id} · {roomLabel(p.roomId)}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
