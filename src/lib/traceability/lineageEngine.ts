import type {
  CultivoKanbanState,
  GeneticsBankEntry,
  HarvestBatch,
  PlantCardItem,
} from '../../store/cultivationTypes'
import type { StockItem } from '../../store/types'

const norm = (s: string | undefined | null) => String(s ?? '').trim().toLowerCase()

export type TraceHitType = 'plant' | 'harvestBatch' | 'stockItem' | 'cultivoLot'

export type TraceHit = {
  type: TraceHitType
  key: string
  title: string
  subtitle: string
}

export type LineageHealth = 'ok' | 'warn'

export type LineageNode = {
  id: string
  kind: 'product' | 'cultivation' | 'material' | 'legal'
  health: LineageHealth
  title: string
  subtitle: string
  /** Pares clave/valor para el panel lateral */
  detailPairs: { k: string; v: string }[]
  /** Data URL de etiqueta INASE si existe */
  scanDataUrl?: string
}

function allPlants(board: CultivoKanbanState): PlantCardItem[] {
  return [
    ...(Array.isArray(board.propagacion) ? board.propagacion : []),
    ...(Array.isArray(board.vegetacion) ? board.vegetacion : []),
    ...(Array.isArray(board.floracion) ? board.floracion : []),
    ...(Array.isArray(board.cosecha) ? board.cosecha : []),
  ]
}

function resolveStockEntry(
  plant: PlantCardItem,
  stock: StockItem[],
): { row: StockItem; entryId: string; origin: string; at: string } | null {
  const gid = plant.geneticStockItemId?.trim()
  const eid = plant.geneticStockLotEntryId?.trim()
  if (!gid || !eid) return null
  const row = stock.find((s) => s.id === gid)
  const ent = row?.geneticLotEntries?.find((e) => e.id === eid)
  if (!row || !ent) return null
  return { row, entryId: eid, origin: ent.materialOrigin, at: ent.at }
}

function postHarvestLabel(s: HarvestBatch['postHarvestStatus']): string {
  if (s === 'DRYING') return 'Secado'
  if (s === 'CURING') return 'Curado'
  if (s === 'STOCK') return 'Stock final'
  return String(s)
}

export function searchTraceHits(
  query: string,
  board: CultivoKanbanState,
  harvestBatches: HarvestBatch[],
  stock: StockItem[],
  geneticsBank: GeneticsBankEntry[],
): TraceHit[] {
  const q = norm(query)
  if (!q) return []
  const hits: TraceHit[] = []
  const seen = new Set<string>()

  const push = (h: TraceHit) => {
    if (seen.has(h.key)) return
    seen.add(h.key)
    hits.push(h)
  }

  const plants = allPlants(board)
  for (const p of plants) {
    if (norm(p.id).includes(q) || norm(p.braceletId).includes(q)) {
      push({
        type: 'plant',
        key: `plant:${p.id}`,
        title: p.id,
        subtitle: `${p.strain} · ${p.trackingType === 'planta' ? 'Planta' : 'Lote'}`,
      })
    }
    if (q.length >= 2 && norm(p.strain).includes(q)) {
      push({
        type: 'plant',
        key: `plant:${p.id}`,
        title: p.strain,
        subtitle: `ID ${p.id}`,
      })
    }
    if (p.sourceBatchId && norm(p.sourceBatchId).includes(q)) {
      push({
        type: 'cultivoLot',
        key: `lot:${p.sourceBatchId}`,
        title: `Lote ${p.sourceBatchId}`,
        subtitle: p.strain,
      })
    }
    const inase = p.inaseLegalLotLabel?.trim()
    if (inase && norm(inase).includes(q)) {
      push({
        type: 'plant',
        key: `plant:${p.id}`,
        title: inase,
        subtitle: `${p.strain} · ${p.id}`,
      })
    }
  }

  for (const b of harvestBatches) {
    if (
      norm(b.id).includes(q) ||
      norm(b.strain).includes(q) ||
      b.plantIds.some((pid) => norm(pid).includes(q))
    ) {
      push({
        type: 'harvestBatch',
        key: `harvest:${b.id}`,
        title: b.id,
        subtitle: `${b.strain} · ${postHarvestLabel(b.postHarvestStatus)}`,
      })
    }
  }

  for (const s of stock) {
    if (norm(s.id).includes(q) || norm(s.tipo).includes(q)) {
      const g = geneticsBank.find((x) => x.id === s.geneticsEntryId)
      push({
        type: 'stockItem',
        key: `stock:${s.id}`,
        title: s.tipo,
        subtitle: g?.name ? `Banco · ${g.name}` : 'Stock genético',
      })
    }
    for (const e of s.geneticLotEntries ?? []) {
      if (norm(e.materialOrigin).includes(q) || norm(e.id).includes(q) || norm(e.at).includes(q)) {
        push({
          type: 'stockItem',
          key: `stock:${s.id}:entry:${e.id}`,
          title: e.materialOrigin,
          subtitle: `${s.tipo} · ${e.at}`,
        })
      }
    }
  }

  return hits.slice(0, 14)
}

export function buildLineageFromPlant(
  plant: PlantCardItem,
  harvestBatches: HarvestBatch[],
  stock: StockItem[],
): LineageNode[] {
  const batch = harvestBatches.find((b) => Array.isArray(b.plantIds) && b.plantIds.includes(plant.id))
  const stockLink = resolveStockEntry(plant, stock)

  const vegDays = (() => {
    const a = plant.vegetacionStartedAt?.trim()
    if (a) {
      const ms = Date.parse(a)
      if (Number.isFinite(ms)) return Math.max(0, Math.floor((Date.now() - ms) / 86400000))
    }
    return null
  })()
  const florDays = (() => {
    const a = plant.floracionStartedAt?.trim()
    if (a) {
      const ms = Date.parse(a)
      if (Number.isFinite(ms)) return Math.max(0, Math.floor((Date.now() - ms) / 86400000))
    }
    return null
  })()

  const cultHealth: LineageHealth =
    plant.cultivoUnitStatus === 'baja' || plant.cultivoUnitStatus === 'quarantine' ? 'warn' : 'ok'

  const productNode: LineageNode = batch
    ? {
        id: 'n-product',
        kind: 'product',
        health: batch.postHarvestStatus === 'DRYING' ? 'warn' : 'ok',
        title: `Lote cosecha · ${batch.id}`,
        subtitle: `${batch.strain} · ${batch.dryWeight != null ? `${Math.round(batch.dryWeight * 10) / 10} g secos` : 'Peso seco pendiente'} · ${postHarvestLabel(batch.postHarvestStatus)}`,
        detailPairs: [
          { k: 'Variedad', v: batch.strain },
          { k: 'Sala / mesa', v: `${batch.roomLabel} · ${batch.tableLabel}` },
          { k: 'Fecha de corte', v: batch.harvestDate },
          { k: 'Plantas en lote', v: String(batch.plantCount) },
          { k: 'Estado post-cosecha', v: postHarvestLabel(batch.postHarvestStatus) },
        ],
      }
    : {
        id: 'n-product',
        kind: 'product',
        health: cultHealth,
        title: plant.trackingType === 'planta' ? `Planta ${plant.id}` : `Lote cultivo ${plant.id}`,
        subtitle: `${plant.strain} · ${plant.stageTag ?? '—'} · ${plant.location ?? '—'}`,
        detailPairs: [
          { k: 'Variedad', v: plant.strain },
          { k: 'Ubicación', v: plant.location ?? '—' },
          { k: 'Tipo seguimiento', v: plant.trackingType === 'planta' ? 'Planta' : 'Lote' },
          { k: 'Origen semilla', v: plant.seedType },
        ],
      }

  const cultNode: LineageNode = {
    id: 'n-cult',
    kind: 'cultivation',
    health: cultHealth,
    title: plant.trackingType === 'planta' ? `Planta ${plant.id}` : `Grupo de cultivo · ${plant.id}`,
    subtitle: [
      vegDays != null ? `Vegetación ~${vegDays} d` : null,
      florDays != null ? `Floración ~${florDays} d` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'Ciclo en curso o sin fechas ISO',
    detailPairs: [
      { k: 'ID', v: plant.id },
      { k: 'Variedad', v: plant.strain },
      { k: 'Genética', v: String(plant.geneticsType ?? '—') },
      { k: 'Modo', v: plant.growMode === 'outdoor' ? 'Exterior' : 'Interior' },
      { k: 'Estado unidad', v: plant.cultivoUnitStatus ?? 'activa' },
    ],
  }

  const matNode: LineageNode = stockLink
    ? {
        id: 'n-mat',
        kind: 'material',
        health: 'ok',
        title: `Partida almacén · ${stockLink.row.tipo}`,
        subtitle: `Tomado de entrada del ${stockLink.at} · ${stockLink.origin}`,
        detailPairs: [
          { k: 'Origen material', v: stockLink.origin },
          { k: 'Fecha ingreso stock', v: stockLink.at },
          { k: 'Fila stock', v: stockLink.row.id },
          { k: 'ID entrada', v: stockLink.entryId },
        ],
      }
    : {
        id: 'n-mat',
        kind: 'material',
        health: 'warn',
        title: 'Procedencia material',
        subtitle:
          plant.seedComplianceType === 'certificada'
            ? 'Rastro INASE en etiqueta legal (sin enlace a partida de almacén)'
            : 'Sin vínculo a partida trazada en inventario (registrá entradas con lote)',
        detailPairs: [
          { k: 'Tipo semilla', v: plant.seedComplianceType ?? '—' },
          { k: 'Semilla / clon', v: plant.seedType },
        ],
      }

  const legalNode: LineageNode =
    plant.seedComplianceType === 'certificada' && plant.inaseLegalLotLabel
      ? {
          id: 'n-legal',
          kind: 'legal',
          health: 'ok',
          title: 'Documentación INASE',
          subtitle: `${plant.inaseLegalLotLabel}${plant.inaseHarvestYear ? ` · Cosecha ${plant.inaseHarvestYear}` : ''}`,
          detailPairs: [
            { k: 'Etiqueta legal', v: plant.inaseLegalLotLabel },
            { k: 'Proveedor RNCyFS', v: plant.inaseProviderRncyfs ?? '—' },
            { k: 'Estampilla', v: plant.inaseSecurityStamp ?? '—' },
            { k: 'Variedad INASE', v: plant.inaseVarietyName ?? '—' },
          ],
          scanDataUrl: plant.inaseLabelPhotoDataUrl,
        }
      : {
          id: 'n-legal',
          kind: 'legal',
          health: stockLink ? 'ok' : 'warn',
          title: 'Raíz documental',
          subtitle: stockLink
            ? `Material declarado: ${stockLink.origin}`
            : 'Completá datos INASE o enlazá partidas de inventario para auditoría plena',
          detailPairs: stockLink
            ? [{ k: 'Origen declarado', v: stockLink.origin }]
            : [{ k: 'Sugerencia', v: 'Registrar remito / INASE en la ficha de la partida' }],
        }

  return [productNode, cultNode, matNode, legalNode]
}

export function buildLineageFromHarvestBatch(
  batch: HarvestBatch,
  board: CultivoKanbanState,
  stock: StockItem[],
): LineageNode[] {
  const plants = allPlants(board)
  const anchor = plants.find((p) => batch.plantIds.includes(p.id)) ?? null
  if (anchor) {
    const base = buildLineageFromPlant(anchor, [batch], stock)
    const product = base[0]!
    if (product.kind === 'product') {
      product.title = `Lote cosecha · ${batch.id}`
      product.subtitle = `${batch.strain} · ${batch.dryWeight != null ? `${Math.round(batch.dryWeight * 10) / 10} g` : '—'} · ${postHarvestLabel(batch.postHarvestStatus)}`
      product.detailPairs = [
        { k: 'Variedad', v: batch.strain },
        { k: 'Estado', v: postHarvestLabel(batch.postHarvestStatus) },
        { k: 'Plantas', v: String(batch.plantCount) },
        { k: 'Corte', v: batch.harvestDate },
      ]
    }
    return base
  }

  return [
    {
      id: 'n-product',
      kind: 'product',
      health: batch.postHarvestStatus === 'DRYING' ? 'warn' : 'ok',
      title: `Lote cosecha · ${batch.id}`,
      subtitle: `${batch.strain} · ${postHarvestLabel(batch.postHarvestStatus)}`,
      detailPairs: [
        { k: 'Variedad', v: batch.strain },
        { k: 'Plantas', v: String(batch.plantCount) },
        { k: 'Corte', v: batch.harvestDate },
      ],
    },
    {
      id: 'n-cult',
      kind: 'cultivation',
      health: 'warn',
      title: 'Cultivo',
      subtitle: 'Plantas originales no encontradas en el tablero actual (histórico o archivado)',
      detailPairs: batch.plantIds.slice(0, 12).map((id) => ({ k: 'ID planta', v: id })),
    },
    {
      id: 'n-mat',
      kind: 'material',
      health: 'warn',
      title: 'Material',
      subtitle: 'Sin ancla de planta viva para resolver almacén',
      detailPairs: [],
    },
    {
      id: 'n-legal',
      kind: 'legal',
      health: 'warn',
      title: 'Documentación',
      subtitle: 'Vinculá plantas o registros INASE en el flujo de cultivo',
      detailPairs: [],
    },
  ]
}

export function findPlantById(board: CultivoKanbanState, id: string): PlantCardItem | null {
  const q = id.trim()
  if (!q) return null
  return allPlants(board).find((p) => p.id === q || p.braceletId === q) ?? null
}

export function findPlantBySourceBatch(board: CultivoKanbanState, batchId: string): PlantCardItem | null {
  const q = batchId.trim()
  if (!q) return null
  return allPlants(board).find((p) => p.sourceBatchId?.trim() === q) ?? null
}

export function buildLineageFromStockItem(row: StockItem, entryId?: string): LineageNode[] {
  const entries = row.geneticLotEntries ?? []
  const entry = entryId
    ? entries.find((e) => e.id === entryId)
    : entries.length > 0
      ? entries[entries.length - 1]
      : undefined
  const productNode: LineageNode = {
    id: 'n-product',
    kind: 'product',
    health: 'ok',
    title: `Stock genético · ${row.tipo}`,
    subtitle: entry
      ? `Partida: ${entry.materialOrigin} · ${entry.at} · ${entry.units} u`
      : `${row.geneticUnits ?? 0} u · sin desglose por partida`,
    detailPairs: [
      { k: 'Variedad', v: row.tipo },
      { k: 'Unidades totales', v: String(row.geneticUnits ?? 0) },
      { k: 'ID fila', v: row.id },
    ],
  }
  const cultNode: LineageNode = {
    id: 'n-cult',
    kind: 'cultivation',
    health: 'ok',
    title: 'Uso en cultivo',
    subtitle: 'Al plantar desde Inventario, cada toma genera su Lote de Cultivo enlazado a esta partida',
    detailPairs: [],
  }
  const matNode: LineageNode = {
    id: 'n-mat',
    kind: 'material',
    health: entry ? 'ok' : 'warn',
    title: 'Ingreso almacén',
    subtitle: entry ? `${entry.materialOrigin}` : 'Registrar entradas con origen para trazabilidad completa',
    detailPairs: entry
      ? [
          { k: 'Origen material', v: entry.materialOrigin },
          { k: 'Fecha ingreso', v: entry.at },
          { k: 'Unidades en partida', v: String(entry.units) },
          { k: 'ID partida', v: entry.id },
        ]
      : [],
  }
  const legalNode: LineageNode = {
    id: 'n-legal',
    kind: 'legal',
    health: entry ? 'ok' : 'warn',
    title: 'Documentación',
    subtitle: entry
      ? 'Adjuntá remito o certificado a la carpeta del club (próximo módulo)'
      : 'Sin partida: no hay documento de compra vinculado',
    detailPairs: [],
  }
  return [productNode, cultNode, matNode, legalNode]
}

export function findHarvestById(batches: HarvestBatch[], id: string): HarvestBatch | null {
  const q = id.trim()
  if (!q) return null
  return batches.find((b) => b.id === q) ?? null
}

/** Resuelve un resultado de búsqueda a nodos de linaje (null si ya no existe el registro). */
export function buildLineageForTraceHit(
  hit: TraceHit,
  board: CultivoKanbanState,
  harvestBatches: HarvestBatch[],
  stock: StockItem[],
): LineageNode[] | null {
  const key = hit.key
  if (key.startsWith('plant:')) {
    const id = key.slice('plant:'.length)
    const p = findPlantById(board, id)
    return p ? buildLineageFromPlant(p, harvestBatches, stock) : null
  }
  if (key.startsWith('harvest:')) {
    const id = key.slice('harvest:'.length)
    const b = findHarvestById(harvestBatches, id)
    return b ? buildLineageFromHarvestBatch(b, board, stock) : null
  }
  if (key.startsWith('stock:')) {
    const m = /^stock:([^:]+)(?::entry:(.+))?$/.exec(key)
    if (!m) return null
    const sid = m[1]!
    const eid = m[2]?.trim() || undefined
    const row = stock.find((s) => s.id === sid)
    return row ? buildLineageFromStockItem(row, eid) : null
  }
  if (key.startsWith('lot:')) {
    const lotId = key.slice('lot:'.length)
    const p = findPlantBySourceBatch(board, lotId)
    return p ? buildLineageFromPlant(p, harvestBatches, stock) : null
  }
  return null
}
