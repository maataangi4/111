import { useEffect, useMemo, useState } from 'react'
import { formatTopologyLabel } from '../../lib/locationTopologyFormat'
import type { TopologySelection } from '../../store/locationTopologyTypes'
import { useLocationTopologyStore } from '../../store/useLocationTopologyStore'
import type { PlantCardItem } from '../cultivo/PlantCard'
import { EnvModalFrame } from '../cultivo/envFieldModals/EnvModalFrame'
import { LocationSelector } from '../location/LocationSelector'
import { cn } from '../../lib/cn'

type TFn = (k: string, vars?: Record<string, string | number>) => string

function looksLikeUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())
}

function braceletLine(p: PlantCardItem, t: TFn): string {
  const br = p.braceletId?.trim()
  if (br) {
    return br.startsWith('#') ? t('diario.bajaBracelet', { id: br }) : t('diario.bajaBraceletHash', { id: br.replace(/^#/, '') })
  }
  const id = p.id.trim()
  if (looksLikeUuid(id)) return t('diario.bajaBraceletUuid', { tail: id.slice(-8) })
  return t('diario.bajaBraceletHash', { id })
}

export function DiarioCuarentenaModal({
  open,
  onClose,
  companyId,
  locLabels,
  peerPlants,
  onConfirm,
  t,
}: {
  open: boolean
  onClose: () => void
  companyId: string
  locLabels: {
    room: string
    fixture: string
    level: string
    pickRoom: string
    pickFixture: string
    pickLevel: string
    emptyRooms: string
    summary: string
  }
  peerPlants: PlantCardItem[]
  onConfirm: (payload: {
    plantIds: string[]
    reason: string
    topology: TopologySelection
    locationLabel: string
  }) => void
  t: TFn
}) {
  const topoRooms = useLocationTopologyStore((s) => s.rooms)
  const topoFixtures = useLocationTopologyStore((s) => s.fixtures)
  const topoLevels = useLocationTopologyStore((s) => s.levels)

  const selectable = useMemo(
    () => peerPlants.filter((p) => p.cultivoUnitStatus !== 'baja'),
    [peerPlants],
  )

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [reason, setReason] = useState('')
  const [topology, setTopology] = useState<TopologySelection | null>(null)

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setReason('')
    setTopology(null)
  }, [open])

  const locationLabel = useMemo(() => {
    if (!topology?.roomId) return ''
    return formatTopologyLabel(topology, topoRooms, topoFixtures, topoLevels)
  }, [topology, topoRooms, topoFixtures, topoLevels])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const valid = selected.size >= 1 && reason.trim().length > 0 && topology?.roomId

  const handleSave = () => {
    if (!valid || !topology?.roomId) return
    const label = locationLabel.trim() || formatTopologyLabel(topology, topoRooms, topoFixtures, topoLevels)
    onConfirm({
      plantIds: [...selected],
      reason: reason.trim(),
      topology,
      locationLabel: label,
    })
    onClose()
  }

  if (!open) return null

  return (
    <EnvModalFrame
      title={t('diario.modalCuarentenaTitle')}
      onClose={onClose}
      footer={
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-amber-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={!valid}
          >
            {t('diario.modalCuarentenaSubmit')}
          </button>
        </div>
      }
    >
      <p className="mt-1 text-xs text-gray-600">{t('diario.modalCuarentenaHint')}</p>

      <div className="mt-4 max-h-[min(36vh,240px)] space-y-2 overflow-y-auto rounded-xl border border-gray-100 p-2">
        {selectable.length === 0 ? (
          <p className="text-sm text-amber-800">{t('diario.modalCuarentenaEmpty')}</p>
        ) : (
          selectable.map((p) => (
            <label
              key={p.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-gray-50',
                p.cultivoUnitStatus === 'quarantine' && 'bg-amber-50/40',
              )}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-amber-600"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
              />
              <span className="text-sm font-medium text-gray-900">{braceletLine(p, t)}</span>
            </label>
          ))
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {t('diario.cuarentenaReason')} <span className="text-red-500">*</span>
          </label>
          <textarea
            className="min-h-[72px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('diario.cuarentenaReasonPh')}
          />
        </div>

        <LocationSelector
          companyId={companyId}
          value={topology}
          onChange={setTopology}
          labels={locLabels}
          roomPurposeFilter="quarantine"
        />
        <p className="text-[10px] text-gray-500">{t('diario.cuarentenaRoomHint')}</p>
      </div>
    </EnvModalFrame>
  )
}
