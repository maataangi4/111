import { AnimatePresence, motion } from 'framer-motion'
import { GitBranch, ScanLine, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import {
  buildLineageForTraceHit,
  searchTraceHits,
  type LineageNode,
  type TraceHit,
} from '../../lib/traceability/lineageEngine'
import { useCrmStore } from '../../store/useCrmStore'
import { useCultivationStore } from '../../store/useCultivationStore'

export function TrazabilidadTab() {
  const { t } = useTranslation()
  const board = useCultivationStore((s) => s.cultivoBoard)
  const harvestBatches = useCultivationStore((s) => s.harvestBatches)
  const geneticsBank = useCultivationStore((s) => s.geneticsBank)
  const stock = useCrmStore((s) => (Array.isArray(s.stock) ? s.stock : []))

  const [query, setQuery] = useState('')
  const [activeHit, setActiveHit] = useState<TraceHit | null>(null)
  const [selectedNode, setSelectedNode] = useState<LineageNode | null>(null)
  const [scannerHint, setScannerHint] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const hits = useMemo(
    () => searchTraceHits(query, board, harvestBatches, stock, geneticsBank),
    [query, board, harvestBatches, stock, geneticsBank],
  )

  const lineage = useMemo(() => {
    if (!activeHit) return null
    return buildLineageForTraceHit(activeHit, board, harvestBatches, stock)
  }, [activeHit, board, harvestBatches, stock])

  const orderedNodes = useMemo(() => (lineage ? [...lineage].reverse() : []), [lineage])

  useEffect(() => {
    if (!scannerHint) return
    const tmr = window.setTimeout(() => setScannerHint(null), 3500)
    return () => window.clearTimeout(tmr)
  }, [scannerHint])

  const onScanner = useCallback(() => {
    setScannerHint(t('traz.scannerSoon'))
    fileRef.current?.click()
  }, [t])

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.target.value = ''
      setScannerHint(t('traz.scannerSoon'))
    },
    [t],
  )

  const hitTypeLabel = useCallback(
    (hit: TraceHit) => {
      switch (hit.type) {
        case 'plant':
          return t('traz.hitPlant')
        case 'harvestBatch':
          return t('traz.hitHarvest')
        case 'stockItem':
          return t('traz.hitStock')
        case 'cultivoLot':
          return t('traz.hitLot')
        default:
          return ''
      }
    },
    [t],
  )

  const kindLabel = useCallback(
    (k: LineageNode['kind']) => {
      if (k === 'product') return t('traz.kindProduct')
      if (k === 'cultivation') return t('traz.kindCultivation')
      if (k === 'material') return t('traz.kindMaterial')
      return t('traz.kindLegal')
    },
    [t],
  )

  return (
    <div className="relative flex min-h-[min(100vh-12rem,920px)] flex-col">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={onFile}
      />

      <div className="shrink-0 border-b border-gray-200/70 px-6 py-10 dark:border-white/[0.06] sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center justify-center rounded-2xl bg-emerald-500/10 p-3 dark:bg-emerald-500/15">
            <GitBranch className="h-7 w-7 text-emerald-700 dark:text-emerald-400" strokeWidth={1.75} aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-[#f1f1f1] sm:text-3xl">
            {t('traz.pageTitle')}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-[#a3a3a3]">
            {t('traz.pageSubtitle')}
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-xl">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#737373]">
            <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveHit(null)
              setSelectedNode(null)
            }}
            placeholder={t('traz.searchPlaceholder')}
            className={cn(
              'w-full rounded-2xl border border-gray-200/90 bg-white py-4 pl-12 pr-14 text-base shadow-sm outline-none transition',
              'placeholder:text-slate-400 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20',
              'dark:border-white/[0.08] dark:bg-[#262626] dark:text-[#f1f1f1] dark:placeholder:text-[#737373]',
            )}
            autoComplete="off"
            aria-label={t('traz.searchPlaceholder')}
          />
          <button
            type="button"
            onClick={onScanner}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/[0.08] dark:hover:text-[#e5e5e5]"
            aria-label={t('traz.scannerAria')}
          >
            <ScanLine className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {scannerHint ? (
          <p className="mx-auto mt-3 max-w-xl text-center text-xs text-amber-700 dark:text-amber-400">
            {scannerHint}
          </p>
        ) : null}

        {activeHit ? (
          <div className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-3">
            <p className="text-center text-sm text-slate-600 dark:text-[#a3a3a3]">
              <span className="font-medium text-slate-900 dark:text-[#f1f1f1]">{activeHit.title}</span>
              <span className="mx-1.5 text-slate-400">·</span>
              <span className="text-xs uppercase tracking-wide text-slate-400">{hitTypeLabel(activeHit)}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveHit(null)
                setSelectedNode(null)
              }}
              className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              {t('traz.clearSelection')}
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-6 py-8 sm:px-10">
        <div className="min-w-0 flex-1">
          {!query.trim() && !activeHit ? (
            <p className="mx-auto max-w-md pt-8 text-center text-sm text-slate-500 dark:text-[#8c8c8c]">
              {t('traz.emptyBody')}
            </p>
          ) : null}

          {query.trim() && !activeHit ? (
            <div className="mx-auto max-w-xl">
              {hits.length === 0 ? (
                <p className="pt-4 text-center text-sm text-slate-500 dark:text-[#8c8c8c]">{t('traz.noResults')}</p>
              ) : (
                <ul className="mt-2 overflow-hidden divide-y divide-gray-100 rounded-2xl border border-gray-200/80 dark:divide-white/[0.06] dark:border-white/[0.08]">
                  {hits.map((h) => (
                    <li key={h.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveHit(h)
                          setSelectedNode(null)
                        }}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-slate-900 dark:text-[#f1f1f1]">
                            {h.title}
                          </span>
                          <span className="block truncate text-xs text-slate-500 dark:text-[#8c8c8c]">
                            {h.subtitle}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full border border-gray-200/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-white/[0.12] dark:text-[#a3a3a3]">
                          {hitTypeLabel(h)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {activeHit && lineage && lineage.length > 0 ? (
            <div className="mx-auto max-w-lg pb-16">
              <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[#737373]">
                {t('traz.timelineHeading')}
              </p>
              <div className="relative pl-2">
                <div
                  className="absolute bottom-3 left-[13px] top-3 w-px rounded-full bg-slate-200 dark:bg-white/10"
                  aria-hidden
                />
                <div className="flex flex-col gap-1">
                  {orderedNodes.map((n, idx) => (
                    <button
                      key={`${n.id}-${idx}`}
                      type="button"
                      onClick={() => setSelectedNode(n)}
                      className="relative flex gap-4 rounded-2xl py-4 pr-2 text-left transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                    >
                      <span
                        className={cn(
                          'relative z-[1] mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-[5px] ring-white dark:ring-[#181818]',
                          n.health === 'ok'
                            ? 'bg-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]'
                            : 'bg-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]',
                        )}
                      />
                      <div className="min-w-0 pb-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#737373]">
                          {kindLabel(n.kind)}
                        </p>
                        <p className={cn('mt-0.5 font-medium leading-snug', C.heading)}>{n.title}</p>
                        <p className={cn('mt-1 text-sm leading-relaxed', C.muted)}>{n.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeHit && (!lineage || lineage.length === 0) ? (
            <p className="pt-6 text-center text-sm text-slate-500 dark:text-[#8c8c8c]">{t('traz.noResults')}</p>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {selectedNode ? (
          <>
            <motion.div
              key="traz-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn('fixed inset-0 z-[88]', C.modalBackdrop)}
              onMouseDown={() => setSelectedNode(null)}
            />
            <motion.aside
              key="traz-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="traz-slide-title"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              className={cn(
                'fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-md flex-col border-l shadow-2xl',
                C.modalCard,
                'border-gray-200/80 bg-[#fdfdfd] dark:border-zinc-800 dark:bg-[#1f1f1f]',
              )}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <header className="flex items-center justify-between gap-3 border-b border-gray-200/70 px-5 py-4 dark:border-white/[0.06]">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#737373]">
                    {kindLabel(selectedNode.kind)}
                  </p>
                  <h2 id="traz-slide-title" className={cn('mt-1 text-lg font-semibold leading-tight', C.heading)}>
                    {selectedNode.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNode(null)}
                  className="shrink-0 rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.08]"
                  aria-label={t('common.close')}
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <p className={cn('text-sm leading-relaxed', C.muted)}>{selectedNode.subtitle}</p>
                {selectedNode.detailPairs.length > 0 ? (
                  <dl className="mt-6 space-y-3">
                    {selectedNode.detailPairs.map((row, i) => (
                      <div key={`${row.k}-${i}`} className="flex gap-3 text-sm">
                        <dt className="w-[40%] shrink-0 font-medium text-slate-600 dark:text-[#a3a3a3]">{row.k}</dt>
                        <dd className="min-w-0 break-words text-slate-900 dark:text-[#f1f1f1]">{row.v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {selectedNode.scanDataUrl ? (
                  <div className="mt-8">
                    <a
                      href={selectedNode.scanDataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-xl px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
                      style={{ backgroundColor: '#06663F' }}
                    >
                      {t('traz.viewScan')}
                    </a>
                  </div>
                ) : null}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
