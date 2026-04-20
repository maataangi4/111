import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { GitBranch, X } from 'lucide-react'
import { formatTopologyLabel } from '../../lib/locationTopologyFormat'
import { useTranslation } from '../../i18n/useTranslation'
import { LocationSelector } from '../location/LocationSelector'
import type { TopologySelection } from '../../store/locationTopologyTypes'
import { useLocationTopologyStore } from '../../store/useLocationTopologyStore'
import type { PlantCardItem } from './PlantCard'

type DividirLoteModalProps = {
  open: boolean
  plants: PlantCardItem[]
  companyId: string
  onClose: () => void
  onConfirm: (moveCount: number, topology: TopologySelection, locationLabel: string) => void
}

export function DividirLoteModal({
  open,
  plants,
  companyId,
  onClose,
  onConfirm,
}: DividirLoteModalProps) {
  const { t } = useTranslation()
  const rooms = useLocationTopologyStore((s) => s.rooms)
  const fixtures = useLocationTopologyStore((s) => s.fixtures)
  const levels = useLocationTopologyStore((s) => s.levels)

  const activas = useMemo(
    () => plants.filter((p) => p.cultivoUnitStatus !== 'baja').length,
    [plants],
  )
  const maxMove = Math.max(0, activas - 1)

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

  const [countStr, setCountStr] = useState('1')
  const [topology, setTopology] = useState<TopologySelection | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const rep = plants.at(0)

  const reset = useCallback(() => {
    setCountStr(maxMove >= 1 ? '1' : '0')
    setTopology(null)
    setFormError(null)
  }, [maxMove])

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const currentTopo: TopologySelection | null =
    rep?.topologyRoomId?.trim()
      ? {
          roomId: rep.topologyRoomId,
          fixtureId: rep.topologyFixtureId,
          levelId: rep.topologyLevelId,
        }
      : null

  const sameLocation = Boolean(
    topology?.roomId &&
      currentTopo &&
      currentTopo.roomId === topology.roomId &&
      (currentTopo.fixtureId ?? '') === (topology.fixtureId ?? '') &&
      (currentTopo.levelId ?? '') === (topology.levelId ?? ''),
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!rep || maxMove < 1) return
    const n = Math.floor(Number(countStr.replace(',', '.')) || 0)
    if (n < 1 || n > maxMove) {
      setFormError(t('loteSplit.errRange', { max: String(maxMove) }))
      return
    }
    if (!topology?.roomId?.trim()) {
      setFormError(t('loteSplit.errTopology'))
      return
    }
    const locationLabel = formatTopologyLabel(topology, rooms, fixtures, levels)
    if (!locationLabel.trim()) {
      setFormError(t('loteSplit.errTopology'))
      return
    }
    if (sameLocation) {
      const ok = window.confirm(t('loteSplit.sameLocationWarn'))
      if (!ok) return
    }
    onConfirm(n, topology, locationLabel.trim())
    onClose()
  }

  if (!open || !rep || activas < 2) return null

  return (
    <div
      className="fixed inset-0 z-[63] flex items-center justify-center overflow-y-auto bg-black/35 p-4 py-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="my-auto w-full max-w-md rounded-3xl border border-white/70 bg-white p-5 shadow-2xl"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-800">
              <GitBranch className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <p className="text-lg font-semibold text-gray-900">{t('loteSplit.title')}</p>
              <p className="text-xs text-gray-500">{rep.strain}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
            aria-label={t('common.cancel')}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600">
              {t('loteSplit.moveCountLabel')}
            </label>
            <p className="mt-0.5 text-[11px] text-gray-500">
              {t('loteSplit.moveCountHint', { n: String(activas) })}
            </p>
            <input
              type="number"
              min={1}
              max={maxMove}
              className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={countStr}
              onChange={(ev) => setCountStr(ev.target.value)}
              required
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600">{t('loteSplit.newLocationLabel')}</p>
            <div className="mt-2">
              <LocationSelector
                companyId={companyId}
                value={topology}
                onChange={setTopology}
                labels={locLabels}
              />
            </div>
          </div>

          {sameLocation && topology?.roomId ? (
            <p className="text-xs text-amber-800">{t('loteSplit.sameLocationHint')}</p>
          ) : null}

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              {t('loteSplit.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
