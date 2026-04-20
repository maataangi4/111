import type { PlantCardItem, PropagacionLogEntry } from '../../store/cultivationTypes'

/** Suma de unidades dadas de baja en el Diario (antes de pulseras). */
export function sumDiarioDescarte(log: PropagacionLogEntry[] | undefined): number {
  if (!log?.length) return 0
  let s = 0
  for (const e of log) {
    if (e.kind !== 'diario_descarte' || !e.diarioDescarte) continue
    const n = e.diarioDescarte.count
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) s += Math.floor(n)
  }
  return s
}

/** Plantados inicialmente en el lote (germinación). */
export function propagacionPlantedBaseline(item: PlantCardItem): number {
  if (item.trackingType === 'planta') return Math.max(1, item.quantity ?? 1)
  return Math.max(0, item.initialQuantity ?? item.quantity ?? 0)
}

/**
 * Plantas vivas en germinación (lote): baseline − descartes del Diario.
 * Para `trackingType === 'planta'` devuelve la cantidad de la tarjeta.
 */
export function propagacionAliveCount(item: PlantCardItem): number {
  if (item.trackingType === 'planta') return Math.max(1, item.quantity ?? 1)
  const planted = propagacionPlantedBaseline(item)
  const lost = sumDiarioDescarte(item.propagacionLog)
  return Math.max(0, planted - lost)
}
