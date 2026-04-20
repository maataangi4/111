import type { CultivationRoom, PlantRecord } from '../../store/cultivationTypes'

/** Plantas activas marcadas como madre o ubicadas en sala madre (Agronomía). */
export function motherStockCandidates(
  plants: PlantRecord[],
  rooms: CultivationRoom[],
): PlantRecord[] {
  const motherRoomIds = new Set(rooms.filter((r) => r.isMotherRoom).map((r) => r.id))
  return plants.filter(
    (p) =>
      p.status === 'activa' &&
      (p.isMotherStock === true || motherRoomIds.has(p.roomId)),
  )
}
