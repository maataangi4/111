import type { StockItem } from '../store/types'

export function totalGeneticStockUnits(item: StockItem): number {
  const fromEnt = item.geneticLotEntries?.reduce((s, e) => s + e.units, 0) ?? 0
  if (fromEnt > 0) return Math.round(fromEnt * 100) / 100
  return typeof item.geneticUnits === 'number' && item.geneticUnits > 0
    ? Math.round(item.geneticUnits * 100) / 100
    : 0
}
