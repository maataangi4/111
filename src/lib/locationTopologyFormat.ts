import type {
  TopologyFixture,
  TopologyLevel,
  TopologyRoom,
  TopologySelection,
} from '../store/locationTopologyTypes'

export function formatTopologyLabel(
  selection: TopologySelection,
  rooms: TopologyRoom[] | null | undefined,
  fixtures: TopologyFixture[] | null | undefined,
  levels: TopologyLevel[] | null | undefined,
  sep = ' · ',
): string {
  const roomList = Array.isArray(rooms) ? rooms : []
  const fixtureList = Array.isArray(fixtures) ? fixtures : []
  const levelList = Array.isArray(levels) ? levels : []
  const room = roomList.find((r) => r.id === selection.roomId)
  if (!room) return ''
  const parts = [String(room.name ?? '')]
  if (selection.fixtureId) {
    const fx = fixtureList.find((f) => f.id === selection.fixtureId)
    if (fx) parts.push(String(fx.name ?? ''))
  }
  if (selection.levelId) {
    const lv = levelList.find((l) => l.id === selection.levelId)
    if (lv) parts.push(String(lv.name ?? ''))
  }
  return parts.filter(Boolean).join(sep)
}

export function fixturesForRoom(roomId: string, fixtures: TopologyFixture[] | null | undefined): TopologyFixture[] {
  const list = Array.isArray(fixtures) ? fixtures : []
  return list
    .filter((f) => f.roomId === roomId)
    .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' }))
}

export function levelsForFixture(
  fixtureId: string,
  levels: TopologyLevel[] | null | undefined,
): TopologyLevel[] {
  const list = Array.isArray(levels) ? levels : []
  return list
    .filter((l) => l.fixtureId === fixtureId)
    .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' }))
}
