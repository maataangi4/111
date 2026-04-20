import { useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Calendar, Layers, MapPin, Sun, Timer } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../i18n/useTranslation'
import type { GeneticsType } from '../../store/cultivationTypes'
import { useCultivationStore } from '../../store/useCultivationStore'
import type { PlantCardItem } from './PlantCard'
import { CanspaceMarkThumb } from './CanspaceMarkThumb'
import { PROPAGACION_TYPE_ICON_CLASS } from './propagacionTypeIconStroke'
import { PlantNounIcon } from './PlantNounIcon'
import { SeedNounIcon } from './SeedNounIcon'
import { CultivoRowActionsMenu } from './CultivoRowActionsMenu'

/** Тот же зелёный, что FAB «+» и ползунок этапов в CultivoTab. */
const CULTIVO_BRAND_GREEN = '#06663F'
/** Компактнее шапочного FAB «+» (h-12 круг). */
const VEG_FAB_COLLAPSED_PX = 48
const VEG_FAB_EXPAND_WIDTH_PAD_PX = 8

function formatAgeLabel(item: PlantCardItem, t: (k: string, v?: Record<string, string | number>) => string): string {
  const startedAt = item.propagacionStartedAt?.trim()
  if (startedAt) {
    const ms = Date.parse(startedAt)
    if (Number.isFinite(ms)) {
      const elapsedMs = Math.max(0, Date.now() - ms)
      const dayN = Math.floor(elapsedMs / 86400000) + 1
      return t('propagadorUi.dayN', { n: dayN })
    }
  }
  if (item.ageDays != null && Number.isFinite(item.ageDays)) {
    return t('propagadorUi.dayN', { n: Math.max(1, Math.round(item.ageDays)) })
  }
  return String(item.stageTag ?? '')
}

/** Точка/• в локации → « / » для одной строки. */
function formatLocationInline(raw: string | undefined): string {
  return String(raw ?? '')
    .split(/\s*•\s*|\s*·\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' / ')
}

/** Миниатюра только из банка сортов; без привязки в системе — заглушка-лист. */
function strainBankImageUrl(
  strainName: string | undefined,
  geneticsBank: { name: string; imageUrl: string }[],
): string {
  const key = String(strainName ?? '').trim().toLowerCase()
  return geneticsBank.find((g) => g.name.trim().toLowerCase() === key)?.imageUrl?.trim() ?? ''
}

export function PropagacionBatchCard({
  item,
  onOpenDetail,
  onMoveToVegetacion,
  onEditRow,
  onDeleteRow,
}: {
  item: PlantCardItem
  onOpenDetail: () => void
  /** Abre el flujo para pasar la fila a la fase Vegetación (mismo modal que la pulsera). */
  onMoveToVegetacion: () => void
  onEditRow: () => void
  onDeleteRow: () => void
}) {
  const { t } = useTranslation()
  const vegFabLabelText = t('propagadorUi.transplantToVeg')
  const [vegFabOpen, setVegFabOpen] = useState(false)
  const vegFabMotionOk = !useReducedMotion()
  const vegFabMeasureRef = useRef<HTMLSpanElement>(null)
  const [vegFabExpandedW, setVegFabExpandedW] = useState(VEG_FAB_COLLAPSED_PX)

  useLayoutEffect(() => {
    const el = vegFabMeasureRef.current
    if (!el) return
    const measure = () => {
      const w = Math.ceil(el.scrollWidth)
      setVegFabExpandedW(
        Math.min(920, Math.max(VEG_FAB_COLLAPSED_PX + 4, w + VEG_FAB_EXPAND_WIDTH_PAD_PX)),
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
  }, [vegFabLabelText])

  const geneticsBank = useCultivationStore((s) => (Array.isArray(s.geneticsBank) ? s.geneticsBank : []))
  const thumbUrl = useMemo(
    () => strainBankImageUrl(item.strain, geneticsBank),
    [geneticsBank, item.strain],
  )
  const [imgFailed, setImgFailed] = useState(false)
  useEffect(() => {
    setImgFailed(false)
  }, [thumbUrl])

  const initial = item.initialQuantity ?? item.quantity ?? 1
  const current = item.quantity ?? initial
  const isLote = item.trackingType !== 'planta'
  const title = String(item.strain ?? '')
  const subtitle = isLote
    ? t('propagadorUi.loteId', { id: item.id })
    : t('propagadorUi.plantaId', { id: item.id })
  const locationLine = item.location?.trim() ? formatLocationInline(item.location) : ''
  const gt = (item.geneticsType ?? 'fotoperiodica') as GeneticsType
  const geneticsLabel = t(`geneticsTypeOption.${gt}` as 'geneticsTypeOption.fotoperiodica')

  return (
    <article
      className="overflow-visible rounded-[28px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:bg-[#252525] dark:shadow-black/25 dark:hover:shadow-black/35"
    >
      <div className="flex flex-row items-center gap-2 py-4 pl-4 pr-2 sm:gap-3 sm:pr-3">
        <CultivoRowActionsMenu menuAlign="start" onEdit={onEditRow} onDelete={onDeleteRow} />
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenDetail}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenDetail()
            }
          }}
          className="flex min-w-0 flex-1 cursor-pointer flex-row items-center gap-4 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
        >
        {thumbUrl && !imgFailed ? (
          <div className="w-[72px] h-[72px] shrink-0 overflow-hidden rounded-2xl" aria-hidden>
            <img
              src={thumbUrl}
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
            <CanspaceMarkThumb emptyThumb className="h-11 w-11" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <header className="pr-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-[#f1f1f1]">{title}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-[#8c8c8c]">
              <span>{subtitle}</span>
            </p>
          </header>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-gray-600 dark:text-[#a3a3a3]">
            <span className="inline-flex items-center gap-2 text-sm">
              {item.seedType === 'Clon' ? (
                <PlantNounIcon className={PROPAGACION_TYPE_ICON_CLASS} />
              ) : (
                <SeedNounIcon className={PROPAGACION_TYPE_ICON_CLASS} />
              )}
              <span className="font-medium text-gray-700 dark:text-[#d4d4d4]">
                {item.seedType === 'Clon' ? t('cultivation.originClone') : t('cultivation.originSemilla')}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm">
              {(item.geneticsType ?? 'fotoperiodica') === 'automatica' ? (
                <Timer className="h-4 w-4 shrink-0 text-gray-400 dark:text-[#8c8c8c]" strokeWidth={2} aria-hidden />
              ) : (
                <Sun className="h-4 w-4 shrink-0 text-gray-400 dark:text-[#8c8c8c]" strokeWidth={2} aria-hidden />
              )}
              <span className="font-medium text-gray-700 dark:text-[#d4d4d4]">{geneticsLabel}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Calendar className="h-4 w-4 text-gray-400 dark:text-[#8c8c8c]" strokeWidth={2} />
              <span className="font-medium text-gray-700 dark:text-[#d4d4d4]">{formatAgeLabel(item, t)}</span>
            </span>
            {isLote ? (
              <span className="inline-flex items-center gap-1.5 text-sm">
                <Layers className="h-4 w-4 shrink-0 text-gray-400 dark:text-[#8c8c8c]" strokeWidth={2} />
                <span className="font-medium text-gray-700 tabular-nums dark:text-[#d4d4d4]">
                  {current} {t('propagadorUi.units')}
                </span>
              </span>
            ) : null}
            {locationLine ? (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-sm">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400 dark:text-[#8c8c8c]" strokeWidth={2} aria-hidden />
                <span className="min-w-0 truncate font-medium text-gray-700 dark:text-[#d4d4d4]">{locationLine}</span>
              </span>
            ) : null}
          </div>
        </div>
        </div>

        <div className="flex shrink-0 justify-end pr-5 sm:pr-6">
          <button
            type="button"
            aria-label={vegFabLabelText}
            title={vegFabLabelText}
            aria-expanded={vegFabOpen}
            onClick={(e) => {
              e.stopPropagation()
              onMoveToVegetacion()
            }}
            onMouseEnter={() => setVegFabOpen(true)}
            onMouseLeave={() => setVegFabOpen(false)}
            onFocus={() => setVegFabOpen(true)}
            onBlur={() => setVegFabOpen(false)}
            className={cn(
              'relative flex h-12 shrink-0 cursor-pointer items-center overflow-hidden rounded-full text-sm font-semibold text-white',
              vegFabOpen ? 'justify-end' : 'justify-center',
              'hover:brightness-110 active:brightness-95',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#252525]',
            )}
            style={{
              width: vegFabOpen ? vegFabExpandedW : VEG_FAB_COLLAPSED_PX,
              backgroundColor: CULTIVO_BRAND_GREEN,
              transition: vegFabMotionOk ? 'width 420ms cubic-bezier(0.22, 1, 0.36, 1)' : undefined,
            }}
          >
            <span
              ref={vegFabMeasureRef}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 -z-10 flex w-max flex-row items-center gap-1.5 pl-4 pr-3 opacity-0"
            >
              <span className="whitespace-nowrap">{vegFabLabelText}</span>
              <ArrowRight className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            </span>
            <span
              className={cn(
                'relative z-[1] flex h-full w-max shrink-0 flex-row items-center',
                vegFabOpen ? 'justify-end gap-1.5 pl-4 pr-3' : 'justify-center gap-0',
              )}
            >
              <span
                className={cn(
                  'min-w-0 overflow-hidden whitespace-nowrap transition-[max-width] duration-300 ease-out',
                  vegFabOpen ? 'max-w-[min(90vw,720px)]' : 'max-w-0',
                )}
                aria-hidden={!vegFabOpen}
              >
                {vegFabLabelText}
              </span>
              <ArrowRight className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            </span>
          </button>
        </div>
      </div>
    </article>
  )
}
