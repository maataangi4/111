import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { dispatchTelegram } from '../lib/notifications/bus'
import { toUINotification } from '../lib/notifications/events'
import { useSociosStore } from './useSociosStore'
import {
  sanitizeStrainTagIds,
  type StrainTagListKey,
} from '../data/strainProfileTags'
import {
  type CultivationFlowerMoveHistoryEntry,
  type CultivationTransplantHistoryEntry,
  type CultivoKanbanState,
  type FlowerBajaReasonCode,
  type FlowerPruningType,
  type GeneticsType,
  type FloraSubStage,
  type TransplantLossReasonCode,
  MOTHER_ROOM_ID,
  type CultivationRoom,
  type CultivationTable,
  type GeneticsBankEntry,
  type GerminationMethodCode,
  type HarvestBatch,
  type IrrigationMethodCode,
  type PostHarvestStatus,
  type LightingPresetCode,
  type PlantCardItem,
  type PotVolumePresetCode,
  type SubstratePresetCode,
  type VegCultivationTechniqueCode,
  type PlantFitoDiagnostic,
  type PlantRecord,
  type PlantStatus,
  type DiarioClimaData,
  type DiarioDiseaseCode,
  type DiarioInspeccionData,
  type DiarioMantenimientoData,
  type DiarioTrichomeStage,
  type DiarioVegMantenimientoTag,
  type DiarioPropagacionChecklistData,
  type DiarioDescarteData,
  type DiarioBajaPlantaData,
  type DiarioCuarentenaData,
  type DiarioReubicacionData,
  type CultivoLateBajaReasonCode,
  type CultivoDestruccionMethodCode,
  type CultivoUnitStatus,
  type DiarioFlorMantenimientoTag,
  type DiarioPestCode,
  type DiarioRiegoNutricionData,
  type PropagacionLogEntry,
  type SplitLoteLogData,
  type PropagatorSeedling,
  type SeedlingOrigin,
  type TableStage,
  SEED_GENETICS_IDS,
  type BraceletColorTagKey,
  type TransplantTrackingMode,
} from './cultivationTypes'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const QUARANTINE_ROOM_ID = 'r-quarantine'
const QUARANTINE_TABLE_ID = 'r-quarantine-t1'

const initialRooms: CultivationRoom[] = [
  { id: 'r1', label: 'Sala Vegetativo y madres', vegetationOnly: true, isMotherRoom: true },
  { id: 'r2', label: 'Sala 1', vegetationOnly: false },
  { id: 'r3', label: 'Sala 2', vegetationOnly: false },
  { id: QUARANTINE_ROOM_ID, label: 'Sala Cuarentena', vegetationOnly: true },
]

const initialTables: CultivationTable[] = [
  {
    id: 'r1-t1',
    roomId: 'r1',
    label: 'Mesa 1',
    stage: 'vegetacion',
    strain: 'Flor Premium',
  },
  {
    id: 'r1-t2',
    roomId: 'r1',
    label: 'Mesa 2',
    stage: 'empty',
    strain: '',
  },
  {
    id: 'r2-t1',
    roomId: 'r2',
    label: 'Mesa 1',
    stage: 'floracion',
    strain: 'Extracción',
  },
  {
    id: 'r2-t2',
    roomId: 'r2',
    label: 'Mesa 2',
    stage: 'vegetacion',
    strain: 'Flor Premium',
  },
  {
    id: 'r3-t1',
    roomId: 'r3',
    label: 'Mesa 1',
    stage: 'vegetacion',
    strain: 'Shake Seco',
  },
  {
    id: 'r3-t2',
    roomId: 'r3',
    label: 'Mesa 2',
    stage: 'empty',
    strain: '',
  },
  {
    id: QUARANTINE_TABLE_ID,
    roomId: QUARANTINE_ROOM_ID,
    label: 'Mesa 1',
    stage: 'empty',
    strain: '',
  },
]

function buildMockPlants(): PlantRecord[] {
  const out: PlantRecord[] = []
  const base = '2025-11-01'
  let n = 1
  let regSeq = 0
  const add = (
    roomId: string,
    tableId: string,
    strain: string,
    count: number,
    status: PlantStatus = 'activa',
  ) => {
    for (let i = 0; i < count; i++) {
      out.push({
        id: `WL-${String(n++).padStart(3, '0')}`,
        strain,
        roomId,
        tableId,
        plantedDate: base,
        status,
        registeredAt: new Date(Date.UTC(2025, 10, 10, 8, 0, regSeq++)).toISOString(),
      })
    }
  }
  add('r1', 'r1-t1', 'Flor Premium', 18)
  add('r2', 'r2-t1', 'Extracción', 12)
  add('r2', 'r2-t2', 'Flor Premium', 8)
  add('r2', 'r2-t2', 'Extracción', 5)
  add('r3', 'r3-t1', 'Shake Seco', 6)
  out.push({
    id: 'WL-M-MA1',
    strain: 'Flor Premium',
    roomId: 'r1',
    tableId: 'r1-t1',
    plantedDate: '2025-09-01',
    status: 'activa',
    isMotherStock: true,
    registeredAt: new Date(Date.UTC(2025, 8, 1, 10, 0, 0)).toISOString(),
  })
  out.push({
    id: 'WL-M-MA2',
    strain: 'Extracción',
    roomId: 'r1',
    tableId: 'r1-t2',
    plantedDate: '2025-09-05',
    status: 'activa',
    isMotherStock: true,
    registeredAt: new Date(Date.UTC(2025, 8, 5, 10, 0, 0)).toISOString(),
  })
  out.push({
    id: 'WL-Q-01',
    strain: 'Flor Premium',
    roomId: '',
    tableId: '',
    plantedDate: '2025-12-01',
    status: 'cuarentena',
    quarantineAt: new Date(Date.UTC(2025, 11, 1, 10, 0, 0)).toISOString(),
    registeredAt: new Date(Date.UTC(2025, 11, 1, 10, 0, 0)).toISOString(),
  })
  out.push({
    id: 'WL-M-01',
    strain: 'Shake Seco',
    roomId: 'r3',
    tableId: 'r3-t1',
    plantedDate: '2025-10-15',
    status: 'muerta',
    deathReason: 'Plaga',
    registeredAt: new Date(Date.UTC(2025, 9, 15, 10, 0, 0)).toISOString(),
  })
  return out
}

function emptyGeneticsTags(): Pick<
  GeneticsBankEntry,
  | 'aromas'
  | 'efectosPositivos'
  | 'medicinal'
  | 'terpenos'
  | 'efectosNegativos'
> {
  return {
    aromas: [],
    efectosPositivos: [],
    medicinal: [],
    terpenos: [],
    efectosNegativos: [],
  }
}

function buildInitialGeneticsBank(): GeneticsBankEntry[] {
  const t = emptyGeneticsTags()
  return [
    {
      id: SEED_GENETICS_IDS.florPremium,
      name: 'Flor Premium',
      imageUrl: '',
      notes: '',
      ...t,
    },
    {
      id: SEED_GENETICS_IDS.shakeSeco,
      name: 'Shake Seco',
      imageUrl: '',
      notes: '',
      ...t,
    },
    {
      id: SEED_GENETICS_IDS.extraccion,
      name: 'Extracción',
      imageUrl: '',
      notes: '',
      ...t,
    },
    {
      id: SEED_GENETICS_IDS.bearsOg,
      name: '3-Bears-Og',
      imageUrl: '',
      notes: '',
      summary:
        'Híbrido compacto Mephisto Genetics: aroma dulce a ositos de goma; buena para espacios reducidos.',
      thcPercent: 22,
      cbdPercent: 0.6,
      sativaPercent: 35,
      indicaPercent: 65,
      ruderalisPercent: 0,
      ...t,
    },
  ]
}

function optStr(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function optPercent(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10))
}

function parseIrrigationMethodCode(v: unknown): IrrigationMethodCode | undefined {
  const codes: IrrigationMethodCode[] = [
    'manual',
    'drip',
    'ebb_flow',
    'nft',
    'autopot',
    'other',
    'dwc',
    'wick',
    'aeroponic',
    'sprinkler',
  ]
  return codes.includes(v as IrrigationMethodCode) ? (v as IrrigationMethodCode) : undefined
}

function parseGerminationMethodCode(v: unknown): GerminationMethodCode | undefined {
  const codes: GerminationMethodCode[] = [
    'cotton_discs',
    'water',
    'peat_tablet',
    'soil_direct',
    'other',
  ]
  return codes.includes(v as GerminationMethodCode) ? (v as GerminationMethodCode) : undefined
}

function parseLightingPresetCode(v: unknown): LightingPresetCode | undefined {
  const codes: LightingPresetCode[] = ['led', 'hps', 'cmh', 'fluorescent', 'sun', 'other']
  return codes.includes(v as LightingPresetCode) ? (v as LightingPresetCode) : undefined
}

function parseSubstratePresetCode(v: unknown): SubstratePresetCode | undefined {
  const codes: SubstratePresetCode[] = ['soil', 'coco', 'rockwool', 'water_hydro', 'leca', 'other']
  return codes.includes(v as SubstratePresetCode) ? (v as SubstratePresetCode) : undefined
}

function parsePotVolumePresetCode(v: unknown): PotVolumePresetCode | undefined {
  const codes: PotVolumePresetCode[] = ['1', '3', '5', '7', '11', '15', '20', '50_plus', 'other']
  return codes.includes(v as PotVolumePresetCode) ? (v as PotVolumePresetCode) : undefined
}

function normalizeGenetics(raw: unknown): GeneticsBankEntry {
  const x = raw as Partial<GeneticsBankEntry>
  const notesRaw = typeof x.notes === 'string' ? x.notes.trim() : ''
  const tag = (key: StrainTagListKey, raw: unknown) => sanitizeStrainTagIds(raw, key)

  return {
    id: String(x.id ?? uid()),
    name: String(x.name ?? '').trim(),
    imageUrl: String(x.imageUrl ?? ''),
    notes: notesRaw || undefined,
    summary: optStr(x.summary),
    breeder: optStr(x.breeder),
    floweringWeeks: optStr(x.floweringWeeks),
    harvestPeriod: optStr(x.harvestPeriod),
    yieldIndoor: optStr(x.yieldIndoor),
    yieldOutdoor: optStr(x.yieldOutdoor),
    growNotes: optStr(x.growNotes),
    plantStructure: optStr(x.plantStructure),
    lineage: optStr(x.lineage),
    geneticRatio: optStr(x.geneticRatio),
    parentStrains: optStr(x.parentStrains),
    thcPercent: optPercent(x.thcPercent),
    cbdPercent: optPercent(x.cbdPercent),
    sativaPercent: optPercent(x.sativaPercent),
    indicaPercent: optPercent(x.indicaPercent),
    ruderalisPercent: optPercent(x.ruderalisPercent),
    aromas: tag('aromas', x.aromas ?? []),
    efectosPositivos: tag('efectos', x.efectosPositivos ?? []),
    medicinal: tag('medicinal', x.medicinal ?? []),
    terpenos: tag('terpenos', x.terpenos ?? []),
    efectosNegativos: tag('efectosNegativos', x.efectosNegativos ?? []),
  }
}

function geneticsPayloadFromInput(
  row: Omit<GeneticsBankEntry, 'id'>,
): Omit<GeneticsBankEntry, 'id'> {
  return {
    name: row.name.trim(),
    imageUrl: row.imageUrl.trim(),
    notes: row.notes?.trim() || undefined,
    summary: row.summary?.trim() || undefined,
    breeder: row.breeder?.trim() || undefined,
    floweringWeeks: row.floweringWeeks?.trim() || undefined,
    harvestPeriod: row.harvestPeriod?.trim() || undefined,
    yieldIndoor: row.yieldIndoor?.trim() || undefined,
    yieldOutdoor: row.yieldOutdoor?.trim() || undefined,
    growNotes: row.growNotes?.trim() || undefined,
    plantStructure: row.plantStructure?.trim() || undefined,
    lineage: row.lineage?.trim() || undefined,
    geneticRatio: row.geneticRatio?.trim() || undefined,
    parentStrains: row.parentStrains?.trim() || undefined,
    thcPercent: row.thcPercent != null ? optPercent(row.thcPercent) : undefined,
    cbdPercent: row.cbdPercent != null ? optPercent(row.cbdPercent) : undefined,
    sativaPercent: row.sativaPercent != null ? optPercent(row.sativaPercent) : undefined,
    indicaPercent: row.indicaPercent != null ? optPercent(row.indicaPercent) : undefined,
    ruderalisPercent: row.ruderalisPercent != null ? optPercent(row.ruderalisPercent) : undefined,
    aromas: sanitizeStrainTagIds(row.aromas, 'aromas'),
    efectosPositivos: sanitizeStrainTagIds(row.efectosPositivos, 'efectos'),
    medicinal: sanitizeStrainTagIds(row.medicinal, 'medicinal'),
    terpenos: sanitizeStrainTagIds(row.terpenos, 'terpenos'),
    efectosNegativos: sanitizeStrainTagIds(
      row.efectosNegativos,
      'efectosNegativos',
    ),
  }
}

function buildMockPropagator(): PropagatorSeedling[] {
  return [
    {
      id: uid(),
      strain: 'Flor Premium',
      seededDate: '2026-02-01',
      addedAt: '2026-02-01T10:00:00.000Z',
      origin: 'semilla',
    },
    {
      id: uid(),
      strain: 'Extracción',
      seededDate: '2026-02-05',
      addedAt: '2026-02-05T10:00:00.000Z',
      origin: 'clone',
      genetics: 'GSC x OG',
      motherPlantId: 'WL-M-MA1',
    },
    {
      id: uid(),
      strain: 'Extracción',
      seededDate: '2026-02-05',
      addedAt: '2026-02-05T10:00:01.000Z',
      origin: 'semilla',
    },
  ]
}

function normalizeFitoDiagnostic(raw: unknown): PlantFitoDiagnostic | null {
  const x = raw as Partial<PlantFitoDiagnostic>
  if (!x.diagnostico || typeof x.createdAt !== 'string') return null
  const certeza =
    typeof x.certeza === 'number' && Number.isFinite(x.certeza)
      ? Math.max(0, Math.min(100, Math.round(x.certeza)))
      : 0
  const tratamiento = Array.isArray(x.tratamiento)
    ? x.tratamiento.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []
  return {
    id: String(x.id ?? uid()),
    createdAt: String(x.createdAt),
    symptoms: Array.isArray(x.symptoms)
      ? x.symptoms.filter((s): s is string => typeof s === 'string')
      : [],
    notes: typeof x.notes === 'string' && x.notes.trim() ? x.notes.trim() : undefined,
    imageDataUrl:
      typeof x.imageDataUrl === 'string' && x.imageDataUrl.trim()
        ? x.imageDataUrl.trim()
        : undefined,
    diagnostico: String(x.diagnostico).trim(),
    certeza,
    tratamiento,
    aislamiento: Boolean(x.aislamiento),
  }
}

function normalizePlant(raw: unknown): PlantRecord {
  const x = raw as Partial<PlantRecord>
  const st = x.status
  const status: PlantStatus =
    st === 'cuarentena' || st === 'muerta' || st === 'cosechada' || st === 'activa'
      ? st
      : 'activa'
  const offTable = status === 'muerta'
  const plantedDate = String(x.plantedDate ?? new Date().toISOString().slice(0, 10))
  const ra =
    typeof x.registeredAt === 'string' && x.registeredAt.trim()
      ? x.registeredAt.trim()
      : undefined
  const mid =
    typeof x.motherPlantId === 'string' && x.motherPlantId.trim()
      ? x.motherPlantId.trim()
      : undefined
  const fitoRaw = Array.isArray(x.fitoDiagnostics) ? x.fitoDiagnostics : []
  const fitoDiagnostics = fitoRaw
    .map(normalizeFitoDiagnostic)
    .filter((d): d is PlantFitoDiagnostic => d != null)
  const qa =
    typeof x.quarantineAt === 'string' && x.quarantineAt.trim()
      ? x.quarantineAt.trim()
      : undefined
  const isMotherStock = Boolean(x.isMotherStock)
  const gs = x.growthStage
  const growthStage: TableStage | undefined =
    gs === 'empty' || gs === 'vegetacion' || gs === 'floracion'
      ? gs
      : undefined
  const fss = x.floraSubStage
  const floraSubStage: FloraSubStage =
    fss === 'pre_flora' || fss === 'desarrollo' || fss === 'maduracion'
      ? fss
      : 'pre_flora'
  return {
    id: String(x.id ?? uid()),
    strain: String(x.strain ?? ''),
    roomId: offTable ? '' : String(x.roomId ?? ''),
    tableId: offTable ? '' : String(x.tableId ?? ''),
    plantedDate,
    status,
    growthStage:
      status === 'muerta' || status === 'cosechada'
        ? undefined
        : (growthStage ?? 'vegetacion'),
    floraSubStage,
    deathReason: typeof x.deathReason === 'string' ? x.deathReason : undefined,
    registeredAt: ra,
    motherPlantId: mid,
    isMotherStock: isMotherStock ? true : undefined,
    quarantineAt: status === 'cuarentena' ? qa : undefined,
    fitoDiagnostics: fitoDiagnostics.length ? fitoDiagnostics : undefined,
  }
}

function normalizeSeedling(raw: unknown): PropagatorSeedling {
  const x = raw as Partial<PropagatorSeedling>
  const seededDate = String(
    x.seededDate ?? new Date().toISOString().slice(0, 10),
  )
  const addedAtRaw = typeof x.addedAt === 'string' ? x.addedAt.trim() : ''
  const origin: SeedlingOrigin =
    x.origin === 'clone' || x.origin === 'semilla' ? x.origin : 'semilla'
  const genRaw = typeof x.genetics === 'string' ? x.genetics.trim() : ''
  const motherRaw = typeof x.motherPlantId === 'string' ? x.motherPlantId.trim() : ''
  return {
    id: String(x.id ?? uid()),
    strain: String(x.strain ?? ''),
    seededDate,
    addedAt:
      addedAtRaw ||
      `${seededDate}T12:00:00.000Z`,
    origin,
    genetics: genRaw || undefined,
    motherPlantId:
      origin === 'clone' && motherRaw ? motherRaw : undefined,
  }
}

function normalizeRoom(raw: unknown): CultivationRoom {
  const x = raw as Partial<CultivationRoom>
  const id = String(x.id ?? uid())
  return {
    id,
    label: String(x.label ?? 'Sala'),
    vegetationOnly: Boolean(x.vegetationOnly),
    isMotherRoom: Boolean(x.isMotherRoom) || id === MOTHER_ROOM_ID,
  }
}

function ensureMotherRoomPayload(
  rooms: CultivationRoom[],
  tables: CultivationTable[],
): { rooms: CultivationRoom[]; tables: CultivationTable[] } {
  // 新结构：母本厅并入 r1（Sala Vegetativo y madres），不再追加独立的 r-madre。
  // 这里只保证 r1 的 flags 正确；具体迁移在 merge 阶段处理旧的 r-madre 房间与桌子。
  return {
    rooms: rooms.map((room) =>
      room.id === MOTHER_ROOM_ID
        ? { ...room, vegetationOnly: true, isMotherRoom: true }
        : room,
    ),
    tables,
  }
}

function ensureQuarantineRoomPayload(input: {
  rooms: CultivationRoom[]
  tables: CultivationTable[]
  plants: PlantRecord[]
}): { rooms: CultivationRoom[]; tables: CultivationTable[]; plants: PlantRecord[] } {
  const hasRoom = input.rooms.some((r) => r.id === QUARANTINE_ROOM_ID)
  const rooms = hasRoom
    ? input.rooms
    : [
        ...input.rooms,
        {
          id: QUARANTINE_ROOM_ID,
          label: 'Sala Cuarentena',
          vegetationOnly: true,
          isMotherRoom: false,
        },
      ]

  const hasTable = input.tables.some((t) => t.id === QUARANTINE_TABLE_ID)
  const tables = hasTable
    ? input.tables
    : [
        ...input.tables,
        {
          id: QUARANTINE_TABLE_ID,
          roomId: QUARANTINE_ROOM_ID,
          label: 'Mesa 1',
          stage: 'empty' as const,
          strain: '',
        },
      ]

  const plants = input.plants.map((p) => {
    if (p.status !== 'cuarentena') return p
    return {
      ...p,
      roomId: QUARANTINE_ROOM_ID,
      tableId: QUARANTINE_TABLE_ID,
    }
  })

  return { rooms, tables, plants }
}

function migrateRoomsAndTablesToSalaLayout(input: {
  rooms: CultivationRoom[]
  tables: CultivationTable[]
  plants: PlantRecord[]
}): { rooms: CultivationRoom[]; tables: CultivationTable[]; plants: PlantRecord[] } {
  const { rooms, tables, plants } = input
  const motherIdLegacy = 'r-madre'
  const vegId = MOTHER_ROOM_ID

  // 1) Rename fixed rooms
  const renamedRooms = rooms
    .map((r) => {
      if (r.id === 'r1')
        return {
          ...r,
          label: 'Sala Vegetativo y madres',
          vegetationOnly: true,
          isMotherRoom: true,
        }
      if (r.id === 'r2') return { ...r, label: 'Sala 1', vegetationOnly: false }
      if (r.id === 'r3') return { ...r, label: 'Sala 2', vegetationOnly: false }
      return r
    })
    // 2) Remove legacy mother room (and any extra room that is marked mother but isn't r1)
    .filter((r) => r.id !== motherIdLegacy && !(r.isMotherRoom && r.id !== vegId))

  const vegTables = tables.filter((t) => t.roomId === vegId)
  const fallbackTableId = vegTables.find((t) => t.id === `${vegId}-t1`)?.id ?? vegTables[0]?.id ?? ''

  const migratedPlants = plants.map((p) => {
    // Move legacy madre plants into veg/mothers room
    if (p.roomId === motherIdLegacy) {
      return { ...p, roomId: vegId, tableId: fallbackTableId || '' }
    }
    // If someone persisted mother room as separate, also fold it into r1
    if (p.roomId && p.roomId !== vegId) {
      const rm = rooms.find((r) => r.id === p.roomId)
      if (rm?.isMotherRoom) return { ...p, roomId: vegId, tableId: fallbackTableId || '' }
    }
    return p
  })

  const cleanedTables = tables
    // drop legacy mother tables
    .filter((t) => t.roomId !== motherIdLegacy)
    // drop tables from removed "mother" rooms (if any)
    .filter((t) => {
      const rm = rooms.find((r) => r.id === t.roomId)
      if (!rm) return true
      return !(rm.isMotherRoom && rm.id !== vegId)
    })

  return { rooms: renamedRooms, tables: cleanedTables, plants: migratedPlants }
}

function normalizeTable(raw: unknown): CultivationTable {
  const x = raw as Partial<CultivationTable>
  const st = x.stage
  const stage: TableStage =
    st === 'empty' || st === 'vegetacion' || st === 'floracion' ? st : 'empty'
  return {
    id: String(x.id ?? uid()),
    roomId: String(x.roomId ?? ''),
    label: String(x.label ?? 'Mesa'),
    stage,
    strain: String(x.strain ?? ''),
  }
}

function parseOptHarvestNum(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return v
}

function normalizePostHarvestStatus(v: unknown): PostHarvestStatus {
  if (v === 'CURING' || v === 'STOCK' || v === 'DRYING') return v
  return 'DRYING'
}

function newHarvestPipelineFields(createdAtIso: string): Pick<
  HarvestBatch,
  | 'harvestDate'
  | 'postHarvestStatus'
  | 'trimWasteWeight'
  | 'stockGradePremiumG'
  | 'stockGradePopcornG'
  | 'stockGradeBiomassG'
> {
  return {
    harvestDate: createdAtIso.slice(0, 10),
    postHarvestStatus: 'DRYING',
    trimWasteWeight: null,
    stockGradePremiumG: null,
    stockGradePopcornG: null,
    stockGradeBiomassG: null,
  }
}

function normalizeHarvest(raw: unknown): HarvestBatch {
  const x = raw as Partial<HarvestBatch>
  const createdAt = String(x.createdAt ?? new Date().toISOString())
  const hd = x.harvestDate
  const harvestDate =
    typeof hd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(hd)
      ? hd
      : createdAt.slice(0, 10)
  return {
    id: String(x.id ?? uid()),
    roomId: String(x.roomId ?? ''),
    tableId: String(x.tableId ?? ''),
    roomLabel: String(x.roomLabel ?? ''),
    tableLabel: String(x.tableLabel ?? ''),
    strain: String(x.strain ?? ''),
    plantIds: Array.isArray(x.plantIds) ? x.plantIds.map(String) : [],
    plantCount: typeof x.plantCount === 'number' ? x.plantCount : 0,
    wetWeight: typeof x.wetWeight === 'number' ? x.wetWeight : null,
    dryWeight: typeof x.dryWeight === 'number' ? x.dryWeight : null,
    archived: Boolean(x.archived),
    createdAt,
    harvestDate,
    postHarvestStatus: normalizePostHarvestStatus(x.postHarvestStatus),
    trimWasteWeight: parseOptHarvestNum(x.trimWasteWeight),
    curingStartedAt:
      x.curingStartedAt != null && String(x.curingStartedAt).trim()
        ? String(x.curingStartedAt)
        : undefined,
    stockGradePremiumG: parseOptHarvestNum(x.stockGradePremiumG),
    stockGradePopcornG: parseOptHarvestNum(x.stockGradePopcornG),
    stockGradeBiomassG: parseOptHarvestNum(x.stockGradeBiomassG),
    vaultLocationLabel:
      x.vaultLocationLabel != null && String(x.vaultLocationLabel).trim()
        ? String(x.vaultLocationLabel)
        : undefined,
  }
}

function normStrain(s: string) {
  return s.trim().toLowerCase()
}

export function countPlantsOnTable(
  plants: PlantRecord[],
  tableId: string,
): number {
  return plants.filter(
    (p) => p.tableId === tableId && p.status === 'activa',
  ).length
}

export function countPlantsOnTableStrain(
  plants: PlantRecord[],
  tableId: string,
  strain: string,
): number {
  const n = normStrain(strain)
  return plants.filter(
    (p) =>
      p.tableId === tableId &&
      normStrain(p.strain) === n &&
      p.status === 'activa',
  ).length
}

function reconcileTablesWithPlants(
  tables: CultivationTable[],
  plants: PlantRecord[],
): CultivationTable[] {
  return tables.map((t) => {
    const activeOnTable = plants.filter(
      (p) => p.tableId === t.id && p.status === 'activa',
    )
    if (activeOnTable.length === 0) {
      if (t.stage === 'empty' && !t.strain) return t
      return { ...t, stage: 'empty' as const, strain: '' }
    }
    const nextStrain =
      activeOnTable.find((p) => p.strain.trim())?.strain.trim() ?? t.strain
    return nextStrain !== t.strain ? { ...t, strain: nextStrain } : t
  })
}

const BUD_IMAGE_KANBAN =
  'https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&w=320&q=80'

type KanbanColumnId = 'c1' | 'c2' | 'c3'

function makeMockKanbanItems(
  prefix: string,
  count: number,
  stageTag: string,
  seedType: 'Semilla' | 'Clon',
  stage: KanbanColumnId,
): PlantCardItem[] {
  return Array.from({ length: count }, (_, idx) => {
    const initial = idx % 2 === 0 ? 50 : 24
    const current = idx % 2 === 0 ? 48 : 22
    const ageDays =
      stage === 'c1' ? 2 + idx : stage === 'c2' ? 9 + idx : 16 + idx
    const motherPlantId =
      seedType === 'Clon' ? `M-3Bears-${String(idx + 1).padStart(3, '0')}` : undefined
    const isVeg = prefix.startsWith('v-')
    const isFlor = prefix.startsWith('f-')
    return {
      id: `${prefix}-${idx + 1}`,
      strain: '3-Bears-Og',
      quantity: current,
      initialQuantity: initial,
      seedType,
      geneticsType: 'fotoperiodica' as const,
      date: '2026-03-31',
      stageTag,
      stage,
      location: idx % 2 === 0 ? 'Estante A • Bandeja 3' : 'Estante B • Bandeja 1',
      imageUrl: BUD_IMAGE_KANBAN,
      healthStatus: 'ok',
      trackingType: 'lote' as const,
      ageDays,
      motherPlantId,
      vegetacionStartDate: isVeg ? '2026-04-01' : undefined,
      floweringStartDate: isFlor ? '2026-04-10' : undefined,
      flowerDurationWeeks: isFlor ? 9 : undefined,
    }
  })
}

export function buildInitialCultivoBoard(): CultivoKanbanState {
  return {
    propagacion: [
      ...makeMockKanbanItems('p-c1', 4, 'Día 1', 'Semilla', 'c1'),
      ...makeMockKanbanItems('p-c2', 3, 'Semana 2', 'Clon', 'c2'),
      ...makeMockKanbanItems('p-c3', 3, 'Semana 3', 'Semilla', 'c3'),
    ],
    vegetacion: [
      ...makeMockKanbanItems('v-c1', 4, 'Día 1 Veg', 'Semilla', 'c1'),
      ...makeMockKanbanItems('v-c2', 4, 'Semana 3 Veg', 'Clon', 'c2'),
      ...makeMockKanbanItems('v-c3', 3, 'Semana 5 Veg', 'Semilla', 'c3'),
    ],
    floracion: [
      ...makeMockKanbanItems('f-c1', 4, 'Semana 1 Flor', 'Semilla', 'c1'),
      ...makeMockKanbanItems('f-c2', 4, 'Semana 4 Flor', 'Clon', 'c2'),
      ...makeMockKanbanItems('f-c3', 3, 'Semana 8 Flor', 'Semilla', 'c3'),
    ],
    cosecha: [],
  }
}

function parseColorTagKey(v: unknown): BraceletColorTagKey | undefined {
  if (v === 'red' || v === 'blue' || v === 'green' || v === 'yellow' || v === 'white' || v === 'black')
    return v
  return undefined
}

function parseTransplantTrackingMode(v: unknown): TransplantTrackingMode | undefined {
  if (v === 'id' || v === 'color') return v
  return undefined
}

const DIARIO_PEST_CODES: DiarioPestCode[] = ['thrips', 'spider_mite', 'aphid', 'none']
const DIARIO_DISEASE_CODES: DiarioDiseaseCode[] = ['oidium', 'botrytis', 'def_n', 'none']

function parseDiarioPests(v: unknown): DiarioPestCode[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is DiarioPestCode => DIARIO_PEST_CODES.includes(x as DiarioPestCode))
}

function parseDiarioDiseases(v: unknown): DiarioDiseaseCode[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is DiarioDiseaseCode =>
    DIARIO_DISEASE_CODES.includes(x as DiarioDiseaseCode),
  )
}

function parseHealthScore(v: unknown): 1 | 2 | 3 | 4 | 5 | undefined {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return undefined
  if (n >= 1 && n <= 5) return n as 1 | 2 | 3 | 4 | 5
  return undefined
}

function normalizeDiarioRiegoNutricion(raw: unknown): DiarioRiegoNutricionData | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const volumeValue = Number(o.volumeValue)
  if (!Number.isFinite(volumeValue) || volumeValue <= 0) return undefined
  const volumeUnit = o.volumeUnit === 'gal' ? 'gal' : 'L'
  const recipeLabel = String(o.recipeLabel ?? '').trim()
  if (!recipeLabel) return undefined
  const toOpt = (x: unknown) =>
    typeof x === 'number' && Number.isFinite(x) ? x : undefined
  return {
    recipeToolId:
      o.recipeToolId === null || o.recipeToolId === undefined
        ? undefined
        : String(o.recipeToolId).trim() || null,
    recipeLabel,
    volumeValue,
    volumeUnit,
    inletPh: toOpt(o.inletPh),
    inletEc: toOpt(o.inletEc),
    drainPh: toOpt(o.drainPh),
    drainEc: toOpt(o.drainEc),
    flushStarted: o.flushStarted === true ? true : undefined,
  }
}

function parseTrichomeStage(v: unknown): DiarioTrichomeStage | undefined {
  if (v === 'clear' || v === 'milky' || v === 'amber') return v
  return undefined
}

function normalizeDiarioInspeccion(raw: unknown): DiarioInspeccionData | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const healthScore = parseHealthScore(o.healthScore)
  if (!healthScore) return undefined
  const toOpt = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : undefined)
  const ts = parseTrichomeStage(o.trichomeStage)
  return {
    healthScore,
    pests: parseDiarioPests(o.pests),
    diseases: parseDiarioDiseases(o.diseases),
    trichomeStage: ts,
    photoDataUrl: toOpt(o.photoDataUrl),
    notes: o.notes != null && String(o.notes).trim() ? String(o.notes).trim() : undefined,
  }
}

function normalizeDiarioClima(raw: unknown): DiarioClimaData | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const toOpt = (x: unknown) =>
    typeof x === 'number' && Number.isFinite(x) ? x : undefined
  const d: DiarioClimaData = {
    tempC: toOpt(o.tempC),
    rhPct: toOpt(o.rhPct),
    vpdKpa: toOpt(o.vpdKpa),
    co2Ppm: toOpt(o.co2Ppm),
    ppfd: toOpt(o.ppfd),
    dli: toOpt(o.dli),
  }
  if (
    d.tempC == null &&
    d.rhPct == null &&
    d.vpdKpa == null &&
    d.co2Ppm == null &&
    d.ppfd == null &&
    d.dli == null
  )
    return undefined
  return d
}

function normalizeDiarioMantenimiento(raw: unknown): DiarioMantenimientoData | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const notes = String(o.notes ?? '').trim()
  const vegTags: DiarioVegMantenimientoTag[] = []
  const allow = new Set<DiarioVegMantenimientoTag>([
    'topping',
    'defoliacion',
    'lst',
    'transplante',
    'scrog_net',
    'scrog_weave',
    'lollipop_lower',
  ])
  const tr = o.vegTags
  if (Array.isArray(tr)) {
    for (const x of tr) {
      if (typeof x === 'string' && allow.has(x as DiarioVegMantenimientoTag)) {
        vegTags.push(x as DiarioVegMantenimientoTag)
      }
    }
  }
  const florTags: DiarioFlorMantenimientoTag[] = []
  const allowFlor = new Set<DiarioFlorMantenimientoTag>(['flor_schwazz', 'flor_second_net'])
  const fr = o.florTags
  if (Array.isArray(fr)) {
    for (const x of fr) {
      if (typeof x === 'string' && allowFlor.has(x as DiarioFlorMantenimientoTag)) {
        florTags.push(x as DiarioFlorMantenimientoTag)
      }
    }
  }
  if (!notes && vegTags.length === 0 && florTags.length === 0) return undefined
  return {
    notes,
    vegTags: vegTags.length ? vegTags : undefined,
    florTags: florTags.length ? florTags : undefined,
  }
}

function normalizeDiarioAlturaCanopy(raw: unknown): { heightCm: number } | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const h = Number((raw as { heightCm?: unknown }).heightCm)
  if (!Number.isFinite(h) || h <= 0 || h > 500) return undefined
  return { heightCm: Math.round(h * 10) / 10 }
}

function normalizeDiarioDescarte(raw: unknown): DiarioDescarteData | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const c = Number((o as { count?: unknown }).count)
  const count = Number.isFinite(c) ? Math.max(1, Math.floor(c)) : 0
  const reason = String((o as { reason?: unknown }).reason ?? '').trim()
  if (count < 1 || !reason) return undefined
  return { count, reason }
}

const LATE_BAJA_REASONS: CultivoLateBajaReasonCode[] = [
  'plagas',
  'hongos',
  'hermafroditismo',
  'accidente',
  'crecimiento_debil',
]

const DESTRUCCION_CODES: CultivoDestruccionMethodCode[] = ['compost', 'quimicos', 'trituracion', 'otro']

function normalizeDiarioBajaPlanta(raw: unknown): DiarioBajaPlantaData | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const actaId = String(o.actaId ?? '').trim()
  const ids = Array.isArray(o.plantIds) ? o.plantIds.map((x) => String(x).trim()).filter(Boolean) : []
  const rc = o.reasonCode
  const reasonCode =
    typeof rc === 'string' && LATE_BAJA_REASONS.includes(rc as CultivoLateBajaReasonCode)
      ? (rc as CultivoLateBajaReasonCode)
      : undefined
  const dm = o.destructionMethodCode
  const destructionMethodCode =
    typeof dm === 'string' && DESTRUCCION_CODES.includes(dm as CultivoDestruccionMethodCode)
      ? (dm as CultivoDestruccionMethodCode)
      : undefined
  if (!actaId || ids.length === 0 || !reasonCode || !destructionMethodCode) return undefined
  const wg = o.weightGrams
  const weightGrams =
    typeof wg === 'number' && Number.isFinite(wg) && wg >= 0 ? Math.round(wg) : undefined
  const destructionMethodNotes =
    typeof o.destructionMethodNotes === 'string' ? o.destructionMethodNotes.trim() || undefined : undefined
  const notes = typeof o.notes === 'string' ? o.notes.trim() || undefined : undefined
  return {
    actaId,
    plantIds: ids,
    reasonCode,
    weightGrams,
    destructionMethodCode,
    destructionMethodNotes,
    notes,
  }
}

function normalizeDiarioCuarentena(raw: unknown): DiarioCuarentenaData | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const ids = Array.isArray(o.plantIds) ? o.plantIds.map((x) => String(x).trim()).filter(Boolean) : []
  const reason = String(o.reason ?? '').trim()
  const roomId = String(o.topologyRoomId ?? '').trim()
  const locationLabel = String(o.locationLabel ?? '').trim()
  if (ids.length === 0 || !reason || !roomId || !locationLabel) return undefined
  const fixtureId = o.topologyFixtureId != null ? String(o.topologyFixtureId).trim() || undefined : undefined
  const levelId = o.topologyLevelId != null ? String(o.topologyLevelId).trim() || undefined : undefined
  return {
    plantIds: ids,
    reason,
    topologyRoomId: roomId,
    topologyFixtureId: fixtureId,
    topologyLevelId: levelId,
    locationLabel,
  }
}

function normalizeDiarioReubicacion(raw: unknown): DiarioReubicacionData | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const ids = Array.isArray(o.plantIds) ? o.plantIds.map((x) => String(x).trim()).filter(Boolean) : []
  const locationLabel = String(o.locationLabel ?? '').trim()
  if (ids.length === 0 || !locationLabel) return undefined
  return { plantIds: ids, movedCount: ids.length, locationLabel }
}

function parseCultivoUnitStatus(v: unknown): CultivoUnitStatus | undefined {
  if (v === 'baja' || v === 'quarantine' || v === 'active') return v
  return undefined
}

function normalizeDiarioPropagacionChecklist(raw: unknown): DiarioPropagacionChecklistData | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const code = o.code
  if (code !== 'aclimatacion' && code !== 'pulverizacion_foliar' && code !== 'chequeo_raices') return undefined
  const line = String(o.line ?? '').trim()
  if (!line) return undefined
  return { code, line }
}

function normalizeSplitLote(raw: unknown): SplitLoteLogData | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const movedCount =
    typeof o.movedCount === 'number' && Number.isFinite(o.movedCount)
      ? Math.max(0, Math.floor(o.movedCount))
      : undefined
  const newBatchId = o.newBatchId != null ? String(o.newBatchId).trim() : ''
  const fromBatchId = o.fromBatchId != null ? String(o.fromBatchId).trim() : ''
  const locationLabel = o.locationLabel != null ? String(o.locationLabel).trim() : ''
  if (movedCount == null || movedCount < 1 || !newBatchId || !fromBatchId || !locationLabel) return undefined
  return { movedCount, newBatchId, fromBatchId, locationLabel }
}

function normalizePropagacionLogEntry(raw: unknown): PropagacionLogEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const kind = o.kind as PropagacionLogEntry['kind'] | undefined
  const kinds: PropagacionLogEntry['kind'][] = [
    'note',
    'measurement',
    'system',
    'diario_riego_nutricion',
    'diario_inspeccion',
    'diario_clima',
    'diario_mantenimiento',
    'diario_propagacion_checklist',
    'diario_descarte',
    'diario_altura_canopy',
    'diario_baja_planta',
    'diario_cuarentena',
    'diario_reubicacion',
  ]
  if (!kind || !kinds.includes(kind)) return null
  const id = String(o.id ?? uid())
  const at = String(o.at ?? new Date().toISOString())
  const entry: PropagacionLogEntry = { id, at, kind }
  if (o.text != null) entry.text = String(o.text)
  if (o.author != null) entry.author = String(o.author)
  if (typeof o.ph === 'number' && Number.isFinite(o.ph)) entry.ph = o.ph
  if (typeof o.phPrev === 'number' && Number.isFinite(o.phPrev)) entry.phPrev = o.phPrev
  if (typeof o.ec === 'number' && Number.isFinite(o.ec)) entry.ec = o.ec
  if (typeof o.ecPrev === 'number' && Number.isFinite(o.ecPrev)) entry.ecPrev = o.ecPrev
  if (typeof o.tempC === 'number' && Number.isFinite(o.tempC)) entry.tempC = o.tempC
  if (kind === 'system') {
    const sk = o.systemKey
    if (
      sk === 'moved_to_vegetacion' ||
      sk === 'moved_to_floracion' ||
      sk === 'moved_to_cosecha' ||
      sk === 'batch_created'
    ) {
      entry.systemKey = sk
    } else if (sk === 'lote_split') {
      entry.systemKey = 'lote_split'
      const sl = normalizeSplitLote(o.splitLote)
      if (sl) entry.splitLote = sl
    } else {
      entry.systemKey = 'batch_created'
    }
  }
  if (kind === 'diario_riego_nutricion') {
    const d = normalizeDiarioRiegoNutricion(o.diarioRiegoNutricion)
    if (!d) return null
    entry.diarioRiegoNutricion = d
  }
  if (kind === 'diario_inspeccion') {
    const d = normalizeDiarioInspeccion(o.diarioInspeccion)
    if (!d) return null
    entry.diarioInspeccion = d
  }
  if (kind === 'diario_clima') {
    const d = normalizeDiarioClima(o.diarioClima)
    if (!d) return null
    entry.diarioClima = d
  }
  if (kind === 'diario_mantenimiento') {
    const d = normalizeDiarioMantenimiento(o.diarioMantenimiento)
    if (!d) return null
    entry.diarioMantenimiento = d
  }
  if (kind === 'diario_propagacion_checklist') {
    const d = normalizeDiarioPropagacionChecklist(o.diarioPropagacionChecklist)
    if (!d) return null
    entry.diarioPropagacionChecklist = d
  }
  if (kind === 'diario_descarte') {
    const d = normalizeDiarioDescarte(o.diarioDescarte)
    if (!d) return null
    entry.diarioDescarte = d
  }
  if (kind === 'diario_altura_canopy') {
    const d = normalizeDiarioAlturaCanopy(o.diarioAlturaCanopy)
    if (!d) return null
    entry.diarioAlturaCanopy = d
  }
  if (kind === 'diario_baja_planta') {
    const d = normalizeDiarioBajaPlanta(o.diarioBajaPlanta)
    if (!d) return null
    entry.diarioBajaPlanta = d
  }
  if (kind === 'diario_cuarentena') {
    const d = normalizeDiarioCuarentena(o.diarioCuarentena)
    if (!d) return null
    entry.diarioCuarentena = d
  }
  if (kind === 'diario_reubicacion') {
    const d = normalizeDiarioReubicacion(o.diarioReubicacion)
    if (!d) return null
    entry.diarioReubicacion = d
  }
  return entry
}

function normalizePlantCardItem(x: Partial<PlantCardItem> & Record<string, unknown>): PlantCardItem {
  return {
    id: String(x.id ?? uid()),
    strain: String(x.strain ?? ''),
    quantity: typeof x.quantity === 'number' ? x.quantity : undefined,
    initialQuantity: typeof x.initialQuantity === 'number' ? x.initialQuantity : undefined,
    trackingType:
      x.trackingType === 'planta' || x.trackingType === 'lote' ? x.trackingType : undefined,
    seedType: x.seedType === 'Clon' ? 'Clon' : 'Semilla',
    seedComplianceType: (() => {
      if (x.seedType === 'Clon') return undefined
      if (x.seedComplianceType === 'certificada' || x.seedComplianceType === 'propia') {
        return x.seedComplianceType
      }
      const legacy = (x as Record<string, unknown>).seedOriginType
      if (legacy === 'certificada' || legacy === 'propia') return legacy
      return undefined
    })(),
    inaseCode: optStr(x.inaseCode),
    inaseVarietyId: optStr(x.inaseVarietyId),
    inaseVarietyName: optStr(x.inaseVarietyName),
    inaseProviderRncyfs: optStr(x.inaseProviderRncyfs),
    inaseSecurityStamp: optStr(x.inaseSecurityStamp),
    inaseHarvestYear:
      typeof x.inaseHarvestYear === 'number' &&
      Number.isFinite(x.inaseHarvestYear) &&
      x.inaseHarvestYear >= 1900 &&
      x.inaseHarvestYear <= 2100
        ? Math.round(x.inaseHarvestYear)
        : undefined,
    inaseLegalLotLabel: optStr(x.inaseLegalLotLabel),
    inaseLabelPhotoDataUrl:
      typeof x.inaseLabelPhotoDataUrl === 'string' &&
      x.inaseLabelPhotoDataUrl.trim().startsWith('data:image/')
        ? x.inaseLabelPhotoDataUrl.trim()
        : undefined,
    geneticsType: parseGeneticsType(x.geneticsType) ?? 'fotoperiodica',
    growMode: x.growMode === 'outdoor' ? 'outdoor' : x.growMode === 'indoor' ? 'indoor' : undefined,
    date: String(x.date ?? ''),
    stageTag: String(x.stageTag ?? ''),
    stage: String(x.stage ?? 'c1'),
    location: String(x.location ?? ''),
    topologyRoomId: x.topologyRoomId != null ? String(x.topologyRoomId) : undefined,
    topologyFixtureId: x.topologyFixtureId != null ? String(x.topologyFixtureId) : undefined,
    topologyLevelId: x.topologyLevelId != null ? String(x.topologyLevelId) : undefined,
    imageUrl: String(x.imageUrl ?? ''),
    ageDays: typeof x.ageDays === 'number' ? x.ageDays : undefined,
    motherPlantId: x.motherPlantId != null ? String(x.motherPlantId) : undefined,
    cloneOrigin: x.cloneOrigin === 'externo' ? 'externo' : x.cloneOrigin === 'propio' ? 'propio' : undefined,
    cloneExternalSource: optStr(x.cloneExternalSource),
    /** Legacy alert/plaga UI removed — normalize to ok on load. */
    healthStatus: x.healthStatus === 'ok' ? 'ok' : undefined,
    braceletId: x.braceletId != null ? String(x.braceletId) : undefined,
    sourceBatchId: x.sourceBatchId != null ? String(x.sourceBatchId) : undefined,
    lotSegmentSuffix: x.lotSegmentSuffix != null ? String(x.lotSegmentSuffix).trim() || undefined : undefined,
    splitFromSourceBatchId:
      x.splitFromSourceBatchId != null ? String(x.splitFromSourceBatchId).trim() || undefined : undefined,
    colorTagKey: parseColorTagKey(x.colorTagKey),
    floweringStartDate:
      x.floweringStartDate != null ? String(x.floweringStartDate) : undefined,
    flowerAvgHeightCm:
      typeof x.flowerAvgHeightCm === 'number' && Number.isFinite(x.flowerAvgHeightCm)
        ? x.flowerAvgHeightCm
        : undefined,
    flowerPruningType: parseFlowerPruningType(x.flowerPruningType),
    vegetacionStartDate:
      x.vegetacionStartDate != null ? String(x.vegetacionStartDate) : undefined,
    propagacionStartedAt:
      x.propagacionStartedAt != null ? String(x.propagacionStartedAt) : undefined,
    vegetacionStartedAt:
      x.vegetacionStartedAt != null ? String(x.vegetacionStartedAt) : undefined,
    floracionStartedAt:
      x.floracionStartedAt != null ? String(x.floracionStartedAt) : undefined,
    cosechaStartedAt:
      x.cosechaStartedAt != null ? String(x.cosechaStartedAt) : undefined,
    flowerDurationWeeks:
      typeof x.flowerDurationWeeks === 'number' && Number.isFinite(x.flowerDurationWeeks)
        ? Math.max(1, Math.min(52, Math.round(x.flowerDurationWeeks)))
        : undefined,
    breeder: x.breeder != null ? String(x.breeder) : undefined,
    seedCount:
      typeof x.seedCount === 'number' && Number.isFinite(x.seedCount) ? Math.max(0, Math.floor(x.seedCount)) : undefined,
    germinationStartDate: x.germinationStartDate != null ? String(x.germinationStartDate) : undefined,
    germinationMethodCode: parseGerminationMethodCode(x.germinationMethodCode),
    germinationMethod: x.germinationMethod != null ? String(x.germinationMethod) : undefined,
    cloneGeneration: x.cloneGeneration != null ? String(x.cloneGeneration) : undefined,
    rootingHormone: x.rootingHormone != null ? String(x.rootingHormone) : undefined,
    lightingSchedule: x.lightingSchedule != null ? String(x.lightingSchedule) : undefined,
    lightingSpec: x.lightingSpec != null ? String(x.lightingSpec) : undefined,
    lightingPresetCode: parseLightingPresetCode(x.lightingPresetCode),
    lightingCustom: x.lightingCustom != null ? String(x.lightingCustom) : undefined,
    lightingPpfd:
      typeof x.lightingPpfd === 'number' && Number.isFinite(x.lightingPpfd) && x.lightingPpfd >= 0
        ? Math.round(x.lightingPpfd)
        : undefined,
    substrateType: x.substrateType != null ? String(x.substrateType) : undefined,
    substratePresetCode: parseSubstratePresetCode(x.substratePresetCode),
    substrateToolId: x.substrateToolId != null ? String(x.substrateToolId) : undefined,
    fertilizerToolId: x.fertilizerToolId != null ? String(x.fertilizerToolId) : undefined,
    lightingToolId: x.lightingToolId != null ? String(x.lightingToolId) : undefined,
    potToolId: x.potToolId != null ? String(x.potToolId) : undefined,
    nutrientLine: x.nutrientLine != null ? String(x.nutrientLine) : undefined,
    nutrientPh:
      typeof x.nutrientPh === 'number' && Number.isFinite(x.nutrientPh) ? x.nutrientPh : undefined,
    nutrientEc:
      typeof x.nutrientEc === 'number' && Number.isFinite(x.nutrientEc) ? x.nutrientEc : undefined,
    solutionTempC:
      typeof x.solutionTempC === 'number' && Number.isFinite(x.solutionTempC) ? x.solutionTempC : undefined,
    propagacionLog: Array.isArray(x.propagacionLog)
      ? (x.propagacionLog.map(normalizePropagacionLogEntry).filter(Boolean) as PropagacionLogEntry[])
      : undefined,
    batchStrainDescription:
      typeof x.batchStrainDescription === 'string' ? x.batchStrainDescription : undefined,
    batchThcPercent: optPercent(x.batchThcPercent),
    batchCbdPercent: optPercent(x.batchCbdPercent),
    batchSativaPercent: optPercent(x.batchSativaPercent),
    batchIndicaPercent: optPercent(x.batchIndicaPercent),
    batchRuderalisPercent: optPercent(x.batchRuderalisPercent),
    irrigationMethodCode: parseIrrigationMethodCode(x.irrigationMethodCode),
    irrigationMethodCustom: optStr(x.irrigationMethodCustom),
    potSizeValue:
      typeof x.potSizeValue === 'number' && Number.isFinite(x.potSizeValue) && x.potSizeValue > 0
        ? x.potSizeValue
        : undefined,
    potSizeUnit: x.potSizeUnit === 'gal' ? 'gal' : x.potSizeUnit === 'L' ? 'L' : undefined,
    potVolumePresetCode: parsePotVolumePresetCode(x.potVolumePresetCode),
    vegCultivationTechniqueCode: parseVegCultivationTechniqueCode(x.vegCultivationTechniqueCode),
    vegCultivationTechniqueCustom: optStr(x.vegCultivationTechniqueCustom),
    cultivoUnitStatus: parseCultivoUnitStatus(x.cultivoUnitStatus),
    quarantineReason: optStr(x.quarantineReason),
    quarantineSinceAt: x.quarantineSinceAt != null ? String(x.quarantineSinceAt) : undefined,
  }
}

function parseVegCultivationTechniqueCode(v: unknown): VegCultivationTechniqueCode | undefined {
  if (
    v === 'tradicional' ||
    v === 'scrog' ||
    v === 'sog' ||
    v === 'lst' ||
    v === 'mainlining' ||
    v === 'supercropping' ||
    v === 'other'
  )
    return v
  return undefined
}

function parseGeneticsType(v: unknown): GeneticsType | undefined {
  if (v === 'fotoperiodica' || v === 'automatica') return v
  return undefined
}

function parseFlowerPruningType(v: unknown): FlowerPruningType | undefined {
  if (
    v === 'ninguna' ||
    v === 'lollipopping' ||
    v === 'topping' ||
    v === 'defoliacion'
  )
    return v
  return undefined
}

function parseFlowerBajaReasonCode(v: unknown): FlowerBajaReasonCode | undefined {
  if (v === 'weak_plant' || v === 'male_herm' || v === 'disease_pest') return v
  return undefined
}

function normalizeFlowerMoveHistory(raw: unknown): CultivationFlowerMoveHistoryEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    const x = row as Record<string, unknown>
    return {
      id: String(x.id ?? uid()),
      at: String(x.at ?? new Date().toISOString()),
      strain: String(x.strain ?? ''),
      sourceBatchId: x.sourceBatchId != null ? String(x.sourceBatchId) : undefined,
      selectedCount:
        typeof x.selectedCount === 'number' && Number.isFinite(x.selectedCount)
          ? Math.max(0, Math.floor(x.selectedCount))
          : 0,
      bajasCount:
        typeof x.bajasCount === 'number' && Number.isFinite(x.bajasCount)
          ? Math.max(0, Math.floor(x.bajasCount))
          : 0,
      bajaReasonCode: parseFlowerBajaReasonCode(x.bajaReasonCode),
      bajaReasonLabel: x.bajaReasonLabel != null ? String(x.bajaReasonLabel) : undefined,
      floweringStartDate: String(x.floweringStartDate ?? ''),
      avgHeightCm:
        typeof x.avgHeightCm === 'number' && Number.isFinite(x.avgHeightCm)
          ? x.avgHeightCm
          : undefined,
      pruningType: parseFlowerPruningType(x.pruningType) ?? 'ninguna',
      flowerDurationWeeks:
        typeof x.flowerDurationWeeks === 'number' && Number.isFinite(x.flowerDurationWeeks)
          ? Math.max(1, Math.min(52, Math.round(x.flowerDurationWeeks)))
          : undefined,
      locationLabel: String(x.locationLabel ?? ''),
      topologyRoomId: String(x.topologyRoomId ?? ''),
      topologyFixtureId: x.topologyFixtureId != null ? String(x.topologyFixtureId) : undefined,
      topologyLevelId: x.topologyLevelId != null ? String(x.topologyLevelId) : undefined,
      plantIds: Array.isArray(x.plantIds) ? x.plantIds.map(String) : [],
    }
  })
}

function parseTransplantLossReason(v: unknown): TransplantLossReasonCode | undefined {
  if (
    v === 'rejection' ||
    v === 'weak_roots' ||
    v === 'mold' ||
    v === 'not_germinated' ||
    v === 'other'
  )
    return v
  return undefined
}

function normalizeTransplantHistory(raw: unknown): CultivationTransplantHistoryEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    const x = row as Record<string, unknown>
    return {
      id: String(x.id ?? uid()),
      at: String(x.at ?? new Date().toISOString()),
      batchId: String(x.batchId ?? ''),
      strain: String(x.strain ?? ''),
      transferredCount:
        typeof x.transferredCount === 'number' && Number.isFinite(x.transferredCount)
          ? Math.max(0, Math.floor(x.transferredCount))
          : 0,
      lossCount:
        typeof x.lossCount === 'number' && Number.isFinite(x.lossCount)
          ? Math.max(0, Math.floor(x.lossCount))
          : 0,
      lossReasonCode: parseTransplantLossReason(x.lossReasonCode),
      lossReasonLabel: x.lossReasonLabel != null ? String(x.lossReasonLabel) : undefined,
      notes: x.notes != null ? String(x.notes) : undefined,
      trackingMode: parseTransplantTrackingMode(x.trackingMode),
      colorTagLabel: x.colorTagLabel != null ? String(x.colorTagLabel) : undefined,
    }
  })
}

const EMPTY_CULTIVO_BOARD: CultivoKanbanState = {
  propagacion: [],
  vegetacion: [],
  floracion: [],
  cosecha: [],
}

function normalizeCultivoBoard(raw: unknown): CultivoKanbanState {
  if (!raw || typeof raw !== 'object') return EMPTY_CULTIVO_BOARD
  const o = raw as Record<string, unknown>
  if (
    !Array.isArray(o.propagacion) ||
    !Array.isArray(o.vegetacion) ||
    !Array.isArray(o.floracion)
  ) {
    return EMPTY_CULTIVO_BOARD
  }
  const cosechaRaw = o.cosecha
  return {
    propagacion: o.propagacion.map((row) =>
      normalizePlantCardItem(row as Partial<PlantCardItem> & Record<string, unknown>),
    ),
    vegetacion: o.vegetacion.map((row) =>
      normalizePlantCardItem(row as Partial<PlantCardItem> & Record<string, unknown>),
    ),
    floracion: o.floracion.map((row) =>
      normalizePlantCardItem(row as Partial<PlantCardItem> & Record<string, unknown>),
    ),
    cosecha: Array.isArray(cosechaRaw)
      ? cosechaRaw.map((row) =>
          normalizePlantCardItem(row as Partial<PlantCardItem> & Record<string, unknown>),
        )
      : [],
  }
}

interface CultivationState {
  rooms: CultivationRoom[]
  tables: CultivationTable[]
  geneticsBank: GeneticsBankEntry[]
  propagator: PropagatorSeedling[]
  plants: PlantRecord[]
  /** Tablero kanban Cultivo (germinación / veg / flor); persiste en localStorage. */
  cultivoBoard: CultivoKanbanState
  /** Аудит: перевод партий в вегетацию и списания. */
  cultivoTransplantHistory: CultivationTransplantHistoryEntry[]
  /** Аудит: перевод с вегетации в цветение (bajas + métricas). */
  cultivoFlowerMoveHistory: CultivationFlowerMoveHistoryEntry[]
  harvestBatches: HarvestBatch[]
  selectedPlants: string[]

  setTableStage: (tableId: string, stage: TableStage) => boolean
  setTableStrain: (tableId: string, strain: string) => void
  /** Marca plantas activas/cuarentena como cosechadas y crea lote. Devuelve id del lote o null. */
  harvestTable: (tableId: string) => string | null
  /** Cosecha solo un sorter / lote en esta mesa. */
  harvestStrainOnTable: (tableId: string, strain: string) => string | null
  /** Una planta activa → lote de secado (no vacía la mesa salvo que quede sin activas). */
  harvestPlant: (plantId: string) => string | null
  /** Nuevo salón con dos mesas vacías (Mesa 1 / Mesa 2). Devuelve el id del salón. */
  addRoom: (label: string, vegetationOnly: boolean) => string
  addPlantsBulk: (
    ids: string[],
    strain: string,
    roomId: string,
    tableId: string,
    plantedDate: string,
  ) => { ok: true } | { ok: false; error: string }
  /** Un pulsera / planta a la vez (sin prefijo forzado). */
  addPlant: (
    id: string,
    strain: string,
    roomId: string,
    tableId: string,
    plantedDate: string,
  ) => { ok: true } | { ok: false; error: string }
  /** Crea N líneas en propagador (misma variedad y fecha de siembra). */
  addSeedlings: (
    strain: string,
    seededDate: string,
    quantity: number,
    origin: SeedlingOrigin,
    genetics?: string,
    motherPlantId?: string,
  ) => { ok: true } | { ok: false; error: string }
  moveSeedlingToVegetation: (
    seedlingId: string,
    braceletId: string,
    braceletDate: string,
    roomId: string,
    tableId: string,
  ) => { ok: true } | { ok: false; error: string }
  removePropagatorSeedling: (seedlingId: string) => void
  updatePropagatorSeedling: (
    seedlingId: string,
    strain: string,
    seededDate: string,
    origin: SeedlingOrigin,
    genetics?: string,
    motherPlantId?: string,
  ) => { ok: true } | { ok: false; error: string }
  setPlantStatus: (id: string, status: PlantStatus, deathReason?: string) => void
  setPlantGrowthStage: (id: string, stage: TableStage) => boolean
  setPlantFloraSubStage: (id: string, stage: FloraSubStage) => boolean
  togglePlantSelection: (id: string) => void
  clearPlantSelection: () => void
  selectPlants: (ids: string[]) => void
  moveSelectedPlantsToNextStage: () => number
  addFitoDiagnostic: (
    plantId: string,
    diag: Omit<PlantFitoDiagnostic, 'id' | 'createdAt'>,
  ) => void
  movePlant: (id: string, roomId: string, tableId: string) => boolean
  /** Marca madre y coloca en mesa elegida de sala madres (solo activa). Desmarcar solo quita flag. */
  setPlantMotherStock: (
    id: string,
    isMother: boolean,
    targetTableId?: string,
  ) => boolean
  updateHarvest: (
    id: string,
    partial: Partial<Pick<HarvestBatch, 'wetWeight' | 'dryWeight'>>,
  ) => void
  archiveHarvest: (id: string) => void
  /** Elimina el lote del listado (activo o archivado). No restaura plantas. */
  removeHarvestBatch: (id: string) => void
  /** Secado → curado: peso seco total y merma (g). Peso seco no puede superar peso húmedo si este está definido. */
  moveHarvestBatchToCuring: (
    id: string,
    payload: { totalDryWeight: number; trimWasteWeight: number },
  ) => boolean
  /** Curado → stock final: clasificación por grado y ubicación en bóveda. */
  moveHarvestBatchToStock: (
    id: string,
    payload: {
      premiumG: number
      popcornG: number
      biomassG: number
      vaultLocationLabel: string
    },
  ) => boolean
  /** Dispensación: descuenta gramos del stock (Premium) de un lote en estado STOCK. */
  dispenseFromHarvestBatch: (args: { harvestBatchId: string; grams: number }) => boolean
  /** Anulación: devuelve gramos al stock (Premium) del lote original. */
  restoreToHarvestBatch: (args: { harvestBatchId: string; grams: number }) => boolean
  /**
   * Cosecha desde el tablero Cultivo → Floración: crea un HarvestBatch en Post-Cosecha (secado).
   * No enlaza con PlantRecord del mapa Agronomía.
   */
  recordFloracionHarvestBatch: (payload: {
    sourceCardId: string
    strain: string
    plantCount: number
    /** Todas las tarjetas del lote (opcional); por defecto solo sourceCardId. */
    plantIds?: string[]
    roomId: string
    tableId: string
    roomLabel: string
    tableLabel: string
  }) => string
  /** Elimina una planta del registro (incluye cosechadas). */
  removePlant: (id: string) => void
  addGeneticsBank: (
    row: Omit<GeneticsBankEntry, 'id'>,
  ) => { ok: true; id: string } | { ok: false; error: 'name' | 'duplicate' }
  updateGeneticsBank: (id: string, row: Omit<GeneticsBankEntry, 'id'>) => boolean
  removeGeneticsBank: (id: string) => void
  setCultivoBoard: (
    update: CultivoKanbanState | ((prev: CultivoKanbanState) => CultivoKanbanState),
  ) => void
  recordCultivoTransplant: (payload: {
    batchId: string
    strain: string
    transferredCount: number
    lossCount: number
    lossReasonCode?: TransplantLossReasonCode
    lossReasonLabel?: string
    notes?: string
    trackingMode?: TransplantTrackingMode
    colorTagLabel?: string
  }) => void
  recordCultivoFlowerMove: (
    payload: Omit<CultivationFlowerMoveHistoryEntry, 'id' | 'at'>,
  ) => void
}

export const useCultivationStore = create<CultivationState>()(
  persist(
    (set, get) => ({
      rooms: initialRooms,
      tables: initialTables,
      geneticsBank: buildInitialGeneticsBank(),
      propagator: buildMockPropagator(),
      plants: buildMockPlants(),
      cultivoBoard: buildInitialCultivoBoard(),
      cultivoTransplantHistory: [],
      cultivoFlowerMoveHistory: [],
      harvestBatches: [],
      selectedPlants: [],

      setCultivoBoard: (update) =>
        set((s) => ({
          cultivoBoard:
            typeof update === 'function'
              ? (update as (p: CultivoKanbanState) => CultivoKanbanState)(s.cultivoBoard)
              : update,
        })),

      recordCultivoTransplant: (payload) => {
        set((s) => ({
          cultivoTransplantHistory: [
            {
              id: uid(),
              at: new Date().toISOString(),
              batchId: payload.batchId,
              strain: payload.strain,
              transferredCount: payload.transferredCount,
              lossCount: payload.lossCount,
              lossReasonCode: payload.lossReasonCode,
              lossReasonLabel: payload.lossReasonLabel,
              notes: payload.notes?.trim() ? payload.notes.trim() : undefined,
              trackingMode: payload.trackingMode,
              colorTagLabel: payload.colorTagLabel?.trim()
                ? payload.colorTagLabel.trim()
                : undefined,
            },
            ...s.cultivoTransplantHistory,
          ],
        }))
        const event = {
          type: 'transplant' as const,
          batchId: payload.batchId,
          strain: payload.strain,
          transferred: payload.transferredCount,
          losses: payload.lossCount,
          lossReason: payload.lossReasonLabel ?? '—',
        }
        useSociosStore.getState().pushNotification(toUINotification(event))
        dispatchTelegram(event)
      },

      recordCultivoFlowerMove: (payload) => {
        set((s) => ({
          cultivoFlowerMoveHistory: [
            {
              id: uid(),
              at: new Date().toISOString(),
              ...payload,
            },
            ...s.cultivoFlowerMoveHistory,
          ],
        }))
        const event = {
          type: 'flower_move' as const,
          strain: payload.strain,
          count: payload.selectedCount,
          bajas: payload.bajasCount,
          bajaReason: payload.bajaReasonLabel ?? '—',
          location: payload.locationLabel,
        }
        useSociosStore.getState().pushNotification(toUINotification(event))
        dispatchTelegram(event)
      },

      setTableStage: (tableId, stage) => {
        const table = get().tables.find((t) => t.id === tableId)
        if (!table) return false
        const room = get().rooms.find((r) => r.id === table.roomId)
        if (room?.vegetationOnly && stage === 'floracion') return false
        set((s) => ({
          tables: s.tables.map((t) =>
            t.id === tableId ? { ...t, stage } : t,
          ),
        }))
        return true
      },

      setTableStrain: (tableId, strain) =>
        set((s) => ({
          tables: s.tables.map((t) =>
            t.id === tableId ? { ...t, strain: strain.trim() } : t,
          ),
        })),

      harvestTable: (tableId) => {
        const s = get()
        const table = s.tables.find((t) => t.id === tableId)
        if (!table) return null
        const room = s.rooms.find((r) => r.id === table.roomId)
        if (!room) return null

        const harvestable = s.plants.filter(
          (p) => p.tableId === tableId && p.status === 'activa',
        )
        if (harvestable.length === 0) return null

        const plantIds = harvestable.map((p) => p.id)
        const strain = table.strain.trim() || 'Sin variedad'
        const createdAt = new Date().toISOString()
        const batch: HarvestBatch = {
          id: uid(),
          roomId: table.roomId,
          tableId,
          roomLabel: room.label,
          tableLabel: table.label,
          strain,
          plantIds,
          plantCount: plantIds.length,
          wetWeight: null,
          dryWeight: null,
          archived: false,
          createdAt,
          ...newHarvestPipelineFields(createdAt),
        }

        set({
          plants: s.plants.map((p) =>
            plantIds.includes(p.id)
              ? {
                  ...p,
                  status: 'cosechada' as const,
                  roomId: '',
                  tableId: '',
                }
              : p,
          ),
          tables: s.tables.map((t) =>
            t.id === tableId
              ? { ...t, stage: 'empty' as const, strain: '' }
              : t,
          ),
          harvestBatches: [batch, ...s.harvestBatches],
        })
        return batch.id
      },

      harvestStrainOnTable: (tableId, strainKey) => {
        const s = get()
        const table = s.tables.find((t) => t.id === tableId)
        if (!table) return null
        const room = s.rooms.find((r) => r.id === table.roomId)
        if (!room) return null
        const key = normStrain(strainKey)
        if (!key) return null

        const harvestable = s.plants.filter(
          (p) =>
            p.tableId === tableId &&
            p.status === 'activa' &&
            normStrain(p.strain) === key,
        )
        if (harvestable.length === 0) return null

        const plantIds = harvestable.map((p) => p.id)
        const strain =
          harvestable[0]!.strain.trim() || strainKey.trim() || 'Sin variedad'
        const createdAt = new Date().toISOString()
        const batch: HarvestBatch = {
          id: uid(),
          roomId: table.roomId,
          tableId,
          roomLabel: room.label,
          tableLabel: table.label,
          strain,
          plantIds,
          plantCount: plantIds.length,
          wetWeight: null,
          dryWeight: null,
          archived: false,
          createdAt,
          ...newHarvestPipelineFields(createdAt),
        }

        const newPlants = s.plants.map((p) =>
          plantIds.includes(p.id)
            ? {
                ...p,
                status: 'cosechada' as const,
                roomId: '',
                tableId: '',
              }
            : p,
        )

        const stillActive = countPlantsOnTable(newPlants, tableId)
        const stillOnMesa = newPlants.filter(
          (p) => p.tableId === tableId && p.status === 'activa',
        )
        const nextStrain =
          stillOnMesa.find((p) => p.strain.trim())?.strain.trim() ?? ''

        set({
          plants: newPlants,
          tables: s.tables.map((t) =>
            t.id === tableId
              ? stillActive === 0
                ? { ...t, stage: 'empty' as const, strain: '' }
                : { ...t, strain: nextStrain }
              : t,
          ),
          harvestBatches: [batch, ...s.harvestBatches],
        })
        return batch.id
      },

      harvestPlant: (plantId) => {
        const s = get()
        const plant = s.plants.find((p) => p.id === plantId)
        if (!plant || plant.status !== 'activa') return null
        const table = s.tables.find((t) => t.id === plant.tableId)
        if (!table) return null
        const room = s.rooms.find((r) => r.id === table.roomId)
        if (!room) return null

        const strain =
          plant.strain.trim() || table.strain.trim() || 'Sin variedad'
        const strainKey = normStrain(strain)

        const newPlants = s.plants.map((p) =>
          p.id === plantId
            ? {
                ...p,
                status: 'cosechada' as const,
                roomId: '',
                tableId: '',
              }
            : p,
        )

        const stillActive = countPlantsOnTable(newPlants, table.id)
        const stillOnMesa = newPlants.filter(
          (p) => p.tableId === table.id && p.status === 'activa',
        )
        const nextStrain =
          stillOnMesa.find((p) => p.strain.trim())?.strain.trim() ?? ''

        const mergeIdx = s.harvestBatches.findIndex(
          (b) =>
            !b.archived &&
            b.tableId === table.id &&
            normStrain(b.strain) === strainKey,
        )

        let batchId: string
        let nextHarvestBatches: HarvestBatch[]

        if (mergeIdx >= 0) {
          const prev = s.harvestBatches[mergeIdx]!
          const plantIds = prev.plantIds.includes(plant.id)
            ? prev.plantIds
            : [...prev.plantIds, plant.id]
          batchId = prev.id
          nextHarvestBatches = s.harvestBatches.map((b, i) =>
            i === mergeIdx
              ? {
                  ...b,
                  plantIds,
                  plantCount: plantIds.length,
                }
              : b,
          )
        } else {
          const createdAt = new Date().toISOString()
          const batch: HarvestBatch = {
            id: uid(),
            roomId: table.roomId,
            tableId: table.id,
            roomLabel: room.label,
            tableLabel: table.label,
            strain,
            plantIds: [plant.id],
            plantCount: 1,
            wetWeight: null,
            dryWeight: null,
            archived: false,
            createdAt,
            ...newHarvestPipelineFields(createdAt),
          }
          batchId = batch.id
          nextHarvestBatches = [batch, ...s.harvestBatches]
        }

        set({
          plants: newPlants,
          tables: s.tables.map((t) =>
            t.id === table.id
              ? stillActive === 0
                ? { ...t, stage: 'empty' as const, strain: '' }
                : { ...t, strain: nextStrain }
              : t,
          ),
          harvestBatches: nextHarvestBatches,
        })
        return batchId
      },

      addRoom: (label, vegetationOnly) => {
        const roomId = `r-${uid().replace(/-/g, '').slice(0, 10)}`
        const lab = label.trim() || 'Sala'
        const newRoom: CultivationRoom = {
          id: roomId,
          label: lab,
          vegetationOnly,
        }
        const nextTables: CultivationTable[] = [
          {
            id: `${roomId}-m1`,
            roomId,
            label: 'Mesa 1',
            stage: 'empty',
            strain: '',
          },
          {
            id: `${roomId}-m2`,
            roomId,
            label: 'Mesa 2',
            stage: 'empty',
            strain: '',
          },
        ]
        set((s) => ({
          rooms: [...s.rooms, newRoom],
          tables: [...s.tables, ...nextTables],
        }))
        return roomId
      },

      addPlantsBulk: (ids, strain, roomId, tableId, plantedDate) => {
        const trimmed = [...new Set(ids.map((x) => x.trim()).filter(Boolean))]
        if (trimmed.length === 0) return { ok: false, error: 'empty' }
        const existing = new Set(get().plants.map((p) => p.id))
        const clash = trimmed.find((id) => existing.has(id))
        if (clash) return { ok: false, error: 'duplicate' }
        const t = strain.trim()
        if (!t) return { ok: false, error: 'strain' }

        set((s) => ({
          plants: [
            ...s.plants,
            ...trimmed.map((id, i) => ({
              id,
              strain: t,
              roomId,
              tableId,
              plantedDate,
              status: 'activa' as const,
              registeredAt: new Date(Date.now() + i).toISOString(),
            })),
          ],
        }))
        return { ok: true }
      },

      addPlant: (id, strain, roomId, tableId, plantedDate) => {
        const idTrim = id.trim()
        if (!idTrim) return { ok: false, error: 'empty' }
        if (get().plants.some((p) => p.id === idTrim))
          return { ok: false, error: 'duplicate' }
        const t = strain.trim()
        if (!t) return { ok: false, error: 'strain' }

        set((s) => ({
          plants: [
            ...s.plants,
            {
              id: idTrim,
              strain: t,
              roomId,
              tableId,
              plantedDate,
              status: 'activa' as const,
              registeredAt: new Date().toISOString(),
            },
          ],
        }))
        return { ok: true }
      },

      addSeedlings: (strain, seededDate, quantity, origin, genetics, motherPlantId) => {
        const t = strain.trim()
        if (!t) return { ok: false, error: 'strain' }
        const n = Math.floor(Number(quantity))
        if (!Number.isFinite(n) || n < 1 || n > 2000)
          return { ok: false, error: 'qty' }
        const o: SeedlingOrigin = origin === 'clone' ? 'clone' : 'semilla'
        const g = genetics?.trim()
        let motherStored: string | undefined
        if (o === 'clone') {
          const mid = motherPlantId?.trim()
          if (!mid) return { ok: false, error: 'mother_required' }
          if (!get().plants.some((p) => p.id === mid))
            return { ok: false, error: 'mother_not_found' }
          motherStored = mid
        }
        set((s) => ({
          propagator: [
            ...s.propagator,
            ...Array.from({ length: n }, (_, i) => ({
              id: uid(),
              strain: t,
              seededDate,
              addedAt: new Date(Date.now() + i).toISOString(),
              origin: o,
              genetics: g || undefined,
              motherPlantId: motherStored,
            })),
          ],
        }))
        return { ok: true }
      },

      removePropagatorSeedling: (seedlingId) =>
        set((s) => ({
          propagator: s.propagator.filter((x) => x.id !== seedlingId),
        })),

      updatePropagatorSeedling: (
        seedlingId,
        strain,
        seededDate,
        origin,
        genetics,
        motherPlantId,
      ) => {
        const t = strain.trim()
        if (!t) return { ok: false, error: 'strain' }
        const exists = get().propagator.some((x) => x.id === seedlingId)
        if (!exists) return { ok: false, error: 'not_found' }
        const o: SeedlingOrigin = origin === 'clone' ? 'clone' : 'semilla'
        const g = genetics?.trim()
        let motherStored: string | undefined
        if (o === 'clone') {
          const mid = motherPlantId?.trim()
          if (!mid) return { ok: false, error: 'mother_required' }
          if (!get().plants.some((p) => p.id === mid))
            return { ok: false, error: 'mother_not_found' }
          motherStored = mid
        }
        set((s) => ({
          propagator: s.propagator.map((x) =>
            x.id === seedlingId
              ? {
                  ...x,
                  strain: t,
                  seededDate,
                  origin: o,
                  genetics: g || undefined,
                  motherPlantId: motherStored,
                }
              : x,
          ),
        }))
        return { ok: true }
      },

      moveSeedlingToVegetation: (
        seedlingId,
        braceletId,
        braceletDate,
        roomId,
        tableId,
      ) => {
        const s = get()
        const seed = s.propagator.find((x) => x.id === seedlingId)
        if (!seed) return { ok: false, error: 'not_found' }
        const idTrim = braceletId.trim()
        if (!idTrim) return { ok: false, error: 'empty' }
        if (s.plants.some((p) => p.id === idTrim))
          return { ok: false, error: 'duplicate' }
        const t = seed.strain.trim()
        if (!t) return { ok: false, error: 'strain' }

        const roomTrim = roomId.trim()
        const tableTrim = tableId.trim()
        if (!roomTrim || !tableTrim) return { ok: false, error: 'bad_location' }
        const roomOk = s.rooms.some((r) => r.id === roomTrim)
        const tableOk = s.tables.some(
          (tb) => tb.id === tableTrim && tb.roomId === roomTrim,
        )
        if (!roomOk || !tableOk) return { ok: false, error: 'bad_location' }

        let motherOut: string | undefined
        if (seed.origin === 'clone') {
          const mid = seed.motherPlantId?.trim()
          if (!mid) return { ok: false, error: 'mother_required' }
          if (!s.plants.some((p) => p.id === mid))
            return { ok: false, error: 'mother_not_found' }
          if (mid === idTrim) return { ok: false, error: 'mother_same_id' }
          motherOut = mid
        }

        set((st) => {
          const nextPlants = [
            ...st.plants,
            {
              id: idTrim,
              strain: t,
              roomId: roomTrim,
              tableId: tableTrim,
              plantedDate: braceletDate,
              status: 'activa' as const,
              growthStage: 'vegetacion' as const,
              registeredAt: new Date().toISOString(),
              motherPlantId: motherOut,
            },
          ]
          let nextTables = st.tables.map((tbl) => {
            if (tbl.id !== tableTrim) return tbl
            let u = { ...tbl }
            if (u.stage === 'empty') u = { ...u, stage: 'vegetacion' as const }
            if (!u.strain.trim() && t) u = { ...u, strain: t }
            return u
          })
          nextTables = reconcileTablesWithPlants(nextTables, nextPlants)
          return {
            propagator: st.propagator.filter((x) => x.id !== seedlingId),
            plants: nextPlants,
            tables: nextTables,
          }
        })
        const room = get().rooms.find((r) => r.id === roomTrim)
        const table = get().tables.find((tb) => tb.id === tableTrim)
        const locationLabel = [room?.label, table?.label].filter(Boolean).join(' · ') || roomTrim
        const event = {
          type: 'seedling_registered' as const,
          plantId: braceletId.trim(),
          strain: seed.strain.trim(),
          seedlingId,
          location: locationLabel,
        }
        useSociosStore.getState().pushNotification(toUINotification(event))
        dispatchTelegram(event)
        return { ok: true }
      },

      setPlantStatus: (id, status, deathReason) => {
        const prevPlant = get().plants.find((p) => p.id === id)
        set((s) => {
          const nowIso = new Date().toISOString()
          return {
            plants: s.plants.map((p) => {
              if (p.id !== id) return p
              const toDead = status === 'muerta'
              const toQuarantine = status === 'cuarentena'
              const backFromQuarantineToActive =
                status === 'activa' &&
                p.status === 'cuarentena' &&
                p.roomId === QUARANTINE_ROOM_ID
              const quarantineAt =
                status === 'cuarentena'
                  ? p.status === 'cuarentena'
                    ? (p.quarantineAt ?? nowIso)
                    : nowIso
                  : undefined
              return {
                ...p,
                status,
                roomId: toDead
                  ? ''
                  : toQuarantine
                    ? QUARANTINE_ROOM_ID
                    : backFromQuarantineToActive
                      ? ''
                      : p.roomId,
                tableId: toDead
                  ? ''
                  : toQuarantine
                    ? QUARANTINE_TABLE_ID
                    : backFromQuarantineToActive
                      ? ''
                      : p.tableId,
                growthStage:
                  status === 'muerta' || status === 'cosechada'
                    ? undefined
                    : (p.growthStage ?? 'vegetacion'),
                deathReason:
                  status === 'muerta' ? deathReason?.trim() || '—' : undefined,
                quarantineAt,
              }
            }),
          }
        })
        if (!prevPlant) return
        const room = get().rooms.find((r) => r.id === prevPlant.roomId)
        const locationLabel = room?.label ?? prevPlant.roomId ?? '—'
        if (status === 'muerta') {
          const event = {
            type: 'plant_death' as const,
            plantId: id,
            strain: prevPlant.strain,
            reason: deathReason?.trim() || '—',
            location: locationLabel,
          }
          useSociosStore.getState().pushNotification(toUINotification(event))
          dispatchTelegram(event)
        } else if (status === 'cuarentena' && prevPlant.status !== 'cuarentena') {
          const event = { type: 'plant_quarantine' as const, plantId: id, strain: prevPlant.strain, action: 'enter' as const }
          useSociosStore.getState().pushNotification(toUINotification(event))
          dispatchTelegram(event)
        } else if (status === 'activa' && prevPlant.status === 'cuarentena') {
          const event = { type: 'plant_quarantine' as const, plantId: id, strain: prevPlant.strain, action: 'exit' as const }
          useSociosStore.getState().pushNotification(toUINotification(event))
          dispatchTelegram(event)
        }
      },

      setPlantGrowthStage: (id, stage) => {
        const plant = get().plants.find((p) => p.id === id)
        if (!plant) return false
        if (plant.status === 'muerta' || plant.status === 'cosechada')
          return false
        set((s) => ({
          plants: s.plants.map((p) =>
            p.id === id ? { ...p, growthStage: stage } : p,
          ),
        }))
        return true
      },

      setPlantFloraSubStage: (id, stage) => {
        const plant = get().plants.find((p) => p.id === id)
        if (!plant) return false
        if (plant.status !== 'activa' && plant.status !== 'cuarentena')
          return false
        set((s) => ({
          plants: s.plants.map((p) =>
            p.id === id ? { ...p, floraSubStage: stage } : p,
          ),
        }))
        return true
      },

      togglePlantSelection: (id) =>
        set((s) => ({
          selectedPlants: s.selectedPlants.includes(id)
            ? s.selectedPlants.filter((pid) => pid !== id)
            : [...s.selectedPlants, id],
        })),

      clearPlantSelection: () => set({ selectedPlants: [] }),

      selectPlants: (ids) =>
        set(() => ({
          selectedPlants: Array.from(new Set(ids)),
        })),

      moveSelectedPlantsToNextStage: () => {
        const selected = new Set(get().selectedPlants)
        if (selected.size === 0) return 0
        let moved = 0
        set((s) => ({
          plants: s.plants.map((p) => {
            if (!selected.has(p.id)) return p
            if (p.status !== 'activa' && p.status !== 'cuarentena') return p
            const current = p.floraSubStage ?? 'pre_flora'
            const next: FloraSubStage =
              current === 'pre_flora'
                ? 'desarrollo'
                : current === 'desarrollo'
                  ? 'maduracion'
                  : 'maduracion'
            if (next !== current) moved += 1
            return { ...p, floraSubStage: next }
          }),
          selectedPlants: [],
        }))
        return moved
      },

      addFitoDiagnostic: (plantId, diag) =>
        set((s) => ({
          plants: s.plants.map((p) => {
            if (p.id !== plantId) return p
            const entry: PlantFitoDiagnostic = {
              id: uid(),
              createdAt: new Date().toISOString(),
              ...diag,
            }
            const prev = p.fitoDiagnostics ?? []
            return {
              ...p,
              fitoDiagnostics: [entry, ...prev],
            }
          }),
        })),

      movePlant: (id, roomId, tableId) => {
        const plant = get().plants.find((p) => p.id === id)
        if (!plant || plant.status === 'cosechada' || plant.status === 'muerta')
          return false
        const onMesa = Boolean(roomId && tableId)
        set((s) => {
          const nextPlants = s.plants.map((p) =>
            p.id === id
              ? {
                  ...p,
                  roomId,
                  tableId,
                  plantedDate: onMesa
                    ? new Date().toISOString().slice(0, 10)
                    : p.plantedDate,
                  status:
                    onMesa && p.status === 'cuarentena' ? ('activa' as const) : p.status,
                  quarantineAt:
                    onMesa && p.status === 'cuarentena'
                      ? undefined
                      : p.quarantineAt,
                }
              : p,
          )
          return {
            plants: nextPlants,
            tables: reconcileTablesWithPlants(s.tables, nextPlants),
          }
        })
        return true
      },

      setPlantMotherStock: (id, isMother, targetTableId) => {
        const plant = get().plants.find((p) => p.id === id)
        if (!plant) return false
        if (!isMother) {
          if (plant.status !== 'activa' && plant.status !== 'cuarentena')
            return false
          set((s) => ({
            plants: s.plants.map((p) =>
              p.id === id ? { ...p, isMotherStock: undefined } : p,
            ),
          }))
          return true
        }
        if (plant.status !== 'activa') return false
        const motherRoom = get().rooms.find((r) => r.id === MOTHER_ROOM_ID)
        if (!motherRoom) return false
        const motherTables = get()
          .tables.filter((tb) => tb.roomId === MOTHER_ROOM_ID)
          .sort((a, b) => a.id.localeCompare(b.id))
        const selectedTableId =
          targetTableId && motherTables.some((tb) => tb.id === targetTableId)
            ? targetTableId
            : motherTables[0]?.id
        if (!selectedTableId) return false

        set((s) => ({
          plants: s.plants.map((p) =>
            p.id === id
              ? {
                  ...p,
                  isMotherStock: true,
                  roomId: MOTHER_ROOM_ID,
                  tableId: selectedTableId,
                }
              : p,
          ),
        }))
        return true
      },

      updateHarvest: (id, partial) =>
        set((s) => ({
          harvestBatches: s.harvestBatches.map((b) =>
            b.id === id ? { ...b, ...partial } : b,
          ),
        })),

      archiveHarvest: (id) =>
        set((s) => ({
          harvestBatches: s.harvestBatches.map((b) =>
            b.id === id ? { ...b, archived: true } : b,
          ),
        })),

      removeHarvestBatch: (id) =>
        set((s) => ({
          harvestBatches: s.harvestBatches.filter((b) => b.id !== id),
        })),

      moveHarvestBatchToCuring: (id, payload) => {
        const { totalDryWeight, trimWasteWeight } = payload
        if (
          !Number.isFinite(totalDryWeight) ||
          totalDryWeight < 0 ||
          !Number.isFinite(trimWasteWeight) ||
          trimWasteWeight < 0
        ) {
          return false
        }
        const s = get()
        const b = s.harvestBatches.find((x) => x.id === id)
        if (!b || b.archived || b.postHarvestStatus !== 'DRYING') return false
        if (b.wetWeight != null && totalDryWeight > b.wetWeight) return false
        set({
          harvestBatches: s.harvestBatches.map((x) =>
            x.id === id
              ? {
                  ...x,
                  dryWeight: totalDryWeight,
                  trimWasteWeight,
                  postHarvestStatus: 'CURING',
                  curingStartedAt: new Date().toISOString(),
                }
              : x,
          ),
        })
        return true
      },

      moveHarvestBatchToStock: (id, payload) => {
        const { premiumG, popcornG, biomassG, vaultLocationLabel } = payload
        const vault = vaultLocationLabel.trim()
        if (!vault) return false
        const p = Number(premiumG)
        const pc = Number(popcornG)
        const bio = Number(biomassG)
        if (
          !Number.isFinite(p) ||
          p < 0 ||
          !Number.isFinite(pc) ||
          pc < 0 ||
          !Number.isFinite(bio) ||
          bio < 0
        ) {
          return false
        }
        const sum = p + pc + bio
        if (sum <= 0) return false
        const s = get()
        const b = s.harvestBatches.find((x) => x.id === id)
        if (!b || b.archived || b.postHarvestStatus !== 'CURING') return false
        if (b.dryWeight != null && sum > b.dryWeight + 0.0001) return false
        set({
          harvestBatches: s.harvestBatches.map((x) =>
            x.id === id
              ? {
                  ...x,
                  stockGradePremiumG: p,
                  stockGradePopcornG: pc,
                  stockGradeBiomassG: bio,
                  vaultLocationLabel: vault,
                  postHarvestStatus: 'STOCK',
                }
              : x,
          ),
        })
        return true
      },

      dispenseFromHarvestBatch: ({ harvestBatchId, grams }) => {
        const g = Number(grams)
        if (!Number.isFinite(g) || g <= 0) return false
        const id = String(harvestBatchId ?? '').trim()
        if (!id) return false
        const s = get()
        const b = s.harvestBatches.find((x) => x.id === id)
        if (!b || b.archived || b.postHarvestStatus !== 'STOCK') return false
        const premium = b.stockGradePremiumG ?? 0
        if (!Number.isFinite(premium) || premium < g - 1e-6) return false
        const nextPremium = Math.max(0, Math.round((premium - g) * 100) / 100)
        set({
          harvestBatches: s.harvestBatches.map((x) =>
            x.id === id ? { ...x, stockGradePremiumG: nextPremium } : x,
          ),
        })
        return true
      },

      restoreToHarvestBatch: ({ harvestBatchId, grams }) => {
        const g = Number(grams)
        if (!Number.isFinite(g) || g <= 0) return false
        const id = String(harvestBatchId ?? '').trim()
        if (!id) return false
        const s = get()
        const b = s.harvestBatches.find((x) => x.id === id)
        if (!b || b.archived || b.postHarvestStatus !== 'STOCK') return false
        const premium = b.stockGradePremiumG ?? 0
        if (!Number.isFinite(premium) || premium < 0) return false
        const nextPremium = Math.max(0, Math.round((premium + g) * 100) / 100)
        set({
          harvestBatches: s.harvestBatches.map((x) =>
            x.id === id ? { ...x, stockGradePremiumG: nextPremium } : x,
          ),
        })
        return true
      },

      recordFloracionHarvestBatch: (payload) => {
        const {
          sourceCardId,
          strain,
          plantCount,
          plantIds: payloadPlantIds,
          roomId,
          tableId,
          roomLabel,
          tableLabel,
        } = payload
        const ids =
          Array.isArray(payloadPlantIds) && payloadPlantIds.length > 0
            ? payloadPlantIds.filter(Boolean)
            : [sourceCardId]
        const n = Math.max(1, Math.floor(Number(plantCount)) || ids.length)
        const createdAt = new Date().toISOString()
        const batch: HarvestBatch = {
          id: uid(),
          roomId: roomId || 'cultivo-floracion',
          tableId: tableId || sourceCardId,
          roomLabel: roomLabel.trim() || 'Cultivo · Floración',
          tableLabel: tableLabel.trim() || 'Floración',
          strain: strain.trim() || 'Sin variedad',
          plantIds: ids,
          plantCount: n,
          wetWeight: null,
          dryWeight: null,
          archived: false,
          createdAt,
          ...newHarvestPipelineFields(createdAt),
        }
        set((s) => ({
          harvestBatches: [batch, ...s.harvestBatches],
        }))
        const harvestEvent = {
          type: 'harvest' as const,
          batchId: batch.id,
          strain: batch.strain,
          plantCount: batch.plantCount,
          location: [batch.roomLabel, batch.tableLabel].filter(Boolean).join(' · '),
        }
        useSociosStore.getState().pushNotification(toUINotification(harvestEvent))
        dispatchTelegram(harvestEvent)
        return batch.id
      },

      removePlant: (id) =>
        set((s) => {
          const nextPlants = s.plants.filter((p) => p.id !== id)
          // also drop references inside harvest batches (so counts stay consistent)
          const nextHarvest = s.harvestBatches.map((b) => {
            if (!b.plantIds.includes(id)) return b
            const plantIds = b.plantIds.filter((pid) => pid !== id)
            return { ...b, plantIds, plantCount: plantIds.length }
          })
          const nextTables = reconcileTablesWithPlants(s.tables, nextPlants)
          return {
            plants: nextPlants,
            harvestBatches: nextHarvest,
            tables: nextTables,
            selectedPlants: s.selectedPlants.filter((pid) => pid !== id),
          }
        }),

      addGeneticsBank: (row) => {
        const payload = geneticsPayloadFromInput(row)
        const name = payload.name
        if (!name) return { ok: false, error: 'name' }
        const key = name.toLowerCase()
        if (
          get().geneticsBank.some((g) => g.name.trim().toLowerCase() === key)
        ) {
          return { ok: false, error: 'duplicate' }
        }
        const id = uid()
        set((s) => ({
          geneticsBank: [...s.geneticsBank, { id, ...payload }],
        }))
        return { ok: true, id }
      },

      updateGeneticsBank: (id, row) => {
        const payload = geneticsPayloadFromInput(row)
        const name = payload.name
        if (!name) return false
        const key = name.toLowerCase()
        const clash = get().geneticsBank.some(
          (g) =>
            g.id !== id && g.name.trim().toLowerCase() === key,
        )
        if (clash) return false
        set((s) => ({
          geneticsBank: s.geneticsBank.map((g) =>
            g.id === id ? { id, ...payload } : g,
          ),
        }))
        return true
      },

      removeGeneticsBank: (id) =>
        set((s) => ({
          geneticsBank: s.geneticsBank.filter((g) => g.id !== id),
        })),
    }),
    {
      name: 'green-luck-cultivation',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        rooms: s.rooms,
        tables: s.tables,
        geneticsBank: s.geneticsBank,
        propagator: s.propagator,
        plants: s.plants,
        cultivoBoard: s.cultivoBoard,
        cultivoTransplantHistory: s.cultivoTransplantHistory,
        cultivoFlowerMoveHistory: s.cultivoFlowerMoveHistory,
        harvestBatches: s.harvestBatches,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<CultivationState> | undefined
        const c = current as CultivationState
        if (!p || typeof p !== 'object') return c
        const baseRoomsRaw =
          Array.isArray(p.rooms) && p.rooms.length ? p.rooms : c.rooms
        const baseTablesRaw =
          Array.isArray(p.tables) && p.tables.length
            ? p.tables.map(normalizeTable)
            : c.tables.map(normalizeTable)
        const baseRooms = baseRoomsRaw.map(normalizeRoom)
        const { rooms: roomsEnsured, tables: tablesEnsured } = ensureMotherRoomPayload(baseRooms, baseTablesRaw)
        const migrated = migrateRoomsAndTablesToSalaLayout({
          rooms: roomsEnsured,
          tables: tablesEnsured,
          plants: Array.isArray(p.plants) ? p.plants.map(normalizePlant) : c.plants,
        })
        const quarantined = ensureQuarantineRoomPayload(migrated)
        return {
          ...c,
          ...p,
          rooms: quarantined.rooms,
          tables: reconcileTablesWithPlants(quarantined.tables, quarantined.plants),
          geneticsBank: Array.isArray(p.geneticsBank)
            ? p.geneticsBank.map(normalizeGenetics)
            : c.geneticsBank,
          propagator: Array.isArray(p.propagator)
            ? p.propagator.map(normalizeSeedling)
            : c.propagator,
          plants: quarantined.plants,
          harvestBatches: Array.isArray(p.harvestBatches)
            ? p.harvestBatches.map(normalizeHarvest)
            : c.harvestBatches,
          cultivoBoard: normalizeCultivoBoard(
            (p as Partial<CultivationState>).cultivoBoard,
          ),
          cultivoTransplantHistory: Array.isArray(
            (p as Partial<CultivationState>).cultivoTransplantHistory,
          )
            ? normalizeTransplantHistory(
                (p as Partial<CultivationState>).cultivoTransplantHistory,
              )
            : c.cultivoTransplantHistory,
          cultivoFlowerMoveHistory: Array.isArray(
            (p as Partial<CultivationState>).cultivoFlowerMoveHistory,
          )
            ? normalizeFlowerMoveHistory(
                (p as Partial<CultivationState>).cultivoFlowerMoveHistory,
              )
            : c.cultivoFlowerMoveHistory,
        }
      },
    },
  ),
)
