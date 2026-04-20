import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Flower2, ScanLine, X } from 'lucide-react'
import { formatTopologyLabel } from '../../lib/locationTopologyFormat'
import { useTranslation } from '../../i18n/useTranslation'
import { LocationSelector } from '../location/LocationSelector'
import {
  FLOWER_BAJA_REASONS,
  FLOWER_PRUNING_OPTIONS,
  type FlowerBajaReasonCode,
  type FlowerPruningType,
} from '../../store/cultivationTypes'
import type { TopologySelection } from '../../store/locationTopologyTypes'
import { useLocationTopologyStore } from '../../store/useLocationTopologyStore'
import type { PlantCardItem } from './PlantCard'
import { cn } from '../../lib/cn'
import { SoftSelect } from '../ui/SoftSelect'
import { resolveCultivoPeerGroup } from '../../lib/cultivo/resolveCultivoPeerGroup'

export type MoveToFlowerConfirmPayload = {
  selectedIds: string[]
  bajasCount: number
  bajaReasonCode?: FlowerBajaReasonCode
  bajaReasonLabel?: string
  topology: TopologySelection
  locationLabel: string
  floweringStartDate: string
  pruningType: FlowerPruningType
  /** Semanas 12/12 — obligatorio si hay fotoperíodo entre las seleccionadas. */
  flowerDurationWeeks?: number
}

function normalizeBraceletKey(raw: string): string {
  return raw.trim().replace(/^#/, '').toLowerCase()
}

function plantMatchKey(p: PlantCardItem): string {
  const br = p.braceletId?.trim()
  if (br) return normalizeBraceletKey(br)
  return normalizeBraceletKey(p.id)
}

export const resolveVegPeerGroup = resolveCultivoPeerGroup

function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type MoveToFlowerModalProps = {
  open: boolean
  peerGroup: PlantCardItem[]
  onClose: () => void
  onConfirm: (payload: MoveToFlowerConfirmPayload) => void
  companyId: string
}

export function MoveToFlowerModal({
  open,
  peerGroup,
  onClose,
  onConfirm,
  companyId,
}: MoveToFlowerModalProps) {
  const { t } = useTranslation()
  const locLabels = useMemo(
    () => ({
      room: t('moveFlower.locRoom'),
      fixture: t('moveFlower.locFixture'),
      level: t('moveFlower.locLevel'),
      pickRoom: t('moveFlower.pickRoom'),
      pickFixture: t('moveFlower.pickFixture'),
      pickLevel: t('moveFlower.pickLevel'),
      emptyRooms: t('moveFlower.emptyRooms'),
      summary: t('moveFlower.summary'),
    }),
    [t],
  )
  const topoRooms = useLocationTopologyStore((s) => s.rooms)
  const topoFixtures = useLocationTopologyStore((s) => s.fixtures)
  const topoLevels = useLocationTopologyStore((s) => s.levels)

  const peerByKey = useMemo(() => {
    const m = new Map<string, PlantCardItem>()
    for (const p of peerGroup) {
      m.set(plantMatchKey(p), p)
    }
    return m
  }, [peerGroup])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [scanInput, setScanInput] = useState('')
  const [topology, setTopology] = useState<TopologySelection | null>(null)
  const [floweringStartDate, setFloweringStartDate] = useState(todayIsoDate)
  const [pruningType, setPruningType] = useState<FlowerPruningType>('ninguna')
  const [flowerWeeksStr, setFlowerWeeksStr] = useState('9')
  const [bajaReasonCode, setBajaReasonCode] = useState<'' | FlowerBajaReasonCode>('')
  const [formError, setFormError] = useState<string | null>(null)

  const scanRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setSelectedIds(new Set(peerGroup.map((p) => p.id)))
    setScanInput('')
    setTopology(null)
    setFloweringStartDate(todayIsoDate())
    setPruningType('ninguna')
    setFlowerWeeksStr('9')
    setBajaReasonCode('')
    setFormError(null)
  }, [peerGroup])

  useEffect(() => {
    if (open) {
      reset()
    }
  }, [open, reset])

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => scanRef.current?.focus(), 80)
      return () => window.clearTimeout(t)
    }
  }, [open])

  const bajasCount = peerGroup.length - selectedIds.size

  const selectedPhotoperiodPlants = useMemo(() => {
    return peerGroup.filter(
      (p) => selectedIds.has(p.id) && (p.geneticsType ?? 'fotoperiodica') !== 'automatica',
    )
  }, [peerGroup, selectedIds])

  const needsFlowerWeeks = selectedPhotoperiodPlants.length > 0

  const locationPreview = useMemo(() => {
    if (!topology?.roomId) return ''
    return formatTopologyLabel(topology, topoRooms, topoFixtures, topoLevels)
  }, [topology, topoRooms, topoFixtures, topoLevels])

  const bajaOptions = useMemo(
    () => [
      { value: '' as string, label: t('moveFlower.pickBaja') },
      ...FLOWER_BAJA_REASONS.map((r) => ({
        value: r.code as string,
        label: t(`flowerBaja.${r.code}` as 'flowerBaja.weak_plant'),
      })),
    ],
    [t],
  )

  const bajaChipText =
    bajaReasonCode === ''
      ? t('moveFlower.pickBaja')
      : t(`flowerBaja.${bajaReasonCode}` as 'flowerBaja.weak_plant')

  const pruningOptions = useMemo(
    () =>
      FLOWER_PRUNING_OPTIONS.map((o) => ({
        value: o.value,
        label: t(`flowerPruning.${o.value}` as 'flowerPruning.ninguna'),
      })),
    [t],
  )

  const pruningChipText = t(`flowerPruning.${pruningType}` as 'flowerPruning.ninguna')

  const togglePlant = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applyScan = () => {
    const key = normalizeBraceletKey(scanInput)
    if (!key) return
    const found = peerByKey.get(key)
    if (found) {
      setSelectedIds((prev) => new Set(prev).add(found.id))
      setScanInput('')
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (selectedIds.size < 1) {
      setFormError(t('moveFlower.errSelectPlant'))
      return
    }
    const top = topology
    if (!top?.roomId) {
      setFormError(t('moveFlower.errLocation'))
      return
    }
    if (!floweringStartDate.trim()) {
      setFormError(t('moveFlower.errFlowerDate'))
      return
    }
    if (bajasCount > 0 && !bajaReasonCode) {
      setFormError(t('moveFlower.errBajaReason'))
      return
    }

    let flowerDurationWeeks: number | undefined
    if (needsFlowerWeeks) {
      const w = Number(flowerWeeksStr.replace(',', '.'))
      if (!Number.isFinite(w) || w < 1 || w > 52) {
        setFormError(t('moveFlower.errWeeks'))
        return
      }
      flowerDurationWeeks = Math.round(w)
    }

    const bajaReasonLabel = bajaReasonCode
      ? t(`flowerBaja.${bajaReasonCode}` as 'flowerBaja.weak_plant')
      : undefined

    onConfirm({
      selectedIds: [...selectedIds],
      bajasCount,
      bajaReasonCode: bajaReasonCode || undefined,
      bajaReasonLabel,
      topology: top,
      locationLabel: locationPreview,
      floweringStartDate: floweringStartDate.trim(),
      pruningType,
      flowerDurationWeeks,
    })
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="max-h-[min(92vh,900px)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/60 bg-white/90 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl"
        role="dialog"
        aria-labelledby="move-flower-title"
        aria-modal="true"
      >
        <div className="sticky top-0 z-[1] flex items-start justify-between gap-3 border-b border-gray-100/90 bg-white/80 px-5 py-4 backdrop-blur-md">
          <div>
            <p id="move-flower-title" className="text-lg font-semibold text-gray-900">
              {t('moveFlower.title')}
            </p>
            <p className="mt-0.5 text-sm text-gray-500">{t('moveFlower.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label={t('moveFlower.closeAria')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid gap-8 lg:grid-cols-2">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Flower2 className="h-4 w-4 text-purple-600" strokeWidth={2} />
                {t('moveFlower.verifyTitle')}
              </div>
              <p className="text-xs leading-relaxed text-gray-500">{t('moveFlower.verifyHint')}</p>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <ScanLine
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    strokeWidth={2}
                  />
                  <input
                    ref={scanRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        applyScan()
                      }
                    }}
                    placeholder={t('moveFlower.scanPlaceholder')}
                    className="w-full rounded-xl border border-gray-200 bg-white/80 py-2.5 pl-10 pr-3 text-sm outline-none ring-green-500/0 transition-shadow focus:border-green-300 focus:ring-2 focus:ring-green-500/25"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyScan}
                  className="shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('common.add')}
                </button>
              </div>

              <p className="text-xs text-gray-500">
                {t('moveFlower.groupLine', {
                  n: peerGroup.length,
                  sel: selectedIds.size,
                  bajas: bajasCount,
                })}
              </p>

              <ul className="max-h-[220px] space-y-2 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/80 p-2">
                {peerGroup.map((p) => {
                  const checked = selectedIds.has(p.id)
                  const label = p.braceletId?.trim() || `#${p.id}`
                  return (
                    <li key={p.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                          checked
                            ? 'border-green-200 bg-white shadow-sm'
                            : 'border-transparent bg-white/50 hover:bg-white',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 accent-green-700"
                          checked={checked}
                          onChange={() => togglePlant(p.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">{p.strain}</p>
                          <p className="truncate text-xs text-gray-500">{label}</p>
                        </div>
                      </label>
                    </li>
                  )
                })}
              </ul>

              {bajasCount > 0 ? (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-amber-900">
                        {t('moveFlower.bajasBoxTitle', { n: bajasCount })}
                      </p>
                      <label className="mt-2 block text-xs font-medium text-amber-900/80">
                        {t('moveFlower.bajasReason')}
                      </label>
                      <div className="mt-1">
                        <SoftSelect
                          value={bajaReasonCode}
                          onChange={(v) =>
                            setBajaReasonCode(v as FlowerBajaReasonCode | '')
                          }
                          options={bajaOptions}
                          chipText={bajaChipText}
                          ariaLabel={t('moveFlower.bajasReason')}
                          variant="field"
                          warning={bajaReasonCode === ''}
                          triggerClassName="border-amber-200 bg-white text-gray-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="space-y-4">
              <div className="text-sm font-semibold text-gray-800">
                {t('moveFlower.sectionLocation')}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <p className="text-xs font-medium text-gray-600">{t('moveFlower.locationTitle')}</p>
                <p className="mt-1 text-[11px] text-gray-500">{t('moveFlower.cascadeHint')}</p>
                <div className="mt-3">
                  <LocationSelector
                    companyId={companyId}
                    value={topology}
                    onChange={setTopology}
                    labels={locLabels}
                  />
                </div>
                {locationPreview ? (
                  <p className="mt-2 text-xs font-medium text-green-800">{locationPreview}</p>
                ) : null}
              </div>

              <label className="block">
                <span className="text-xs font-medium text-gray-600">
                  {t('moveFlower.flowerStartLabel')}
                </span>
                <input
                  type="date"
                  value={floweringStartDate}
                  onChange={(e) => setFloweringStartDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-[11px] text-gray-400">
                  {t('moveFlower.forecastHint')}
                </span>
              </label>

              {needsFlowerWeeks ? (
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">
                    {t('moveFlower.weeksLabelLong')}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={flowerWeeksStr}
                    onChange={(e) => setFlowerWeeksStr(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                    placeholder={t('moveFlower.weeksPlaceholder')}
                  />
                  <span className="mt-1 block text-[11px] text-gray-500">
                    {t('moveFlower.weeksSaveHint')}
                  </span>
                </label>
              ) : null}

              <label className="block">
                <span className="text-xs font-medium text-gray-600">
                  {t('moveFlower.pruningSelectLabel')}
                </span>
                <div className="mt-1">
                  <SoftSelect
                    value={pruningType}
                    onChange={(v) => setPruningType(v as FlowerPruningType)}
                    options={pruningOptions}
                    chipText={pruningChipText}
                    ariaLabel={t('moveFlower.pruningSelectLabel')}
                    variant="field"
                    triggerClassName="border-gray-200 bg-white"
                  />
                </div>
              </label>
            </section>
          </div>

          {formError ? (
            <p className="mt-4 text-sm font-medium text-red-600" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('moveFlower.cancel')}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-500/25 hover:from-purple-500 hover:to-purple-600"
            >
              {t('moveFlower.submitLong')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
