import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import type { InaseVariety } from '../../data/inaseVarieties'

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

function varietyMatches(v: InaseVariety, qFolded: string): boolean {
  if (!qFolded) return true
  const id = fold(v.id)
  const name = fold(v.name)
  const slash = `${id} / ${name}`
  return id.includes(qFolded) || name.includes(qFolded) || slash.includes(qFolded)
}

export function InaseVarietySearchSelect({
  varieties,
  value,
  onChange,
  placeholder,
  noResultsText,
  className,
}: {
  varieties: readonly InaseVariety[]
  value: string
  onChange: (id: string) => void
  placeholder: string
  noResultsText: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value.trim()) {
      const v = varieties.find((x) => x.id === value.trim())
      if (v) setQuery(`${v.id} / ${v.name}`)
    }
  }, [value, varieties])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc, true)
    return () => document.removeEventListener('pointerdown', onDoc, true)
  }, [open])

  const filtered = useMemo(() => {
    const q = fold(query)
    if (!q) return [...varieties]
    return varieties.filter((v) => varietyMatches(v, q))
  }, [varieties, query])

  const pick = (v: InaseVariety) => {
    onChange(v.id)
    setQuery(`${v.id} / ${v.name}`)
    setOpen(false)
  }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <input
        type="text"
        className={cn(
          'box-border min-h-[42px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
          'dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:placeholder:text-[#8c8c8c]',
        )}
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
          {varieties.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-gray-500 dark:text-zinc-400">{noResultsText}</p>
          ) : filtered.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-gray-500 dark:text-zinc-400">{noResultsText}</p>
          ) : (
            filtered.map((v) => (
              <button
                key={v.id}
                type="button"
                role="option"
                aria-selected={value === v.id}
                className="flex w-full rounded-xl px-2.5 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800"
                onClick={() => pick(v)}
              >
                <span className="font-medium text-gray-900 dark:text-zinc-100">
                  {v.id} / {v.name}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
