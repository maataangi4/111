import type { PlantCardItem } from '../../store/cultivationTypes'
import type { StockItem } from '../../store/types'

/**
 * Texto corto de procedencia / partida de suministro para filas de Cultivo.
 * Prioridad: enlace almacén (`geneticStockLotEntryId` + `geneticStockItemId`) → INASE legal → clon externo.
 */
export function resolvePlantSupplyOriginLabel(
  item: Pick<
    PlantCardItem,
    | 'geneticStockLotEntryId'
    | 'geneticStockItemId'
    | 'seedComplianceType'
    | 'seedType'
    | 'inaseLegalLotLabel'
    | 'cloneExternalSource'
    | 'cloneOrigin'
  >,
  stock: StockItem[],
): string | null {
  const gid = item.geneticStockItemId?.trim()
  const eid = item.geneticStockLotEntryId?.trim()
  if (gid && eid) {
    const row = stock.find((s) => s.id === gid)
    const ent = row?.geneticLotEntries?.find((e) => e.id === eid)
    const o = ent?.materialOrigin?.trim()
    if (o) return o
  }
  if (item.seedType === 'Semilla' && item.seedComplianceType === 'certificada') {
    const l = item.inaseLegalLotLabel?.trim()
    if (l) return l
  }
  if (item.seedType === 'Clon' && item.cloneOrigin === 'externo') {
    const ex = item.cloneExternalSource?.trim()
    if (ex) return ex
  }
  return null
}
