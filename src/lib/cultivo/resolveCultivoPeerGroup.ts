import type { PlantCardItem } from '../../store/cultivationTypes'

/** Partido por `sourceBatchId` (≥2 plantas); si no, solo el ancla. */
export function resolveCultivoPeerGroup(
  anchor: PlantCardItem,
  tabItems: PlantCardItem[] | null | undefined,
): PlantCardItem[] {
  const list = Array.isArray(tabItems) ? tabItems : []
  const batch = anchor.sourceBatchId?.trim()
  if (batch) {
    const same = list.filter((p) => p.sourceBatchId?.trim() === batch)
    if (same.length >= 2) return same
  }
  return [anchor]
}
