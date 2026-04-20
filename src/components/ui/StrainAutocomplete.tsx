import { CheckCircle2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../i18n/useTranslation'
import { type UnifiedStrainRow, useStrainsStore } from '../../store/useStrainsStore'

const norm = (s: string) => s.trim().toLowerCase()

export function StrainAutocomplete({
  tenantId,
  value,
  onChange,
  className,
  placeholder,
  required,
  onSelectRow,
}: {
  tenantId: string
  value: string
  onChange: (v: string) => void
  className?: string
  placeholder?: string
  required?: boolean
  onSelectRow?: (row: UnifiedStrainRow) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const getAllStrains = useStrainsStore((s) => s.getAllStrains)
  const hydrateGlobalStrains = useStrainsStore((s) => s.hydrateGlobalStrains)
  const hydratingGlobal = useStrainsStore((s) => s.hydratingGlobal)

  const all = getAllStrains(tenantId)
  const query = value.trim()
  const filtered = useMemo(() => {
    if (!query) return all.slice(0, 12)
    const q = norm(query)
    return all.filter((s) => norm(s.name).includes(q)).slice(0, 12)
  }, [all, query])

  const exactMatch = useMemo(() => {
    if (!query) return null
    const q = norm(query)
    return all.find((s) => norm(s.name) === q) ?? null
  }, [all, query])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    /** Captura: el modal usa stopPropagation en el panel; sin capture el cierre exterior no llega a document. */
    document.addEventListener('pointerdown', onDoc, true)
    return () => document.removeEventListener('pointerdown', onDoc, true)
  }, [open])

  useEffect(() => {
    void hydrateGlobalStrains()
  }, [hydrateGlobalStrains])

  return (
    <div className="relative" ref={ref}>
      <input
        className={className}
        value={value}
        placeholder={placeholder}
        required={required}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
      />

      {open ? (
        <div
          className={cn(
            'absolute z-[110] mt-1.5 max-h-64 w-full overflow-auto rounded-2xl border p-1.5 shadow-[var(--shadow-soft-lg)]',
            'border-gray-200/90 bg-white/98 dark:border-zinc-700 dark:bg-zinc-900/98',
          )}
        >
          {filtered.map((row) => (
            <button
              key={`${row.source}-${row.id}`}
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-800"
              onClick={() => {
                onChange(row.name)
                onSelectRow?.(row)
                setOpen(false)
              }}
            >
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-800 dark:text-zinc-100">
                {row.verified ? (
                  <CheckCircle2
                    className={cn(
                      'h-3.5 w-3.5',
                      row.source === 'global' ? 'text-emerald-600' : 'text-gray-400',
                    )}
                  />
                ) : null}
                {row.name}
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                  row.source === 'global'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                    : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300',
                )}
              >
                {row.source === 'global'
                  ? `🔹 ${t('strainAutocomplete.tagGlobal')}`
                  : `👤 ${t('strainAutocomplete.tagMyBase')}`}
              </span>
            </button>
          ))}
          {filtered.length === 0 && hydratingGlobal ? (
            <div className="px-2.5 py-2 text-xs text-gray-500 dark:text-zinc-400">
              {t('strainAutocomplete.loadingGlobal')}
            </div>
          ) : null}
        </div>
      ) : null}

      {query ? (
        <p className="mt-1.5 text-xs">
          {exactMatch ? (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium',
                exactMatch.source === 'global'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-200'
                  : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300',
              )}
            >
              {exactMatch.source === 'global' ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {t('strainAutocomplete.verifiedGlobal')}
                </>
              ) : (
                <>👤 {t('strainAutocomplete.fromMyBase')}</>
              )}
            </span>
          ) : (
            <span className="text-gray-500 dark:text-zinc-400">
              {t('strainAutocomplete.newStrainHint')}
            </span>
          )}
        </p>
      ) : null}
    </div>
  )
}
