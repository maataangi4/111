import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, ScanLine, X } from 'lucide-react'
import { formatTopologyLabel } from '../../lib/locationTopologyFormat'
import { useTranslation } from '../../i18n/useTranslation'
import { LocationSelector } from '../location/LocationSelector'
import type { TopologySelection } from '../../store/locationTopologyTypes'
import { useLocationTopologyStore } from '../../store/useLocationTopologyStore'
import type { PlantCardItem } from './PlantCard'
import { cn } from '../../lib/cn'

function normalizeBraceletKey(raw: string): string {
  return raw.trim().replace(/^#/, '').toLowerCase()
}

function plantMatchKey(p: PlantCardItem): string {
  const br = p.braceletId?.trim()
  if (br) return normalizeBraceletKey(br)
  return normalizeBraceletKey(p.id)
}

export type RelocatePlantsConfirmPayload = {
  plantIds: string[]
  topology: TopologySelection
  locationLabel: string
}

type RelocatePlantsModalProps = {
  open: boolean
  peerGroup: PlantCardItem[]
  companyId: string
  onClose: () => void
  onConfirm: (payload: RelocatePlantsConfirmPayload) => void
}

export function RelocatePlantsModal({
  open,
  peerGroup,
  companyId,
  onClose,
  onConfirm,
}: RelocatePlantsModalProps) {
  const { t } = useTranslation()
  const locLabels = useMemo(
    () => ({
      room: t('topologyUi.room'),
      fixture: t('topologyUi.fixture'),
      level: t('topologyUi.level'),
      pickRoom: t('topologyUi.pickRoom'),
      pickFixture: t('topologyUi.pickFixture'),
      pickLevel: t('topologyUi.pickLevel'),
      emptyRooms: t('topologyUi.emptyRooms'),
      summary: t('topologyUi.summary'),
    }),
    [t],
  )
  const topoRooms = useLocationTopologyStore((s) => (Array.isArray(s.rooms) ? s.rooms : []))
  const topoFixtures = useLocationTopologyStore((s) => (Array.isArray(s.fixtures) ? s.fixtures : []))
  const topoLevels = useLocationTopologyStore((s) => (Array.isArray(s.levels) ? s.levels : []))

  const relocable = useMemo(
    () => peerGroup.filter((p) => p.cultivoUnitStatus !== 'baja'),
    [peerGroup],
  )

  const peerByKey = useMemo(() => {
    const m = new Map<string, PlantCardItem>()
    for (const p of relocable) {
      m.set(plantMatchKey(p), p)
    }
    return m
  }, [relocable])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [scanInput, setScanInput] = useState('')
  const [topology, setTopology] = useState<TopologySelection | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const scanRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setSelectedIds(new Set(relocable.map((p) => p.id)))
    setScanInput('')
    setTopology(null)
    setFormError(null)
  }, [relocable])

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => scanRef.current?.focus(), 80)
      return () => window.clearTimeout(timer)
    }
  }, [open])

  const locationPreview = useMemo(() => {
    if (!topology?.roomId) return ''
    return formatTopologyLabel(topology, topoRooms, topoFixtures, topoLevels)
  }, [topology, topoRooms, topoFixtures, topoLevels])

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
    if (relocable.length < 1) {
      setFormError(t('relocate.errNoPlants'))
      return
    }
    if (selectedIds.size < 1) {
      setFormError(t('relocate.errSelectPlant'))
      return
    }
    const top = topology
    if (!top?.roomId?.trim()) {
      setFormError(t('relocate.errLocation'))
      return
    }
    const label = locationPreview.trim()
    if (!label) {
      setFormError(t('relocate.errLocation'))
      return
    }
    onConfirm({
      plantIds: [...selectedIds],
      topology: top,
      locationLabel: label,
    })
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="max-h-[min(92vh,900px)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/60 bg-white/90 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl"
        role="dialog"
        aria-labelledby="relocate-title"
        aria-modal="true"
      >
        <div className="sticky top-0 z-[1] flex items-start justify-between gap-3 border-b border-gray-100/90 bg-white/80 px-5 py-4 backdrop-blur-md">
          <div>
            <p id="relocate-title" className="text-lg font-semibold text-gray-900">
              {t('relocate.title')}
            </p>
            <p className="mt-0.5 text-sm text-gray-500">{t('relocate.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label={t('relocate.closeAria')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          {relocable.length < 1 ? (
            <p className="text-sm font-medium text-amber-800">{t('relocate.emptyRelocable')}</p>
          ) : (
            <div className="grid gap-8 lg:grid-cols-2">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <MapPin className="h-4 w-4 text-sky-600" strokeWidth={2} />
                  {t('relocate.verifyTitle')}
                </div>
                <p className="text-xs leading-relaxed text-gray-500">{t('relocate.verifyHint')}</p>

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
                      placeholder={t('relocate.scanPlaceholder')}
                      className="w-full rounded-xl border border-gray-200 bg-white/80 py-2.5 pl-10 pr-3 text-sm outline-none ring-sky-500/0 transition-shadow focus:border-sky-300 focus:ring-2 focus:ring-sky-500/25"
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
                  {t('relocate.groupLine', {
                    n: relocable.length,
                    sel: selectedIds.size,
                  })}
                </p>

                <ul className="max-h-[220px] space-y-2 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/80 p-2">
                  {relocable.map((p) => {
                    const checked = selectedIds.has(p.id)
                    const label = p.braceletId?.trim() || `#${p.id}`
                    return (
                      <li key={p.id}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                            checked
                              ? 'border-sky-200 bg-white shadow-sm'
                              : 'border-transparent bg-white/50 hover:bg-white',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 accent-sky-700"
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
              </section>

              <section className="space-y-4">
                <div className="text-sm font-semibold text-gray-800">{t('relocate.sectionLocation')}</div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                  <p className="text-xs font-medium text-gray-600">{t('relocate.locationTitle')}</p>
                  <p className="mt-1 text-[11px] text-gray-500">{t('relocate.cascadeHint')}</p>
                  <div className="mt-3">
                    <LocationSelector
                      companyId={companyId}
                      value={topology}
                      onChange={setTopology}
                      labels={locLabels}
                    />
                  </div>
                  {locationPreview ? (
                    <p className="mt-2 text-xs font-medium text-sky-800">{locationPreview}</p>
                  ) : null}
                </div>
              </section>
            </div>
          )}

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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={relocable.length < 1}
              className="rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/25 hover:from-sky-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('relocate.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
