import { useMemo } from 'react'
import { cn } from '../../lib/cn'
import {
  fixturesForRoom,
  formatTopologyLabel,
  levelsForFixture,
} from '../../lib/locationTopologyFormat'
import type { RoomPurpose, TopologySelection } from '../../store/locationTopologyTypes'
import {
  roomsForCompany,
  useLocationTopologyStore,
} from '../../store/useLocationTopologyStore'
import { SoftSelect } from '../ui/SoftSelect'

type LocationSelectorProps = {
  companyId: string
  value: TopologySelection | null
  onChange: (next: TopologySelection | null) => void
  className?: string
  /** Подписи (i18n снаружи). */
  labels: {
    room: string
    fixture: string
    level: string
    pickRoom: string
    pickFixture: string
    pickLevel: string
    emptyRooms: string
    summary: string
  }
  disabled?: boolean
  roomPurposeFilter?: RoomPurpose
  /** No mostrar la sala en el selector (p. ej. cuarentena al crear un lote nuevo). */
  excludeRoomPurposes?: RoomPurpose[]
  /** Placeholder solo en la píldora cerrada; en el menú solo salas reales. */
  hideRoomPlaceholderOption?: boolean
  /** Borde ámbar / estado warning cuando falta sala (p. ej. false en «Nuevo lote»). */
  showEmptyRoomHighlight?: boolean
  /** Texto gris en el chip cuando aún no hay sala elegida. */
  dimEmptyRoomChip?: boolean
}

/**
 * До 3 каскадных select: комната обязательна; стол и полка — только если есть в топологии.
 */
export function LocationSelector({
  companyId,
  value,
  onChange,
  className,
  labels,
  disabled,
  roomPurposeFilter,
  excludeRoomPurposes,
  hideRoomPlaceholderOption,
  showEmptyRoomHighlight = true,
  dimEmptyRoomChip = false,
}: LocationSelectorProps) {
  const rooms = useLocationTopologyStore((s) => (Array.isArray(s.rooms) ? s.rooms : []))
  const fixtures = useLocationTopologyStore((s) => (Array.isArray(s.fixtures) ? s.fixtures : []))
  const levels = useLocationTopologyStore((s) => (Array.isArray(s.levels) ? s.levels : []))

  const excludeSet = useMemo(
    () => (excludeRoomPurposes?.length ? new Set(excludeRoomPurposes) : null),
    [excludeRoomPurposes],
  )

  const roomList = useMemo(() => {
    let base = roomsForCompany(companyId, rooms)
    if (roomPurposeFilter) base = base.filter((r) => r.type === roomPurposeFilter)
    if (excludeSet) base = base.filter((r) => !excludeSet.has(r.type))
    return base
  }, [companyId, rooms, roomPurposeFilter, excludeSet])

  const roomId = value?.roomId ?? ''
  const fixtureList = useMemo(
    () => (roomId ? fixturesForRoom(roomId, fixtures) : []),
    [roomId, fixtures],
  )

  const fixtureId = value?.fixtureId ?? ''
  const levelList = useMemo(
    () => (fixtureId ? levelsForFixture(fixtureId, levels) : []),
    [fixtureId, levels],
  )

  const preview = useMemo(() => {
    if (!value?.roomId) return ''
    return formatTopologyLabel(value, rooms, fixtures, levels)
  }, [value, rooms, fixtures, levels])

  const setRoom = (id: string) => {
    if (!id) {
      onChange(null)
      return
    }
    onChange({ roomId: id })
  }

  const setFixture = (id: string) => {
    if (!value?.roomId) return
    if (!id) {
      onChange({ roomId: value.roomId })
      return
    }
    onChange({ roomId: value.roomId, fixtureId: id })
  }

  const setLevel = (id: string) => {
    if (!value?.roomId) return
    if (!id) {
      onChange({
        roomId: value.roomId,
        fixtureId: value.fixtureId,
      })
      return
    }
    onChange({
      roomId: value.roomId,
      fixtureId: value.fixtureId,
      levelId: id,
    })
  }

  const roomOptions = useMemo(() => {
    const rows = roomList.map((r) => ({ value: r.id, label: r.name }))
    if (hideRoomPlaceholderOption) return rows
    return [{ value: '' as const, label: labels.pickRoom }, ...rows]
  }, [roomList, labels.pickRoom, hideRoomPlaceholderOption])

  const roomChip =
    roomList.find((r) => r.id === roomId)?.name ?? labels.pickRoom

  const fixtureOptions = useMemo(
    () => [
      { value: '' as const, label: labels.pickFixture },
      ...fixtureList.map((f) => ({ value: f.id, label: f.name })),
    ],
    [fixtureList, labels.pickFixture],
  )

  const fixtureChip =
    fixtureList.find((f) => f.id === fixtureId)?.name ?? labels.pickFixture

  const levelOptions = useMemo(
    () => [
      { value: '' as const, label: labels.pickLevel },
      ...levelList.map((l) => ({ value: l.id, label: l.name })),
    ],
    [levelList, labels.pickLevel],
  )

  const levelChip =
    levelList.find((l) => l.id === (value?.levelId ?? ''))?.name ?? labels.pickLevel

  const fieldCls =
    'rounded-xl border-gray-200 focus-visible:ring-green-500/25 disabled:bg-gray-100'

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          {labels.room} <span className="text-red-500">*</span>
        </label>
        <SoftSelect
          value={roomId}
          onChange={(v) => setRoom(v)}
          options={roomOptions}
          chipText={roomChip}
          ariaLabel={labels.room}
          variant="field"
          disabled={disabled}
          chipClassName={dimEmptyRoomChip && !roomId ? 'text-gray-400' : undefined}
          triggerClassName={cn(
            fieldCls,
            disabled && 'bg-gray-100',
            showEmptyRoomHighlight && !roomId && 'border-amber-200/80',
          )}
          warning={Boolean(showEmptyRoomHighlight && !roomId && roomList.length > 0)}
        />
        {roomList.length === 0 ? (
          <p className="mt-1 text-xs text-amber-700">{labels.emptyRooms}</p>
        ) : null}
      </div>

      {roomId && fixtureList.length > 0 ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">{labels.fixture}</label>
          <SoftSelect
            value={fixtureId}
            onChange={(v) => setFixture(v)}
            options={fixtureOptions}
            chipText={fixtureChip}
            ariaLabel={labels.fixture}
            variant="field"
            disabled={disabled}
            triggerClassName={cn(fieldCls, disabled && 'bg-gray-100')}
          />
        </div>
      ) : null}

      {roomId && fixtureId && levelList.length > 0 ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">{labels.level}</label>
          <SoftSelect
            value={value?.levelId ?? ''}
            onChange={(v) => setLevel(v)}
            options={levelOptions}
            chipText={levelChip}
            ariaLabel={labels.level}
            variant="field"
            disabled={disabled}
            triggerClassName={cn(fieldCls, disabled && 'bg-gray-100')}
          />
        </div>
      ) : null}

      {preview ? (
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-600">{labels.summary}</span>
          {preview}
        </p>
      ) : null}
    </div>
  )
}
