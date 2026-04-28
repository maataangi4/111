import { AnimatePresence, motion } from 'framer-motion'
import { ImagePlus, Plus, Sprout, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import { normGeneticsStrain, stockLinkedToGenetics } from '../../lib/stockLinkedGenetics'
import type { GeneticsBankEntry } from '../../store/cultivationTypes'
import type { GeneticStockLotEntry, StockItem } from '../../store/types'
import { useCrmStore } from '../../store/useCrmStore'
import { useCultivationStore } from '../../store/useCultivationStore'
import { MaterialOriginSelect } from '../inventory/MaterialOriginSelect'
import { StockSummarySlideOver } from '../inventory/StockSummarySlideOver'
import { totalGeneticStockUnits } from '../../lib/stockUtils'
import { RowActionsMenu } from '../ui/RowActionsMenu'
import { SoftSelect } from '../ui/SoftSelect'

const BRAND_GREEN = '#06663F'
/** Misma píldora expandible que «Añadir plantas» en CultivoTab. */
const INGRESO_FAB_COLLAPSED_PX = 56
const INGRESO_FAB_EXPAND_WIDTH_PAD_PX = 10

function newLotId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `lot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

type HubSub = 'semillas' | 'cosecha' | 'insumos'

const HUB_TAB_KEYS: { id: HubSub; labelKey: string }[] = [
  { id: 'semillas', labelKey: 'inventoryHub.semillas' },
  { id: 'cosecha', labelKey: 'inventoryHub.cosecha' },
  { id: 'insumos', labelKey: 'inventoryHub.insumos' },
]

function mergeNewLotsIntoExisting(
  existing: StockItem,
  incomingLots: GeneticStockLotEntry[],
): Omit<StockItem, 'id'> {
  const { id, ...rest } = existing
  void id
  const merged = [...(existing.geneticLotEntries ?? []), ...incomingLots]
  const total = Math.round(merged.reduce((s, e) => s + e.units, 0) * 100) / 100
  return {
    ...rest,
    geneticLotEntries: merged,
    geneticUnits: total,
  }
}

function StockForm({
  entryAppendTo,
  geneticsBank,
  stock,
  onSave,
  onClose,
}: {
  entryAppendTo?: StockItem | null
  geneticsBank: GeneticsBankEntry[]
  stock: StockItem[]
  onSave: (row: Omit<StockItem, 'id'>) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const appendTo = entryAppendTo ?? null

  const defaultGeneticsId = appendTo?.geneticsEntryId ?? ''
  const [geneticsId, setGeneticsId] = useState(defaultGeneticsId)
  const [imageUrl, setImageUrl] = useState(() => appendTo?.imageUrl ?? '')
  const [materialOrigin, setMaterialOrigin] = useState<string | undefined>(undefined)
  const [geneticUnits, setGeneticUnits] = useState('1')
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const fileRef = useRef<HTMLInputElement>(null)

  const effectiveGeneticsId =
    appendTo?.geneticsEntryId ?? (geneticsId || (geneticsBank[0]?.id ?? ''))

  const selectedEntry = geneticsBank.find((g) => g.id === effectiveGeneticsId)
  const strainLabel = selectedEntry?.name ?? appendTo?.tipo ?? ''

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setImageUrl(String(r.result ?? ''))
    r.readAsDataURL(f)
  }

  const inputClass = cn('w-full rounded-2xl border px-4 py-3 text-[15px]', C.input)
  const labelClass = cn('mb-1.5 block text-xs font-medium', C.label)

  const geneticsOptions = useMemo(() => {
    const rows = geneticsBank.map((g) => ({ value: g.id, label: g.name }))
    if (appendTo) {
      const id = appendTo.geneticsEntryId
      return id ? rows.filter((r) => r.value === id) : rows
    }
    const pick = { value: '' as string, label: t('stock.geneticsPick') }
    const has = Boolean(effectiveGeneticsId)
    return has ? rows : [pick, ...rows]
  }, [geneticsBank, appendTo, effectiveGeneticsId, t])

  const geneticsChip =
    effectiveGeneticsId === ''
      ? t('stock.geneticsPick')
      : geneticsBank.find((g) => g.id === effectiveGeneticsId)?.name ?? t('stock.geneticsPick')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()

    const u = Number(String(geneticUnits).replace(',', '.'))
    if (!Number.isFinite(u) || u <= 0) {
      window.alert(t('inventoryHub.geneticUnitsRequired'))
      return
    }
    if (!materialOrigin?.trim()) {
      window.alert(t('inventoryHub.materialOriginRequired'))
      return
    }

    const at = entryDate.trim() || new Date().toISOString().slice(0, 10)
    const newLot: GeneticStockLotEntry = {
      id: newLotId(),
      at,
      units: Math.round(u * 100) / 100,
      materialOrigin: materialOrigin.trim(),
    }

    if (appendTo) {
      const merged = mergeNewLotsIntoExisting(appendTo, [newLot])
      onSave({
        ...merged,
        imageUrl: imageUrl.trim() || appendTo.imageUrl,
        precio: appendTo.precio ?? 0,
      })
      onClose()
      return
    }

    const entry = geneticsBank.find((g) => g.id === effectiveGeneticsId)
    if (!entry) return

    const baseRow: Omit<StockItem, 'id'> = {
      geneticsEntryId: entry.id,
      tipo: entry.name,
      precio: 0,
      imageUrl: imageUrl.trim() || entry.imageUrl || '',
      geneticLotEntries: [newLot],
      geneticUnits: newLot.units,
    }

    const existing = stock.find(
      (s) =>
        s.geneticsEntryId === entry.id ||
        (!s.geneticsEntryId && normGeneticsStrain(s.tipo) === normGeneticsStrain(entry.name)),
    )

    if (existing) {
      onSave(mergeNewLotsIntoExisting(existing, [newLot]))
    } else {
      onSave(baseRow)
    }
    onClose()
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-form-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center',
        C.modalBackdrop,
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        initial={{ y: 24, opacity: 0.98 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={cn('max-h-[min(92vh,720px)] w-full max-w-md overflow-y-auto rounded-2xl border p-6', C.modalCard)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="stock-form-title" className={cn('text-lg font-semibold tracking-tight', C.heading)}>
              {appendTo ? t('inventoryHub.newEntryTitle') : t('stock.newProductTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {!appendTo ? (
            <div>
              <label className={labelClass}>{t('stock.imageLabel')}</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed py-3 text-sm font-medium',
                    'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                    'dark:border-zinc-700 dark:text-green-500 dark:hover:bg-zinc-800/80',
                  )}
                >
                  <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
                  {t('stock.upload')}
                </button>
              </div>
              <input
                className={cn(inputClass, 'mt-2')}
                placeholder={t('stock.imagePh')}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          ) : null}
          <div>
            <label className={labelClass}>{t('stock.geneticsLabel')}</label>
            {appendTo ? (
              <div
                className={cn(
                  inputClass,
                  'cursor-default bg-gray-50/90 dark:bg-zinc-900/60',
                )}
              >
                {strainLabel}
              </div>
            ) : (
              <SoftSelect
                value={effectiveGeneticsId}
                onChange={(v) => setGeneticsId(v)}
                options={geneticsOptions}
                chipText={geneticsChip}
                ariaLabel={t('stock.geneticsLabel')}
                variant="field"
                disabled={geneticsBank.length === 0}
                triggerClassName={inputClass}
                warning={!appendTo && effectiveGeneticsId === ''}
              />
            )}
            {!appendTo && geneticsBank.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                {t('stock.emptyGeneticsFirst')}
              </p>
            ) : null}
          </div>
          <div>
            <label className={labelClass}>{t('inventoryHub.entryDateLabel')}</label>
            <input
              className={inputClass}
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
          </div>
          <MaterialOriginSelect
            value={materialOrigin}
            onChange={setMaterialOrigin}
            t={t}
            inputClass={inputClass}
            labelClass={labelClass}
            label={t('cultivation.strainFieldBreeder')}
            ariaLabel={t('cultivation.strainFieldBreeder')}
          />
          <div>
            <label className={labelClass}>{t('inventoryHub.geneticUnits')}</label>
            <input
              className={inputClass}
              type="number"
              min={0}
              step="1"
              placeholder={t('inventoryHub.geneticUnitsPh')}
              value={geneticUnits}
              onChange={(e) => setGeneticUnits(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={cn('flex-1 rounded-2xl border py-3 text-[15px] font-medium', C.btnSecondary)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!appendTo && geneticsBank.length === 0}
              className={cn(
                'flex-1 rounded-2xl py-3 text-[15px] font-medium disabled:cursor-not-allowed disabled:opacity-40',
                C.btnPrimary,
              )}
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function SemillaStripRow({
  item,
  geneticsBank,
  onOpenSummary,
  onAppendEntry,
  onDelete,
  t,
}: {
  item: StockItem
  geneticsBank: GeneticsBankEntry[]
  onOpenSummary: (item: StockItem) => void
  onAppendEntry: (item: StockItem) => void
  onDelete: (item: StockItem) => void
  t: (k: string, vars?: Record<string, string | number>) => string
}) {
  const genetics = geneticsBank.find((g) => g.id === item.geneticsEntryId)
  const thumb = (genetics?.imageUrl || item.imageUrl || '').trim()
  const units = totalGeneticStockUnits(item)
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <article
      className={cn(
        'overflow-visible rounded-[28px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]',
        'dark:bg-[#252525] dark:shadow-black/25 dark:hover:shadow-black/35',
      )}
    >
      <div className="flex flex-row items-center gap-2 py-4 pl-4 pr-2 sm:gap-3 sm:pr-3">
        <RowActionsMenu
          onEdit={() => onAppendEntry(item)}
          onDelete={() => {
            if (window.confirm(t('stock.deleteConfirm'))) onDelete(item)
          }}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpenSummary(item)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenSummary(item)
            }
          }}
          className={cn(
            'flex min-w-0 flex-1 cursor-pointer flex-row items-center gap-4 rounded-2xl outline-none',
            'focus-visible:ring-2 focus-visible:ring-green-400/60',
          )}
        >
          {thumb && !imgFailed ? (
            <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl" aria-hidden>
              <img
                src={thumb}
                alt=""
                className="h-full w-full object-cover object-left object-top"
                onError={() => setImgFailed(true)}
              />
            </div>
          ) : (
            <div
              className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-slate-100/90 ring-1 ring-inset ring-slate-200/80 dark:bg-[#181818] dark:ring-0"
              aria-hidden
            >
              <Sprout className="h-9 w-9 text-emerald-700/50 dark:text-emerald-500/40" strokeWidth={1.75} />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold text-gray-900 dark:text-[#f1f1f1]">
              <Sprout className="h-4 w-4 shrink-0 text-green-600/80" strokeWidth={2} aria-hidden />
              <span>{item.tipo}</span>
            </h3>
            <p className="mt-1 text-sm font-semibold tabular-nums text-gray-800 dark:text-[#e5e5e5]">
              {t('inventoryHub.resumenUnidades', { n: units })}
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}

function StockSemillasStripList({
  items,
  geneticsBank,
  onOpenSummary,
  onAppendEntry,
  onDelete,
  t,
}: {
  items: StockItem[]
  geneticsBank: GeneticsBankEntry[]
  onOpenSummary: (item: StockItem) => void
  onAppendEntry: (item: StockItem) => void
  onDelete: (item: StockItem) => void
  t: (k: string, vars?: Record<string, string | number>) => string
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <SemillaStripRow
          key={item.id}
          item={item}
          geneticsBank={geneticsBank}
          onOpenSummary={onOpenSummary}
          onAppendEntry={onAppendEntry}
          onDelete={onDelete}
          t={t}
        />
      ))}
    </div>
  )
}

function StockCardGrid({
  items,
  onEdit,
  onDelete,
  t,
}: {
  items: StockItem[]
  onEdit: (item: StockItem) => void
  onDelete: (item: StockItem) => void
  t: (k: string) => string
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <motion.article
          layout
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'group relative overflow-hidden rounded-2xl border shadow-sm transition',
            C.card,
            C.cardHover,
          )}
        >
          <div
            className={cn(
              'relative aspect-[4/3] overflow-hidden bg-gradient-to-br',
              C.imagePlaceholder,
            )}
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-green-900">
                <ImagePlus className="h-12 w-12" strokeWidth={1} />
              </div>
            )}
            <div className="absolute right-2 top-2">
              <RowActionsMenu
                onEdit={() => onEdit(item)}
                onDelete={() => {
                  if (window.confirm(t('stock.deleteConfirm'))) onDelete(item)
                }}
              />
            </div>
          </div>
          <div className="p-4">
            <h3 className={cn('font-semibold', C.heading)}>{item.tipo}</h3>
            <p className={cn('mt-1 text-sm', C.muted)}>
              <span className={cn('font-medium', C.heading)}>${item.precio}</span>
              {t('stock.perGram')}
            </p>
            {item.inventoryGrams != null && item.inventoryGrams > 0 && (
              <p className={cn('mt-1 text-xs', C.subheading)}>
                {t('stock.inventoryGrams')}:{' '}
                <span className={cn('font-medium', C.heading)}>
                  {item.inventoryGrams} g
                </span>
              </p>
            )}
          </div>
        </motion.article>
      ))}
    </div>
  )
}

export function StockTab() {
  const { t, locale } = useTranslation()
  const stock = useCrmStore((s) => s.stock)
  const addStock = useCrmStore((s) => s.addStock)
  const updateStock = useCrmStore((s) => s.updateStock)
  const removeStock = useCrmStore((s) => s.removeStock)
  const geneticsBank = useCultivationStore((s) => s.geneticsBank)

  const [hubSub, setHubSub] = useState<HubSub>('semillas')

  const visibleStock = useMemo(
    () => stockLinkedToGenetics(stock, geneticsBank),
    [stock, geneticsBank],
  )

  const [summaryItem, setSummaryItem] = useState<StockItem | null>(null)
  const [entryModal, setEntryModal] = useState<{ appendTo: StockItem | null } | null>(null)

  const canAddEntry = geneticsBank.length > 0

  const ingresoFabLabelText = useMemo(() => t('inventoryHub.registrarIngresoFab'), [t])
  const ingresoFabMeasureRef = useRef<HTMLSpanElement>(null)
  const [ingresoFabExpandedW, setIngresoFabExpandedW] = useState(INGRESO_FAB_COLLAPSED_PX)
  const [ingresoFabOpen, setIngresoFabOpen] = useState(false)
  const [ingresoFabMotionOk, setIngresoFabMotionOk] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setIngresoFabMotionOk(!mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useLayoutEffect(() => {
    const el = ingresoFabMeasureRef.current
    if (!el) return
    const measure = () => {
      const w = Math.ceil(el.scrollWidth)
      setIngresoFabExpandedW(
        Math.min(920, Math.max(INGRESO_FAB_COLLAPSED_PX + 4, w + INGRESO_FAB_EXPAND_WIDTH_PAD_PX)),
      )
    }
    let alive = true
    const safeMeasure = () => {
      if (alive) measure()
    }
    safeMeasure()
    window.addEventListener('resize', safeMeasure)
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    const p = fonts?.ready
    if (p) void p.then(safeMeasure)
    return () => {
      alive = false
      window.removeEventListener('resize', safeMeasure)
    }
  }, [ingresoFabLabelText])

  useEffect(() => {
    const onGlobalIngreso = () => {
      setHubSub('semillas')
      setSummaryItem(null)
      setEntryModal({ appendTo: null })
    }
    window.addEventListener('inventory:open-registrar-ingreso', onGlobalIngreso)
    return () => window.removeEventListener('inventory:open-registrar-ingreso', onGlobalIngreso)
  }, [])

  return (
    <div className="min-h-0 w-full overflow-x-visible px-6 pb-8 pt-6 md:px-8 md:pb-10 md:pt-8">
      <div className="mb-6">
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-[#f1f1f1]">
          {t('stock.title')}
        </h1>
      </div>

      <motion.div
        layout
        className={cn(
          'relative mb-8 flex w-full min-w-0 rounded-full bg-green-50/60 p-1.5 shadow-inner backdrop-blur-md',
          'dark:bg-[#252525] dark:shadow-none dark:backdrop-blur-none',
        )}
      >
        {HUB_TAB_KEYS.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={hubSub === id}
            onClick={() => setHubSub(id)}
            className={cn(
              'relative flex min-h-[42px] min-w-0 flex-1 items-center justify-center rounded-full px-3 py-2 text-sm transition-colors duration-200 sm:px-4',
              hubSub === id
                ? 'font-semibold text-white'
                : 'font-medium text-gray-500 hover:text-green-800 dark:text-[#9a9a9a] dark:hover:text-[#f1f1f1]',
            )}
          >
            {hubSub === id ? (
              <motion.span
                layoutId="inventory-hub-tab-pill"
                className="pointer-events-none absolute inset-0 z-[1] rounded-full"
                style={{ backgroundColor: BRAND_GREEN }}
                transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                aria-hidden
              />
            ) : null}
            <span className="relative z-[2] text-center leading-tight">{t(labelKey)}</span>
          </button>
        ))}
      </motion.div>

      {hubSub === 'semillas' ? (
        <>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 overflow-visible">
            <p className={cn('min-w-0 flex-1 text-xs font-medium uppercase tracking-wide', C.muted)}>
              {t('inventoryHub.semillasAlt')}
            </p>
            <div className="flex min-w-0 shrink-0 justify-end self-end overflow-visible pr-0.5">
              <button
                type="button"
                aria-label={ingresoFabLabelText}
                title={!canAddEntry ? t('stock.emptyGeneticsFirst') : ingresoFabLabelText}
                aria-expanded={ingresoFabOpen}
                disabled={!canAddEntry}
                onClick={() => {
                  if (!canAddEntry) return
                  setEntryModal({ appendTo: null })
                }}
                onMouseEnter={() => {
                  if (canAddEntry) setIngresoFabOpen(true)
                }}
                onMouseLeave={() => setIngresoFabOpen(false)}
                onFocus={() => {
                  if (canAddEntry) setIngresoFabOpen(true)
                }}
                onBlur={() => setIngresoFabOpen(false)}
                className={cn(
                  'relative flex h-14 shrink-0 cursor-pointer items-center overflow-hidden rounded-full text-sm font-semibold text-white',
                  ingresoFabOpen && canAddEntry ? 'justify-end' : 'justify-center',
                  'hover:brightness-110 active:brightness-95',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#181818]',
                  !canAddEntry && 'cursor-not-allowed opacity-45 hover:brightness-100',
                )}
                style={{
                  width:
                    canAddEntry && ingresoFabOpen ? ingresoFabExpandedW : INGRESO_FAB_COLLAPSED_PX,
                  backgroundColor: BRAND_GREEN,
                  transition: ingresoFabMotionOk
                    ? 'width 420ms cubic-bezier(0.22, 1, 0.36, 1)'
                    : undefined,
                }}
              >
                <span
                  ref={ingresoFabMeasureRef}
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 -z-10 flex w-max flex-row items-center gap-2 pl-5 pr-4 opacity-0"
                >
                  <span className="whitespace-nowrap">{ingresoFabLabelText}</span>
                  <Plus className="h-6 w-6 shrink-0" strokeWidth={2.25} aria-hidden />
                </span>
                <span
                  className={cn(
                    'relative z-[1] flex h-full w-max shrink-0 flex-row items-center',
                    ingresoFabOpen && canAddEntry ? 'justify-end gap-2 pl-5 pr-4' : 'justify-center gap-0',
                  )}
                >
                  <span
                    className={cn(
                      'min-w-0 overflow-hidden whitespace-nowrap transition-[max-width] duration-300 ease-out',
                      ingresoFabOpen && canAddEntry ? 'max-w-[min(90vw,720px)]' : 'max-w-0',
                    )}
                    aria-hidden={!ingresoFabOpen || !canAddEntry}
                  >
                    {ingresoFabLabelText}
                  </span>
                  <Plus className="h-6 w-6 shrink-0" strokeWidth={2.25} aria-hidden />
                </span>
              </button>
            </div>
          </div>
          <StockSemillasStripList
            items={visibleStock}
            geneticsBank={geneticsBank}
            onOpenSummary={(it) => setSummaryItem(it)}
            onAppendEntry={(it) => setEntryModal({ appendTo: it })}
            onDelete={(it) => removeStock(it.id)}
            t={t}
          />
          {visibleStock.length === 0 && (
            <div
              className={cn(
                'rounded-2xl border border-dashed border-gray-200/80 py-16 text-center text-sm text-gray-500',
                'dark:border-white/[0.08] dark:bg-[#1c1c1c]/60 dark:text-[#a3a3a3]',
              )}
            >
              {geneticsBank.length === 0 ? t('stock.emptyGeneticsFirst') : t('stock.empty')}
            </div>
          )}
        </>
      ) : null}

      {hubSub === 'cosecha' ? (
        <>
          <p className={cn('mb-4 text-xs font-medium uppercase tracking-wide', C.muted)}>
            {t('inventoryHub.cosechaAlt')}
          </p>
          <StockCardGrid
            items={visibleStock}
            t={t}
            onEdit={(item) => setEntryModal({ appendTo: item })}
            onDelete={(item) => removeStock(item.id)}
          />
          {visibleStock.length === 0 && (
            <div
              className={cn(
                'rounded-2xl border border-dashed border-gray-200/80 py-16 text-center text-sm text-gray-500',
                'dark:border-white/[0.08] dark:bg-[#1c1c1c]/60 dark:text-[#a3a3a3]',
              )}
            >
              {geneticsBank.length === 0 ? t('stock.emptyGeneticsFirst') : t('stock.empty')}
            </div>
          )}
        </>
      ) : null}

      {hubSub === 'insumos' ? (
        <div
          className={cn(
            'rounded-2xl border border-dashed border-gray-200/80 py-16 text-center text-sm text-gray-500',
            'dark:border-white/[0.08] dark:bg-[#1c1c1c]/60 dark:text-[#a3a3a3]',
          )}
        >
          {t('inventoryHub.insumosSoon')}
        </div>
      ) : null}

      <AnimatePresence>
        {summaryItem ? (
          <StockSummarySlideOver
            key={summaryItem.id}
            item={summaryItem}
            geneticsBank={geneticsBank}
            onClose={() => setSummaryItem(null)}
            onAddEntry={() => {
              const it = summaryItem
              setSummaryItem(null)
              setEntryModal({ appendTo: it })
            }}
            t={t}
            locale={locale}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {entryModal ? (
          <StockForm
            key={entryModal.appendTo?.id ?? 'new-stock-entry'}
            entryAppendTo={entryModal.appendTo}
            geneticsBank={geneticsBank}
            stock={stock}
            onClose={() => setEntryModal(null)}
            onSave={(row) => {
              if (entryModal.appendTo) {
                updateStock(entryModal.appendTo.id, row)
                return
              }
              const name = geneticsBank.find((g) => g.id === row.geneticsEntryId)?.name ?? ''
              const ex = stock.find(
                (s) =>
                  row.geneticsEntryId &&
                  (s.geneticsEntryId === row.geneticsEntryId ||
                    (!s.geneticsEntryId && normGeneticsStrain(s.tipo) === normGeneticsStrain(name))),
              )
              if (ex) updateStock(ex.id, row)
              else addStock(row)
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
