import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Calendar,
  Layers,
  Leaf,
  MapPin,
  Package,
  Scissors,
  ShieldAlert,
  Sprout,
  Sun,
  Timer,
  Zap,
} from 'lucide-react'
import { resolvePlantSupplyOriginLabel } from '../../lib/cultivo/resolvePlantSupplyOrigin'
import { formatTopologyLabel } from '../../lib/locationTopologyFormat'
import { daysUntilYmd, expectedAutoFloweringDateIso } from '../../lib/geneticsAutoFlower'
import { useLocationTopologyStore } from '../../store/useLocationTopologyStore'
import { useCrmStore } from '../../store/useCrmStore'
import { useCultivationStore } from '../../store/useCultivationStore'
import { useTranslation } from '../../i18n/useTranslation'
import { cn } from '../../lib/cn'
import type { PlantCardItem } from './PlantCard'
import { CanspaceMarkThumb } from './CanspaceMarkThumb'
import { CultivoRowActionsMenu } from './CultivoRowActionsMenu'
import { SeedNounIcon } from './SeedNounIcon'
import { PlantNounIcon } from './PlantNounIcon'
import { PROPAGACION_TYPE_ICON_CLASS } from './propagacionTypeIconStroke'

function formatLocationChevrons(raw: string): string {
  return raw
    .split(/\s*•\s*|\s*·\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' > ')
}

function strainBankImageUrl(
  strainName: string | undefined,
  geneticsBank: { name: string; imageUrl: string }[],
): string {
  const key = String(strainName ?? '').trim().toLowerCase()
  return geneticsBank.find((g) => g.name.trim().toLowerCase() === key)?.imageUrl?.trim() ?? ''
}

function topologyKey(p: PlantCardItem): string {
  return `${p.topologyRoomId ?? ''}|${p.topologyFixtureId ?? ''}|${p.topologyLevelId ?? ''}`
}

function vegDayLine(item: PlantCardItem, t: (k: string, v?: Record<string, string | number>) => string): string {
  const startedAt = item.vegetacionStartedAt?.trim()
  if (startedAt) {
    const ms = Date.parse(startedAt)
    if (Number.isFinite(ms)) {
      const elapsedMs = Math.max(0, Date.now() - ms)
      const dayN = Math.floor(elapsedMs / 86400000) + 1
      return t('vegetacionRow.vegDay', { n: dayN })
    }
  }
  if (item.ageDays != null && Number.isFinite(item.ageDays)) {
    return t('vegetacionRow.vegDay', { n: Math.max(1, Math.round(item.ageDays)) })
  }
  const m = String(item.stageTag ?? '').match(/(\d+)/)
  if (m) return t('vegetacionRow.vegDay', { n: m[1]! })
  return t('vegetacionRow.vegTag', { tag: String(item.stageTag ?? '') })
}

function cosechaDayLine(item: PlantCardItem, t: (k: string, v?: Record<string, string | number>) => string): string {
  const startedAt = item.cosechaStartedAt?.trim()
  if (startedAt) {
    const ms = Date.parse(startedAt)
    if (Number.isFinite(ms)) {
      const elapsedMs = Math.max(0, Date.now() - ms)
      const dayN = Math.floor(elapsedMs / 86400000) + 1
      return t('cosechaDetail.cosechaDay', { n: dayN })
    }
  }
  if (item.ageDays != null && Number.isFinite(item.ageDays)) {
    return t('cosechaDetail.cosechaDay', { n: Math.max(1, Math.round(item.ageDays)) })
  }
  const m = String(item.stageTag ?? '').match(/(\d+)/)
  if (m) return t('cosechaDetail.cosechaDay', { n: m[1]! })
  return t('cosechaDetail.cosechaDay', { n: 1 })
}

function florDayLine(item: PlantCardItem, t: (k: string, v?: Record<string, string | number>) => string): string {
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
  const m = String(item.stageTag ?? '').match(/(\d+)/)
  if (m) return t('floracionRow.flowerDay', { n: m[1]! })
  return t('floracionRow.flowerTag', { tag: String(item.stageTag ?? '') })
}

export function CultivoLoteListRow({
  variant,
  plants,
  onOpenDetail,
  onPrimaryAction,
  onEditRow,
  onDeleteBatch,
  onSplitLote,
}: {
  variant: 'vegetacion' | 'floracion' | 'cosecha'
  plants: PlantCardItem[]
  onOpenDetail: () => void
  onPrimaryAction: () => void
  onEditRow: () => void
  onDeleteBatch: () => void
  /** Dividir lote (≥2 activas). */
  onSplitLote?: () => void
}) {
  const { t } = useTranslation()
  const stock = useCrmStore((s) => s.stock)
  const geneticsBank = useCultivationStore((s) => (Array.isArray(s.geneticsBank) ? s.geneticsBank : []))
  const topoRooms = useLocationTopologyStore((s) => (Array.isArray(s.rooms) ? s.rooms : []))
  const topoFixtures = useLocationTopologyStore((s) => (Array.isArray(s.fixtures) ? s.fixtures : []))
  const topoLevels = useLocationTopologyStore((s) => (Array.isArray(s.levels) ? s.levels : []))

  const rep = plants[0]!
  const thumbUrl = useMemo(
    () => strainBankImageUrl(rep.strain, geneticsBank),
    [geneticsBank, rep.strain],
  )
  const [imgFailed, setImgFailed] = useState(false)
  useEffect(() => {
    setImgFailed(false)
  }, [thumbUrl])

  const total = plants.length
  const activas = useMemo(
    () => plants.filter((p) => p.cultivoUnitStatus !== 'baja').length,
    [plants],
  )
  const enCuarentena = useMemo(
    () => plants.filter((p) => p.cultivoUnitStatus === 'quarantine').length,
    [plants],
  )

  const loteLabel = rep.inaseLegalLotLabel?.trim()
    ? rep.inaseLegalLotLabel.trim()
    : rep.sourceBatchId?.trim()
      ? t('cultivoBoard.loteRowId', { id: rep.sourceBatchId.trim() })
      : t('cultivoBoard.loteRowSingle')

  const supplyOriginLine = useMemo(
    () => resolvePlantSupplyOriginLabel(rep, stock),
    [rep, stock],
  )

  const locationLine = useMemo(() => {
    const t0 = topologyKey(rep)
    const mixedTopo = plants.some((p) => topologyKey(p) !== t0)
    if (mixedTopo) return t('cultivoBoard.batchLocationMixed')
    if (rep.topologyRoomId) {
      const topo = formatTopologyLabel(
        {
          roomId: rep.topologyRoomId,
          fixtureId: rep.topologyFixtureId,
          levelId: rep.topologyLevelId,
        },
        topoRooms,
        topoFixtures,
        topoLevels,
        ' > ',
      )
      if (topo.trim()) return topo
    }
    if (rep.location?.trim()) return formatLocationChevrons(rep.location)
    return ''
  }, [plants, rep, topoRooms, topoFixtures, topoLevels, t])

  const geneticsType = rep.geneticsType ?? 'fotoperiodica'
  const geneticsLabel = t(`geneticsTypeOption.${geneticsType}` as 'geneticsTypeOption.fotoperiodica')
  const GeneticsIcon = geneticsType === 'automatica' ? Zap : Sun

  const stageLine =
    variant === 'vegetacion'
      ? vegDayLine(rep, t)
      : variant === 'cosecha'
        ? cosechaDayLine(rep, t)
        : florDayLine(rep, t)

  const inicioVeg = variant === 'vegetacion' ? rep.vegetacionStartDate?.trim() : null
  const autoFlowerExpectedIso =
    variant === 'vegetacion' && geneticsType === 'automatica'
      ? expectedAutoFloweringDateIso(rep.date)
      : null
  const autoFlowerDaysLeft =
    autoFlowerExpectedIso != null ? daysUntilYmd(autoFlowerExpectedIso) : null

  const canPrimary = variant !== 'cosecha' && activas >= 1

  const qtySubtitle =
    activas === total
      ? t('cultivoBoard.loteRowQtyAll', { n: total })
      : t('cultivoBoard.loteRowQtyPartial', { activas, total })

  return (
    <article
      className={cn(
        'overflow-visible rounded-[28px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:bg-[#252525] dark:shadow-black/25 dark:hover:shadow-black/35',
        enCuarentena > 0 && 'ring-1 ring-amber-200/70 dark:ring-amber-500/40',
      )}
    >
      <div className="flex flex-row items-center gap-2 py-4 pl-4 pr-2 sm:gap-3 sm:pr-3">
        <CultivoRowActionsMenu
          menuAlign="start"
          onEdit={onEditRow}
          onDelete={onDeleteBatch}
          onSplit={activas >= 2 ? onSplitLote : undefined}
        />
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
          className={cn(
            'flex min-w-0 flex-1 cursor-pointer flex-row items-center gap-4 rounded-2xl outline-none',
            variant === 'vegetacion'
              ? 'focus-visible:ring-2 focus-visible:ring-green-400/60'
              : 'focus-visible:ring-2 focus-visible:ring-purple-400/60',
          )}
        >
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
              <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold text-gray-900">
                <Sprout className="h-4 w-4 shrink-0 text-green-600/80" strokeWidth={2} aria-hidden />
                <span>
                  {String(rep.strain ?? '')}
                  {rep.lotSegmentSuffix?.trim() ? (
                    <span className="font-semibold text-gray-500"> — {rep.lotSegmentSuffix.trim()}</span>
                  ) : null}
                </span>
              </h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-gray-600">
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} />
                  {loteLabel}
                </span>
                <span className="font-semibold tabular-nums text-gray-800 dark:text-[#f1f1f1]">{qtySubtitle}</span>
                {enCuarentena > 0 ? (
                  <span
                    className="inline-flex items-center gap-0.5 text-amber-700"
                    title={t('diario.badgeCuarentena')}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2} />
                    <span className="text-[10px] font-bold uppercase">{enCuarentena}</span>
                  </span>
                ) : null}
              </p>
            </header>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-gray-600 dark:text-[#a3a3a3]">
              <span className="inline-flex items-center gap-1.5 text-sm">
                {rep.seedType === 'Clon' ? (
                  <PlantNounIcon className={PROPAGACION_TYPE_ICON_CLASS} />
                ) : (
                  <SeedNounIcon className={PROPAGACION_TYPE_ICON_CLASS} />
                )}
                <span className="font-medium text-gray-700 dark:text-[#d4d4d4]">
                  {rep.seedType === 'Clon' ? t('cultivation.originClone') : t('cultivation.originSemilla')}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm">
                <GeneticsIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-[#8c8c8c]" strokeWidth={2} aria-hidden />
                <span className="font-medium text-gray-700 dark:text-[#d4d4d4]">{geneticsLabel}</span>
              </span>
              {inicioVeg ? (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <Leaf className="h-4 w-4 shrink-0 text-green-600/70" strokeWidth={2} aria-hidden />
                  <span className="font-medium text-gray-700 dark:text-[#d4d4d4]">
                    {t('vegetacionRow.inicioVeg', { date: inicioVeg })}
                  </span>
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 text-sm">
                <Calendar className="h-4 w-4 shrink-0 text-gray-400 dark:text-[#8c8c8c]" strokeWidth={2} aria-hidden />
                <span className="font-medium text-gray-700 dark:text-[#d4d4d4]">{stageLine}</span>
              </span>
              {locationLine ? (
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-sm">
                  <MapPin className="h-4 w-4 shrink-0 text-gray-400 dark:text-[#8c8c8c]" strokeWidth={2} aria-hidden />
                  <span className="min-w-0 truncate font-medium text-gray-700 dark:text-[#d4d4d4]" title={locationLine}>
                    {locationLine}
                  </span>
                </span>
              ) : null}
              {supplyOriginLine ? (
                <span
                  className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-sm"
                  title={`${t('cultivoBoard.supplyOriginTitle')}: ${supplyOriginLine}`}
                >
                  <Package
                    className="h-4 w-4 shrink-0 text-gray-400 dark:text-[#8c8c8c]"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate font-medium text-gray-700 dark:text-[#d4d4d4]">
                    {supplyOriginLine}
                  </span>
                </span>
              ) : null}
            </div>

            {variant === 'vegetacion' && autoFlowerExpectedIso != null && autoFlowerDaysLeft != null ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/45 dark:text-amber-100">
                <Timer className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={2} aria-hidden />
                <div className="min-w-0 leading-snug">
                  <p className="font-semibold">
                    {autoFlowerDaysLeft > 0
                      ? t('vegetacionRow.autoFlowerIn', { days: autoFlowerDaysLeft })
                      : t('vegetacionRow.autoFlowerReady')}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {variant === 'cosecha' ? null : (
          <div className="flex shrink-0 justify-end">
            <button
              type="button"
              disabled={!canPrimary}
              onClick={(e) => {
                e.stopPropagation()
                onPrimaryAction()
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border bg-white/60 px-4 py-2 text-sm font-semibold backdrop-blur-md',
                'transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                variant === 'vegetacion'
                  ? 'border-green-500/30 text-green-700 hover:border-green-700 hover:bg-green-700 hover:text-white focus-visible:ring-green-500/40 dark:border-green-500/35 dark:bg-[#2a2a2a] dark:text-green-400 dark:backdrop-blur-none dark:hover:bg-green-600 dark:hover:text-white dark:focus-visible:ring-offset-[#252525]'
                  : 'border-purple-500/30 text-purple-700 hover:border-purple-700 hover:bg-purple-700 hover:text-white focus-visible:ring-purple-500/40 dark:border-purple-500/35 dark:bg-[#2a2a2a] dark:text-purple-300 dark:backdrop-blur-none dark:hover:bg-purple-600 dark:hover:text-white dark:focus-visible:ring-offset-[#252525]',
                !canPrimary && 'pointer-events-none opacity-45',
              )}
            >
              {variant === 'vegetacion' ? (
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              ) : (
                <Scissors className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              )}
              {variant === 'vegetacion' ? t('vegetacionRow.moveToFlower') : t('floracionRow.harvest')}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
