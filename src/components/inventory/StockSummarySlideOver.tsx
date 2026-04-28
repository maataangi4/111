import { motion } from 'framer-motion'
import { ImagePlus, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import type { GeneticsBankEntry } from '../../store/cultivationTypes'
import type { AppLocale } from '../../store/useSettingsStore'
import type { StockItem } from '../../store/types'

const BRAND_GREEN = '#06663F'

type SummaryTab = 'resumen' | 'historial'

function formatLotDate(isoDay: string, locale: AppLocale): string {
  const ms = Date.parse(`${isoDay}T12:00:00`)
  if (!Number.isFinite(ms)) return isoDay
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ms))
}

export function totalGeneticStockUnits(item: StockItem): number {
  const fromEnt = item.geneticLotEntries?.reduce((s, e) => s + e.units, 0) ?? 0
  if (fromEnt > 0) return Math.round(fromEnt * 100) / 100
  return typeof item.geneticUnits === 'number' && item.geneticUnits > 0
    ? Math.round(item.geneticUnits * 100) / 100
    : 0
}

export function StockSummarySlideOver({
  item,
  geneticsBank,
  onClose,
  onAddEntry,
  t,
  locale,
}: {
  item: StockItem
  geneticsBank: GeneticsBankEntry[]
  onClose: () => void
  onAddEntry: () => void
  t: (k: string, vars?: Record<string, string | number>) => string
  locale: AppLocale
}) {
  const [tab, setTab] = useState<SummaryTab>('resumen')
  const genetics = geneticsBank.find((g) => g.id === item.geneticsEntryId)
  const thumb = (item.imageUrl || genetics?.imageUrl || '').trim()
  const units = totalGeneticStockUnits(item)

  const sortedAsc = useMemo(() => {
    const e = item.geneticLotEntries ?? []
    return [...e].sort((a, b) => a.at.localeCompare(b.at))
  }, [item.geneticLotEntries])

  const timelineDesc = useMemo(() => [...sortedAsc].reverse(), [sortedAsc])

  const TAB_KEYS: { id: SummaryTab; labelKey: string }[] = [
    { id: 'resumen', labelKey: 'inventoryHub.tabResumen' },
    { id: 'historial', labelKey: 'inventoryHub.tabHistorial' },
  ]

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-summary-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('fixed inset-0 z-[85] p-3 sm:p-5 lg:p-8', C.modalBackdrop)}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0.98, scale: 0.995 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 14, opacity: 0, scale: 0.995 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className={cn(
          'mx-auto flex max-h-[min(92vh,880px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[2rem] border shadow-2xl',
          C.modalCard,
          'border-gray-200/80 dark:border-zinc-800/80 dark:!bg-[#222222]',
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 bg-[#fdfdfd] px-6 pb-3 pt-4 dark:bg-[#222222] lg:px-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="stock-summary-title"
                className={cn('text-xl font-semibold tracking-tight lg:text-2xl', C.heading)}
              >
                {item.tipo}
              </h2>
              <p className={cn('mt-1 text-sm font-medium tabular-nums', C.muted)}>
                {t('inventoryHub.resumenUnidades', { n: units })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={onAddEntry}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white',
                  'transition hover:brightness-110',
                )}
                style={{ backgroundColor: BRAND_GREEN }}
              >
                <Plus className="h-4 w-4" strokeWidth={2.25} />
                {t('inventoryHub.addEntryCta')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div
            className={cn(
              'relative mt-3 flex w-full rounded-full p-1.5 shadow-inner',
              'bg-gray-100/80 dark:bg-[#333333] dark:shadow-none',
            )}
          >
            {TAB_KEYS.map(({ id, labelKey }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  'relative flex min-h-[42px] flex-1 items-center justify-center rounded-full px-4 py-2 text-sm transition-colors duration-200',
                  tab === id
                    ? 'font-semibold text-white'
                    : 'font-medium text-gray-500 hover:text-green-800 dark:text-[#9a9a9a] dark:hover:text-[#f1f1f1]',
                )}
              >
                {tab === id ? (
                  <motion.span
                    layoutId="stock-summary-tab-pill"
                    className="pointer-events-none absolute inset-0 z-[1] rounded-full"
                    style={{ backgroundColor: BRAND_GREEN }}
                    transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                    aria-hidden
                  />
                ) : null}
                <span className="relative z-[2] leading-tight">{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#fdfdfd] px-6 py-5 dark:bg-[#222222] lg:px-8">
          {tab === 'resumen' ? (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/[0.06] dark:ring-white/[0.08] sm:mx-0">
                {thumb ? (
                  <img src={thumb} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className={cn(
                      'flex h-full w-full items-center justify-center bg-gradient-to-br',
                      C.imagePlaceholder,
                    )}
                  >
                    <ImagePlus className="h-10 w-10 text-gray-400 opacity-50 dark:text-[#8c8c8c]" strokeWidth={1.25} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed text-gray-600 dark:text-[#c4c4c4]">
                <p>
                  <span className="font-semibold text-gray-900 dark:text-[#f1f1f1]">
                    {t('inventoryHub.resumenVariedad')}:
                  </span>{' '}
                  {item.tipo}
                </p>
                {genetics?.name && genetics.name !== item.tipo ? (
                  <p className="text-xs text-gray-500 dark:text-[#8c8c8c]">{genetics.name}</p>
                ) : null}
                <p className="tabular-nums">
                  <span className="font-semibold text-gray-900 dark:text-[#f1f1f1]">
                    {t('inventoryHub.resumenTotal')}:
                  </span>{' '}
                  {units} {t('inventoryHub.unidadesShort')}
                </p>
              </div>
            </div>
          ) : null}

          {tab === 'historial' ? (
            <div className="min-h-[120px]">
              {timelineDesc.length === 0 ? (
                <p className={cn('py-8 text-center text-sm', C.muted)}>{t('inventoryHub.historialEmpty')}</p>
              ) : (
                <ol className="relative m-0 list-none p-0">
                  {timelineDesc.map((lot) => {
                    const chronologicalIdx = sortedAsc.findIndex((l) => l.id === lot.id)
                    const n = Math.max(1, chronologicalIdx + 1)
                    const displayN = String(n).padStart(3, '0')
                    const dateStr = formatLotDate(lot.at, locale)
                    return (
                      <li
                        key={lot.id}
                        className="relative border-l-2 border-emerald-700/35 py-3 pl-6 last:pb-0 dark:border-emerald-500/35"
                      >
                        <span
                          className="absolute left-[-5px] top-[22px] h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-emerald-600 shadow-sm dark:bg-emerald-500"
                          aria-hidden
                        />
                        <p className="font-mono text-[13px] font-medium leading-snug text-gray-900 dark:text-[#f1f1f1]">
                          {t('inventoryHub.loteLine', {
                            n: displayN,
                            date: dateStr,
                            units: String(lot.units),
                            origin: lot.materialOrigin,
                          })}
                        </p>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  )
}
