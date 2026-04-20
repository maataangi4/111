import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Layers, Plus, Trash2 } from 'lucide-react'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import { fixturesForRoom, levelsForFixture } from '../../lib/locationTopologyFormat'
import {
  ROOM_PURPOSE_LABELS,
  type RoomPurpose,
} from '../../store/locationTopologyTypes'
import {
  DEFAULT_TOPOLOGY_COMPANY_ID,
  roomsForCompany,
  useLocationTopologyStore,
} from '../../store/useLocationTopologyStore'
import { SoftSelect } from '../ui/SoftSelect'

const PURPOSE_OPTIONS: RoomPurpose[] = [
  'propagation',
  'veg',
  'flower',
  'drying',
  'mother',
  'quarantine',
  'other',
]

export function LocationTopologySettings({
  title,
  subtitle,
  companyId = DEFAULT_TOPOLOGY_COMPANY_ID,
  labels,
}: {
  title: string
  subtitle: string
  companyId?: string
  labels: {
    addRoom: string
    addFixture: string
    addLevel: string
    roomNamePh: string
    fixtureNamePh: string
    levelNamePh: string
    deleteRoom: string
    deleteFixture: string
    deleteLevel: string
    type: string
    resetSample: string
    confirmDeleteRoom: string
  }
}) {
  const rooms = useLocationTopologyStore((s) => s.rooms)
  const fixtures = useLocationTopologyStore((s) => s.fixtures)
  const levels = useLocationTopologyStore((s) => s.levels)
  const addRoom = useLocationTopologyStore((s) => s.addRoom)
  const updateRoom = useLocationTopologyStore((s) => s.updateRoom)
  const removeRoom = useLocationTopologyStore((s) => s.removeRoom)
  const addFixture = useLocationTopologyStore((s) => s.addFixture)
  const updateFixture = useLocationTopologyStore((s) => s.updateFixture)
  const removeFixture = useLocationTopologyStore((s) => s.removeFixture)
  const addLevel = useLocationTopologyStore((s) => s.addLevel)
  const updateLevel = useLocationTopologyStore((s) => s.updateLevel)
  const removeLevel = useLocationTopologyStore((s) => s.removeLevel)
  const resetToSample = useLocationTopologyStore((s) => s.resetToSample)

  const [openRooms, setOpenRooms] = useState<Record<string, boolean>>({})
  const [openFx, setOpenFx] = useState<Record<string, boolean>>({})
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomType, setNewRoomType] = useState<RoomPurpose>('veg')
  const [newFxName, setNewFxName] = useState<Record<string, string>>({})
  const [newLvName, setNewLvName] = useState<Record<string, string>>({})

  const purposeSelectOptions = useMemo(
    () =>
      PURPOSE_OPTIONS.map((p) => ({
        value: p,
        label: ROOM_PURPOSE_LABELS[p],
      })),
    [],
  )

  const list = roomsForCompany(companyId, rooms)

  const toggleRoom = (id: string) =>
    setOpenRooms((p) => ({ ...p, [id]: !p[id] }))
  const toggleFx = (id: string) =>
    setOpenFx((p) => ({ ...p, [id]: !p[id] }))

  return (
    <section className={cn('rounded-2xl border p-5 shadow-sm', C.card)}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 opacity-70" strokeWidth={1.75} />
            <h3 className={cn('font-semibold', C.heading)}>{title}</h3>
          </div>
          <p className={cn('mt-1 text-sm', C.muted)}>{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => resetToSample(companyId)}
          className={cn('mt-2 shrink-0 text-xs underline sm:mt-0', C.muted)}
        >
          {labels.resetSample}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-3">
        <div className="min-w-[140px] flex-1">
          <label className="text-xs font-medium text-gray-600">{labels.type}</label>
          <div className="mt-1">
            <SoftSelect
              value={newRoomType}
              onChange={(v) => setNewRoomType(v as RoomPurpose)}
              options={purposeSelectOptions}
              chipText={ROOM_PURPOSE_LABELS[newRoomType]}
              ariaLabel={labels.type}
              variant="field"
              triggerClassName="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <div className="min-w-[160px] flex-[2]">
          <label className="text-xs font-medium text-gray-600">{labels.addRoom}</label>
          <input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder={labels.roomNamePh}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const id = addRoom(companyId, newRoomName, newRoomType)
            if (id) {
              setNewRoomName('')
              setOpenRooms((p) => ({ ...p, [id]: true }))
            }
          }}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800',
          )}
        >
          <Plus className="h-4 w-4" />
          {labels.addRoom}
        </button>
      </div>

      <ul className="space-y-2">
        {list.map((room) => {
          const fx = fixturesForRoom(room.id, fixtures)
          const open = openRooms[room.id] ?? true
          return (
            <li
              key={room.id}
              className="rounded-xl border border-gray-200/90 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => toggleRoom(room.id)}
                  className="text-gray-500 hover:text-gray-800"
                  aria-expanded={open}
                >
                  {open ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>
                <input
                  value={room.name}
                  onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-sm font-semibold hover:border-gray-200 focus:border-green-500 focus:outline-none"
                />
                <SoftSelect
                  value={room.type}
                  onChange={(v) =>
                    updateRoom(room.id, { type: v as RoomPurpose })
                  }
                  options={purposeSelectOptions}
                  chipText={ROOM_PURPOSE_LABELS[room.type]}
                  ariaLabel={labels.type}
                  variant="compact"
                  triggerClassName="max-w-[10rem] rounded-lg border border-gray-200 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(labels.confirmDeleteRoom)) removeRoom(room.id)
                  }}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label={labels.deleteRoom}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {open ? (
                <div className="border-t border-gray-100 px-3 pb-3 pl-10">
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      value={newFxName[room.id] ?? ''}
                      onChange={(e) =>
                        setNewFxName((p) => ({ ...p, [room.id]: e.target.value }))
                      }
                      placeholder={labels.fixtureNamePh}
                      className="min-w-[140px] flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const n = (newFxName[room.id] ?? '').trim()
                        if (!n) return
                        const id = addFixture(room.id, n)
                        if (!id) return
                        setNewFxName((p) => ({ ...p, [room.id]: '' }))
                        setOpenFx((p) => ({ ...p, [id]: true }))
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1.5 text-xs font-medium text-green-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {labels.addFixture}
                    </button>
                  </div>

                  <ul className="mt-2 space-y-1">
                    {fx.map((f) => {
                      const lv = levelsForFixture(f.id, levels)
                      const fxOpen = openFx[f.id] ?? true
                      return (
                        <li key={f.id} className="rounded-lg bg-gray-50/80 py-1 pl-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleFx(f.id)}
                              className="text-gray-500"
                            >
                              {fxOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <input
                              value={f.name}
                              onChange={(e) =>
                                updateFixture(f.id, { name: e.target.value })
                              }
                              className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-green-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeFixture(f.id)}
                              className="p-1 text-red-400 hover:bg-red-50"
                              aria-label={labels.deleteFixture}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {fxOpen ? (
                            <div className="ml-5 mt-1 border-l border-gray-200 pl-2">
                              <div className="flex flex-wrap gap-1">
                                <input
                                  value={newLvName[f.id] ?? ''}
                                  onChange={(e) =>
                                    setNewLvName((p) => ({
                                      ...p,
                                      [f.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={labels.levelNamePh}
                                  className="min-w-[120px] flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const n = (newLvName[f.id] ?? '').trim()
                                    if (!n) return
                                    if (!addLevel(f.id, n)) return
                                    setNewLvName((p) => ({ ...p, [f.id]: '' }))
                                  }}
                                  className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium"
                                >
                                  {labels.addLevel}
                                </button>
                              </div>
                              <ul className="mt-1 space-y-0.5">
                                {lv.map((l) => (
                                  <li
                                    key={l.id}
                                    className="flex items-center gap-1 text-xs"
                                  >
                                    <input
                                      value={l.name}
                                      onChange={(e) =>
                                        updateLevel(l.id, {
                                          name: e.target.value,
                                        })
                                      }
                                      className="flex-1 rounded border border-transparent px-1 py-0.5 focus:border-green-500 focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeLevel(l.id)}
                                      className="p-0.5 text-red-400"
                                      aria-label={labels.deleteLevel}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
