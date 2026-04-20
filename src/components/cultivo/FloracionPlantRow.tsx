import { useEffect, useMemo, useState } from 'react'
import { Calendar, Clock, MapPin, Scissors, ShieldAlert, Tags } from 'lucide-react'
import { cn } from '../../lib/cn'
import { type FlowerPruningType } from '../../store/cultivationTypes'
import { CanspaceMarkThumb } from './CanspaceMarkThumb'
import { CultivoRowActionsMenu } from './CultivoRowActionsMenu'
import { useTranslation } from '../../i18n/useTranslation'
import { useCultivationStore } from '../../store/useCultivationStore'
import type { PlantCardItem } from './PlantCard'

function looksLikeUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id.trim(),
  )
}

function formatPulseraLabel(
  item: PlantCardItem,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  const br = item.braceletId?.trim()
  if (br) {
    return br.startsWith('#')
      ? t('floracionRow.bracelet', { id: br })
      : t('floracionRow.braceletHash', { id: br.replace(/^#/, '') })
  }
  const id = item.id.trim()
  if (looksLikeUuid(id)) {
    return t('floracionRow.braceletUuid', { tail: id.slice(-8) })
  }
  return t('floracionRow.braceletHash', { id })
}

function formatFlorDayLine(
  item: PlantCardItem,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  const startedAt = item.floracionStartedAt?.trim()
  if (startedAt) {
    const ms = Date.parse(startedAt)
    if (Number.isFinite(ms)) {
      const elapsedMs = Math.max(0, Date.now() - ms)
      const dayN = Math.floor(elapsedMs / 86400000) + 1
      return t('floracionRow.flowerDay', { n: dayN })
    }
  }
  if (item.ageDays != null && Number.isFinite(item.ageDays)) {
    return t('floracionRow.flowerDay', { n: Math.max(1, Math.round(item.ageDays)) })
  }
  const m = item.stageTag.match(/(\d+)/)
  if (m) return t('floracionRow.flowerDay', { n: m[1]! })
  return t('floracionRow.flowerTag', { tag: item.stageTag })
}

function formatLocationInline(raw: string): string {
  return raw
    .split(/\s*•\s*|\s*·\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' / ')
}

function strainBankImageUrl(
  strainName: string | undefined,
  geneticsBank: { name: string; imageUrl: string }[],
): string {
  const key = String(strainName ?? '').trim().toLowerCase()
  return geneticsBank.find((g) => g.name.trim().toLowerCase() === key)?.imageUrl?.trim() ?? ''
}

function pruningLabel(
  pruning: FlowerPruningType | undefined,
  t: (k: string, v?: Record<string, string | number>) => string,
): string | null {
  if (!pruning || pruning === 'ninguna') return null
  return t(`flowerPruning.${pruning}` as 'flowerPruning.lollipopping')
}

export function FloracionPlantRow({
  item,
  onOpenDetail,
  onHarvestClick,
  onEditRow,
  onDeleteRow,
  interactive = true,
}: {
  item: PlantCardItem
  onOpenDetail: () => void
  onHarvestClick?: () => void
  onEditRow: () => void
  onDeleteRow: () => void
  interactive?: boolean
}) {
  const { t } = useTranslation()
  const geneticsBank = useCultivationStore((s) => s.geneticsBank)
  const thumbUrl = useMemo(
    () => strainBankImageUrl(item.strain, geneticsBank),
    [geneticsBank, item.strain],
  )
  const [imgFailed, setImgFailed] = useState(false)
  useEffect(() => {
    setImgFailed(false)
  }, [thumbUrl])

  const isBaja = item.cultivoUnitStatus === 'baja'
  const isQuarantine = item.cultivoUnitStatus === 'quarantine'
  const locationLine = item.location?.trim() ? formatLocationInline(item.location) : ''
  const pulseraLabel = formatPulseraLabel(item, t)
  const florLine = formatFlorDayLine(item, t)
  const startLine = item.floweringStartDate?.trim()
    ? t('floracionRow.startFlower', { date: item.floweringStartDate.trim() })
    : null
  const podaLine = pruningLabel(item.flowerPruningType, t)
  const isFotoperiod =
    (item.geneticsType ?? 'fotoperiodica') !== 'automatica' &&
    item.flowerDurationWeeks != null &&
    Number.isFinite(item.flowerDurationWeeks)

  const leftClass = cn(
    'flex min-w-0 flex-1 flex-row items-center gap-4 rounded-2xl outline-none',
    interactive && 'cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-400/60',
  )

  const leftInner = (
    <>
      {thumbUrl && !imgFailed ? (
        <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl" aria-hidden>
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
          <h3 className="text-lg font-bold text-gray-900">{item.strain}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium tracking-wide text-gray-400">
            {isQuarantine ? (
              <span className="inline-flex shrink-0" title={t('diario.badgeCuarentena')}>
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" strokeWidth={2} aria-hidden />
              </span>
            ) : (
              <Tags className="h-3.5 w-3.5 shrink-0 text-gray-400" strokeWidth={2} aria-hidden />
            )}
            <span className={cn('normal-case', isBaja && 'text-gray-400 line-through decoration-gray-400')}>{pulseraLabel}</span>
            {isBaja ? (
              <span className="ml-1 text-[10px] font-bold uppercase text-red-700">{t('diario.badgeBaja')}</span>
            ) : null}
          </p>
        </header>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-gray-600">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Calendar className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} aria-hidden />
            <span className="font-medium text-gray-700">{florLine}</span>
          </span>
          {startLine ? (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Calendar className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} aria-hidden />
              <span className="font-medium text-gray-700">{startLine}</span>
            </span>
          ) : null}
          {isFotoperiod ? (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 shrink-0 text-purple-500/80" strokeWidth={2} aria-hidden />
              <span className="font-medium text-gray-700">
                {t('floracionRow.weeks12', { w: item.flowerDurationWeeks! })}
              </span>
            </span>
          ) : null}
          {podaLine ? (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Scissors className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} aria-hidden />
              <span className="font-medium text-gray-700">
                {t('floracionRow.pruningLine', { label: podaLine })}
              </span>
            </span>
          ) : null}
          {locationLine ? (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} aria-hidden />
              <span className="min-w-0 truncate font-medium text-gray-700">{locationLine}</span>
            </span>
          ) : null}
        </div>
      </div>
    </>
  )

  return (
    <article
      className={cn(
        'overflow-visible rounded-[28px] border border-gray-100/90 bg-[#fdfdfd] shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]',
        isBaja && 'opacity-[0.72]',
        isQuarantine && !isBaja && 'ring-1 ring-amber-200/80',
      )}
    >
      <div className="flex flex-row items-center gap-2 py-4 pl-4 pr-2 sm:gap-3 sm:pr-3">
        <CultivoRowActionsMenu menuAlign="start" onEdit={onEditRow} onDelete={onDeleteRow} />
        {interactive ? (
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
            className={leftClass}
          >
            {leftInner}
          </div>
        ) : (
          <div className={leftClass}>{leftInner}</div>
        )}

        <div className="flex shrink-0 justify-end">
          {!isBaja ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onHarvestClick?.()
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-white/60 px-4 py-2 text-sm font-semibold text-purple-700 backdrop-blur-md',
                'transition-colors duration-200 hover:border-purple-700 hover:bg-purple-700 hover:text-white',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:ring-offset-2',
              )}
            >
              <Scissors className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              {t('floracionRow.harvest')}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
