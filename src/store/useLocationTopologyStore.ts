import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  RoomPurpose,
  TopologyFixture,
  TopologyLevel,
  TopologyRoom,
} from './locationTopologyTypes'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

/** Совпадает с tenant в CultivoTab до появления реального multi-tenant. */
export const DEFAULT_TOPOLOGY_COMPANY_ID = 'tenant-default'

function seedRooms(companyId: string): TopologyRoom[] {
  return [
    { id: 'top-room-veg', companyId, name: 'Зал 1 (Veg / Madres)', type: 'veg' },
    { id: 'top-room-fl', companyId, name: 'Floración 1', type: 'flower' },
    { id: 'top-room-q', companyId, name: 'Cuarentena / aislamiento', type: 'quarantine' },
    { id: 'top-room-dry', companyId, name: 'Сушилка', type: 'drying' },
  ]
}

function seedFixtures(): TopologyFixture[] {
  return [
    { id: 'top-fx-1', roomId: 'top-room-veg', name: 'Стол 1' },
    { id: 'top-fx-2', roomId: 'top-room-veg', name: 'Стол 2' },
    { id: 'top-fx-3', roomId: 'top-room-fl', name: 'Стол 1' },
    { id: 'top-fx-q1', roomId: 'top-room-q', name: 'Mesa cuarentena 1' },
  ]
}

function seedLevels(): TopologyLevel[] {
  return [
    { id: 'top-lv-1', fixtureId: 'top-fx-1', name: 'Полка верхняя' },
    { id: 'top-lv-2', fixtureId: 'top-fx-1', name: 'Полка нижняя' },
  ]
}

export type LocationTopologyState = {
  rooms: TopologyRoom[]
  fixtures: TopologyFixture[]
  levels: TopologyLevel[]

  addRoom: (companyId: string, name: string, type: RoomPurpose) => string | null
  updateRoom: (id: string, patch: Partial<Pick<TopologyRoom, 'name' | 'type'>>) => void
  removeRoom: (id: string) => void

  addFixture: (roomId: string, name: string) => string | null
  updateFixture: (id: string, patch: Partial<Pick<TopologyFixture, 'name'>>) => void
  removeFixture: (id: string) => void

  addLevel: (fixtureId: string, name: string) => string | null
  updateLevel: (id: string, patch: Partial<Pick<TopologyLevel, 'name'>>) => void
  removeLevel: (id: string) => void

  resetToSample: (companyId?: string) => void
}

export const useLocationTopologyStore = create<LocationTopologyState>()(
  persist(
    (set) => ({
      rooms: seedRooms(DEFAULT_TOPOLOGY_COMPANY_ID),
      fixtures: seedFixtures(),
      levels: seedLevels(),

      addRoom: (companyId, name, type) => {
        const n = name.trim()
        if (!n) return null
        const id = uid()
        set((s) => ({
          rooms: [...s.rooms, { id, companyId, name: n, type }],
        }))
        return id
      },

      updateRoom: (id, patch) =>
        set((s) => ({
          rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      removeRoom: (id) =>
        set((s) => {
          const fxIds = new Set(s.fixtures.filter((f) => f.roomId === id).map((f) => f.id))
          return {
            rooms: s.rooms.filter((r) => r.id !== id),
            fixtures: s.fixtures.filter((f) => f.roomId !== id),
            levels: s.levels.filter((l) => !fxIds.has(l.fixtureId)),
          }
        }),

      addFixture: (roomId, name) => {
        const n = name.trim()
        if (!n) return null
        const id = uid()
        set((s) => ({
          fixtures: [...s.fixtures, { id, roomId, name: n }],
        }))
        return id
      },

      updateFixture: (id, patch) =>
        set((s) => ({
          fixtures: s.fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),

      removeFixture: (id) =>
        set((s) => ({
          fixtures: s.fixtures.filter((f) => f.id !== id),
          levels: s.levels.filter((l) => l.fixtureId !== id),
        })),

      addLevel: (fixtureId, name) => {
        const n = name.trim()
        if (!n) return null
        const id = uid()
        set((s) => ({
          levels: [...s.levels, { id, fixtureId, name: n }],
        }))
        return id
      },

      updateLevel: (id, patch) =>
        set((s) => ({
          levels: s.levels.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),

      removeLevel: (id) =>
        set((s) => ({
          levels: s.levels.filter((l) => l.id !== id),
        })),

      resetToSample: (companyId = DEFAULT_TOPOLOGY_COMPANY_ID) =>
        set({
          rooms: seedRooms(companyId),
          fixtures: seedFixtures(),
          levels: seedLevels(),
        }),
    }),
    {
      name: 'green-luck-location-topology',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        rooms: s.rooms,
        fixtures: s.fixtures,
        levels: s.levels,
      }),
    },
  ),
)

export function roomsForCompany(
  companyId: string,
  rooms: TopologyRoom[] | null | undefined,
): TopologyRoom[] {
  const list = Array.isArray(rooms) ? rooms : []
  return list
    .filter((r) => r.companyId === companyId)
    .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' }))
}
