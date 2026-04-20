import type { PlantCardItem } from '../../store/cultivationTypes'

function braceletSortKey(p: PlantCardItem): string {
  const raw = p.braceletId?.trim() || p.id
  return String(raw ?? '').replace(/^#/, '').toLowerCase()
}

/** Orden de pulseras dentro de un mismo `sourceBatchId` (p.ej. 026–050 al dividir). */
export function sortPlantsInBatchOrder(a: PlantCardItem, b: PlantCardItem): number {
  const ka = braceletSortKey(a)
  const kb = braceletSortKey(b)
  const na = Number.parseInt(ka, 10)
  const nb = Number.parseInt(kb, 10)
  if (Number.isFinite(na) && Number.isFinite(nb) && String(na) === ka && String(nb) === kb) {
    return na - nb
  }
  return ka.localeCompare(kb, undefined, { numeric: true })
}

/**
 * Agrupa tarjetas de veg/flor que comparten `sourceBatchId`.
 * Sin `sourceBatchId`, cada fila es su propio grupo de 1 (lote unitario).
 */
export function groupPlantsBySourceBatch(items: PlantCardItem[]): PlantCardItem[][] {
  const map = new Map<string, PlantCardItem[]>()
  for (const p of items) {
    const key = p.sourceBatchId?.trim() || `__single:${p.id}`
    const arr = map.get(key)
    if (arr) arr.push(p)
    else map.set(key, [p])
  }
  const groups = [...map.values()]
  for (const g of groups) {
    g.sort(sortPlantsInBatchOrder)
  }
  groups.sort((a, b) => {
    const a0 = a[0]!
    const b0 = b[0]!
    const sa = String(a0.strain ?? '')
    const sb = String(b0.strain ?? '')
    const cmp = sa.localeCompare(sb, undefined, { sensitivity: 'base' })
    if (cmp !== 0) return cmp
    const ka = String((a0.sourceBatchId?.trim() || a0.id) ?? '')
    const kb = String((b0.sourceBatchId?.trim() || b0.id) ?? '')
    return ka.localeCompare(kb)
  })
  return groups
}

export function batchGroupKey(plants: PlantCardItem[]): string {
  const p0 = plants[0]!
  return String((p0.sourceBatchId?.trim() || p0.id) ?? '')
}
