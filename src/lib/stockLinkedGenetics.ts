import type { GeneticsBankEntry } from '../store/cultivationTypes'
import type { StockItem } from '../store/types'

export function normGeneticsStrain(s: string) {
  return s.trim().toLowerCase()
}

/** Ítem de stock asociado a una entrada actual del banco genético (por id o nombre legacy). */
export function stockLinkedToGenetics(
  stock: StockItem[],
  geneticsBank: GeneticsBankEntry[],
): StockItem[] {
  const byId = new Set(geneticsBank.map((g) => g.id))
  const names = new Set(geneticsBank.map((g) => normGeneticsStrain(g.name)))
  return stock.filter((item) => {
    if (item.geneticsEntryId && byId.has(item.geneticsEntryId)) return true
    if (!item.geneticsEntryId && names.has(normGeneticsStrain(item.tipo)))
      return true
    return false
  })
}

/** Entradas del banco que aún no tienen fila de stock enlazada. */
export function geneticsWithoutStockRow(
  stock: StockItem[],
  geneticsBank: GeneticsBankEntry[],
): GeneticsBankEntry[] {
  return geneticsBank.filter((g) => {
    const has = stock.some(
      (s) =>
        s.geneticsEntryId === g.id ||
        (!s.geneticsEntryId &&
          normGeneticsStrain(s.tipo) === normGeneticsStrain(g.name)),
    )
    return !has
  })
}
