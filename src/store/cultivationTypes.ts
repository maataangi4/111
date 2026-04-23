/** Etapa física de la mesa (no confundir con estado de planta). */
export type TableStage = 'empty' | 'vegetacion' | 'floracion'

/** Id fijo del salón de plantas madre (esquejes). */
export const MOTHER_ROOM_ID = 'r1' as const

export interface CultivationRoom {
  id: string
  label: string
  /** Zala 1: solo vegetación en mesas. */
  vegetationOnly: boolean
  /** Sala dedicada a madres — se lista en mapa y el menú puede enviar aquí las marcadas. */
  isMotherRoom?: boolean
}

export interface CultivationTable {
  id: string
  roomId: string
  label: string
  stage: TableStage
  /** Variedad / cepa actual (vacío si mesa vacía). */
  strain: string
}

export type PlantStatus = 'activa' | 'cuarentena' | 'muerta' | 'cosechada'
export type FloraSubStage = 'pre_flora' | 'desarrollo' | 'maduracion'

/** Semilla vs esqueje en propagador. */
export type SeedlingOrigin = 'semilla' | 'clone'

/** Origen del material vegetativo cuando es esqueje. */
export type CloneOriginKind = 'propio' | 'externo'

/** Propagador (pre-vegetación): sin pulsera. `id` solo técnico (persistencia/React), no es pulsera. */
export interface PropagatorSeedling {
  id: string
  strain: string
  seededDate: string
  /** ISO: момент добавления строки в propagador (новые сверху). */
  addedAt: string
  origin: SeedlingOrigin
  /** Genética / lineage — opcional. */
  genetics?: string
  /** Pulsera de la planta madre (obligatorio si `origin === 'clone'`). */
  motherPlantId?: string
}

/** Entrada en historial de la Clínica fitosanitaria (diagnóstico IA o manual). */
export interface PlantFitoDiagnostic {
  id: string
  createdAt: string
  symptoms: string[]
  notes?: string
  imageDataUrl?: string
  diagnostico: string
  certeza: number
  tratamiento: string[]
  aislamiento: boolean
}

export interface PlantRecord {
  id: string
  strain: string
  roomId: string
  tableId: string
  plantedDate: string
  status: PlantStatus
  /** Etapa por planta en el registro (independiente de la etapa de mesa). */
  growthStage?: TableStage
  /** Sub-etapa de floración para tablero kanban de cultivo. */
  floraSubStage?: FloraSubStage
  deathReason?: string
  /** ISO: момент регистрации в реестре (резерва с браслетом и т.д.); новые сверху. */
  registeredAt?: string
  /** Esqueje: ID pulsera de la planta madre en el mismo registro. */
  motherPlantId?: string
  /** Planta madre (stock para clonar) — suele vivir en Zala Madre. */
  isMotherStock?: boolean
  /** Inicio del último período en cuarentena (ISO). */
  quarantineAt?: string
  /** Historial de consultas / recetas guardadas. */
  fitoDiagnostics?: PlantFitoDiagnostic[]
}

/** Catálogo de variedades / genética en agronomía. Las filas de stock enlazan por `geneticsEntryId`. */
export interface GeneticsBankEntry {
  id: string
  name: string
  imageUrl: string
  /** Notas internas breves (legacy / libre). */
  notes?: string
  /** Descripción corta (General). */
  summary?: string
  breeder?: string

  /** Cultivo — semanas floración, época cosecha, rendimientos, etc. */
  floweringWeeks?: string
  harvestPeriod?: string
  yieldIndoor?: string
  yieldOutdoor?: string
  growNotes?: string
  plantStructure?: string

  /** Genética — linaje, ratio, parentales. */
  lineage?: string
  geneticRatio?: string
  parentStrains?: string
  /** Perfil químico / estructura (catálogo JSON, %). */
  thcPercent?: number
  cbdPercent?: number
  sativaPercent?: number
  indicaPercent?: number
  ruderalisPercent?: number

  /** Perfil consumidor: ids desde `strainProfileTags` (listas por categoría). */
  aromas: string[]
  efectosPositivos: string[]
  medicinal: string[]
  terpenos: string[]
  efectosNegativos: string[]
}

/** Pipeline post-cosecha: secado → curado → inventario final. */
export type PostHarvestStatus = 'DRYING' | 'CURING' | 'STOCK'

export interface HarvestBatch {
  id: string
  roomId: string
  tableId: string
  roomLabel: string
  tableLabel: string
  strain: string
  plantIds: string[]
  plantCount: number
  wetWeight: number | null
  dryWeight: number | null
  archived: boolean
  createdAt: string
  /** Fecha de corte (YYYY-MM-DD). */
  harvestDate: string
  postHarvestStatus: PostHarvestStatus
  /** Peso merma / trim al pasar a curado (g). */
  trimWasteWeight: number | null
  /** Inicio de curado (ISO). */
  curingStartedAt?: string
  /** Clasificación en stock final (g). */
  stockGradePremiumG: number | null
  stockGradePopcornG: number | null
  stockGradeBiomassG: number | null
  /** Ubicación bóveda / almacén final (etiqueta). */
  vaultLocationLabel?: string
}

/** IDs estables para variedades semilla del banco (alinear filas de stock CRM tras recarga). */
export const SEED_GENETICS_IDS = {
  florPremium: 'gen-seed-flor-premium',
  shakeSeco: 'gen-seed-shake-seco',
  extraccion: 'gen-seed-extraccion',
  bearsOg: 'gen-seed-3-bears-og',
} as const

/** Método de riego en propagador / ciclo (no catálogo de genética). */
export type IrrigationMethodCode =
  | 'manual'
  | 'drip'
  | 'ebb_flow'
  | 'nft'
  | 'autopot'
  | 'other'
  | 'dwc'
  | 'wick'
  | 'aeroponic'
  | 'sprinkler'

/** Método de germinación normalizado + «Otro». */
export type GerminationMethodCode =
  | 'cotton_discs'
  | 'water'
  | 'peat_tablet'
  | 'soil_direct'
  | 'other'

/** Tipo de iluminación (UI profesional) + «Otro». */
export type LightingPresetCode = 'led' | 'hps' | 'cmh' | 'fluorescent' | 'sun' | 'other'

/** Sustrato / medio (UI profesional) + «Otro». */
export type SubstratePresetCode = 'soil' | 'coco' | 'rockwool' | 'water_hydro' | 'leca' | 'other'

/** Volumen de maceta predefinido (litros nominales) + «Otro». */
export type PotVolumePresetCode = '1' | '3' | '5' | '7' | '11' | '15' | '20' | '50_plus' | 'other'

/** Fotoperíodo vs auto — afecta recordatorios en veg (auto) y lógica futura. */
export type GeneticsType = 'fotoperiodica' | 'automatica'

export const GENETICS_TYPE_OPTIONS: { value: GeneticsType; label: string }[] = [
  { value: 'fotoperiodica', label: 'Fotoperiódica' },
  { value: 'automatica', label: 'Automática' },
]

/** Días desde fecha de siembra hasta floración esperada (auto); rango típico 25–30, usamos 28 como referencia. */
export const AUTO_EXPECT_FLOWER_DAYS_FROM_SOWING = 28

/** Tarjeta del tablero kanban Cultivo (germinación / veg / flor). Persistida en `useCultivationStore`. */
export type TransplantLossReasonCode =
  | 'rejection'
  | 'weak_roots'
  | 'mold'
  | 'not_germinated'
  | 'other'

export const TRANSPLANT_LOSS_REASONS: {
  code: TransplantLossReasonCode
  label: string
}[] = [
  { code: 'rejection', label: 'Отбраковка' },
  { code: 'weak_roots', label: 'Слабые корни' },
  { code: 'mold', label: 'Плесень' },
  { code: 'not_germinated', label: 'Не проросли' },
  { code: 'other', label: 'Другое' },
]

/** Режим маркировки при переводе в вегетацию (сканер vs цветные стяжки). */
export type TransplantTrackingMode = 'id' | 'color'

/** Ключ цвета физической стяжки / колышка (Por Color / Grupo). */
export type BraceletColorTagKey =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'white'
  | 'black'

export const BRACELET_COLOR_TRACKING_OPTIONS: {
  key: BraceletColorTagKey
  emoji: string
  /** Для фразы «etiqueta …» (жен. род) */
  labelEtiqueta: string
  /** Короткий код в теге (Red-01) */
  code: string
}[] = [
  { key: 'red', emoji: '🔴', labelEtiqueta: 'Roja', code: 'Red' },
  { key: 'blue', emoji: '🔵', labelEtiqueta: 'Azul', code: 'Blue' },
  { key: 'green', emoji: '🟢', labelEtiqueta: 'Verde', code: 'Green' },
  { key: 'yellow', emoji: '🟡', labelEtiqueta: 'Amarilla', code: 'Yellow' },
  { key: 'white', emoji: '⚪', labelEtiqueta: 'Blanca', code: 'White' },
  { key: 'black', emoji: '⚫', labelEtiqueta: 'Negra', code: 'Black' },
]

/** Журнал событий партии в пропагаторе (заметки, замеры, система, operational diario). */
export type PropagacionLogKind =
  | 'note'
  | 'measurement'
  | 'system'
  | 'diario_riego_nutricion'
  | 'diario_inspeccion'
  | 'diario_clima'
  | 'diario_mantenimiento'
  | 'diario_propagacion_checklist'
  | 'diario_descarte'
  | 'diario_altura_canopy'
  | 'diario_baja_planta'
  | 'diario_cuarentena'
  | 'diario_reubicacion'

/** Baja / descarte de unidades en germinación (antes de pulseras), para cuadrar inventario. */
export type DiarioDescarteData = {
  count: number
  reason: string
}

/** Estado por planta con pulsera (veg / flor) — cumplimiento / inventario del lote. */
export type CultivoUnitStatus = 'active' | 'baja' | 'quarantine'

/** Motivo obligatorio al registrar baja en veg o flor (informes tipo INASE). */
export type CultivoLateBajaReasonCode =
  | 'plagas'
  | 'hongos'
  | 'hermafroditismo'
  | 'accidente'
  | 'crecimiento_debil'

export const CULTIVO_LATE_BAJA_REASONS: { code: CultivoLateBajaReasonCode; labelKey: string }[] = [
  { code: 'plagas', labelKey: 'diario.lateBaja.plagas' },
  { code: 'hongos', labelKey: 'diario.lateBaja.hongos' },
  { code: 'hermafroditismo', labelKey: 'diario.lateBaja.hermafroditismo' },
  { code: 'accidente', labelKey: 'diario.lateBaja.accidente' },
  { code: 'crecimiento_debil', labelKey: 'diario.lateBaja.crecimiento_debil' },
]

export type CultivoDestruccionMethodCode = 'compost' | 'quimicos' | 'trituracion' | 'otro'

export const CULTIVO_DESTRUCCION_METHODS: { code: CultivoDestruccionMethodCode; labelKey: string }[] = [
  { code: 'compost', labelKey: 'diario.destruccion.compost' },
  { code: 'quimicos', labelKey: 'diario.destruccion.quimicos' },
  { code: 'trituracion', labelKey: 'diario.destruccion.trituracion' },
  { code: 'otro', labelKey: 'diario.destruccion.otro' },
]

/** Registro de baja / descarte por IDs (pulseras) en vegetación o floración. */
export type DiarioBajaPlantaData = {
  /** Id estable del acta digital (mismo en el log de cada planta afectada). */
  actaId: string
  plantIds: string[]
  reasonCode: CultivoLateBajaReasonCode
  /** Peso fresco de biomasa desechada (g), recomendado en floración. */
  weightGrams?: number
  destructionMethodCode: CultivoDestruccionMethodCode
  destructionMethodNotes?: string
  notes?: string
}

/** Aislamiento temporal (sala cuarentena en topología). */
export type DiarioCuarentenaData = {
  plantIds: string[]
  reason: string
  topologyRoomId: string
  topologyFixtureId?: string
  topologyLevelId?: string
  locationLabel: string
}

/** Traslado de plantas a otra ubicación física (veg / flor). */
export type DiarioReubicacionData = {
  plantIds: string[]
  movedCount: number
  locationLabel: string
}

/** Tareas rápidas específicas de germinación (aclimatación, foliar, raíces). */
export type DiarioPropagacionChecklistCode = 'aclimatacion' | 'pulverizacion_foliar' | 'chequeo_raices'

export type DiarioPropagacionChecklistData = {
  code: DiarioPropagacionChecklistCode
  /** Texto final en timeline (preset o libre). */
  line: string
}

/** Данные записи «полив / питание» (Diario). */
export type DiarioRiegoNutricionData = {
  recipeToolId?: string | null
  recipeLabel: string
  volumeValue: number
  volumeUnit: 'L' | 'gal'
  inletPh?: number
  inletEc?: number
  drainPh?: number
  drainEc?: number
  /** Floración: registro de inicio de lavado de raíces (solo agua). */
  flushStarted?: boolean
}

export type DiarioPestCode = 'thrips' | 'spider_mite' | 'aphid' | 'none'
export type DiarioDiseaseCode = 'oidium' | 'botrytis' | 'def_n' | 'none'

/** Madurez por tricomas (inspección en floración). */
export type DiarioTrichomeStage = 'clear' | 'milky' | 'amber'

/** Осмотр / IPM. */
export type DiarioInspeccionData = {
  healthScore: 1 | 2 | 3 | 4 | 5
  pests: DiarioPestCode[]
  diseases: DiarioDiseaseCode[]
  /** Floración: estado de tricomas. */
  trichomeStage?: DiarioTrichomeStage
  photoDataUrl?: string
  notes?: string
}

/** Климат (ручной ввод). */
export type DiarioClimaData = {
  tempC?: number
  rhPct?: number
  vpdKpa?: number
  co2Ppm?: number
  ppfd?: number
  dli?: number
}

/**
 * Tareas de formación en vegetación (Diario → Mantenimiento).
 * Estrategia global (SCROG, etc.) va en pasaporte (`vegCultivationTechniqueCode`); aquí solo tácticas / trabajo realizado.
 */
export type DiarioVegMantenimientoTag =
  | 'topping'
  | 'defoliacion'
  | 'lst'
  | 'transplante'
  /** Colocación de red SCROG. */
  | 'scrog_net'
  /** Guiado / tejido en la red. */
  | 'scrog_weave'
  /** Poda de bajos (lollipopping). */
  | 'lollipop_lower'

/** Mantenimiento específico de floración (sin topping / supercropping). */
export type DiarioFlorMantenimientoTag = 'flor_schwazz' | 'flor_second_net'

/** Plan de cultivo en vegetación (pasaporte → entorno). */
export type VegCultivationTechniqueCode =
  | 'tradicional'
  | 'scrog'
  | 'sog'
  | 'lst'
  | 'mainlining'
  | 'supercropping'
  | 'other'

export const VEG_CULTIVATION_TECHNIQUE_ORDER: VegCultivationTechniqueCode[] = [
  'tradicional',
  'scrog',
  'sog',
  'lst',
  'mainlining',
  'supercropping',
  'other',
]

export type DiarioMantenimientoData = {
  notes: string
  vegTags?: DiarioVegMantenimientoTag[]
  florTags?: DiarioFlorMantenimientoTag[]
}

export type DiarioAlturaCanopyData = {
  heightCm: number
}

/** Registro de división de partida (misma genética, nueva ubicación / sourceBatchId). */
export type SplitLoteLogData = {
  movedCount: number
  newBatchId: string
  fromBatchId: string
  locationLabel: string
}

export type PropagacionLogEntry = {
  id: string
  at: string
  kind: PropagacionLogKind
  text?: string
  author?: string
  ph?: number
  phPrev?: number
  ec?: number
  ecPrev?: number
  tempC?: number
  /** Eventos de sistema en el timeline (Diario continuo entre etapas). */
  systemKey?:
    | 'batch_created'
    | 'moved_to_vegetacion'
    | 'moved_to_floracion'
    | 'moved_to_cosecha'
    | 'lote_split'
  /** Metadatos de «Dividir lote» (auditoría). */
  splitLote?: SplitLoteLogData
  diarioRiegoNutricion?: DiarioRiegoNutricionData
  diarioInspeccion?: DiarioInspeccionData
  diarioClima?: DiarioClimaData
  diarioMantenimiento?: DiarioMantenimientoData
  diarioPropagacionChecklist?: DiarioPropagacionChecklistData
  diarioDescarte?: DiarioDescarteData
  diarioAlturaCanopy?: DiarioAlturaCanopyData
  diarioBajaPlanta?: DiarioBajaPlantaData
  diarioCuarentena?: DiarioCuarentenaData
  diarioReubicacion?: DiarioReubicacionData
}

/** История переводов партии → вегетация (аудит + списания). */
export type CultivationTransplantHistoryEntry = {
  id: string
  at: string
  batchId: string
  strain: string
  transferredCount: number
  lossCount: number
  lossReasonCode?: TransplantLossReasonCode
  lossReasonLabel?: string
  /** Заметка к сессии (цвет браслета, ник и т.д.). */
  notes?: string
  trackingMode?: TransplantTrackingMode
  /** Человекочитаемая метка цвета (аудит). */
  colorTagLabel?: string
}

export type PlantCardItem = {
  id: string
  strain: string
  quantity?: number
  initialQuantity?: number
  trackingType?: 'lote' | 'planta'
  /** Индивидуальный ID браслета после перевода в вегетацию. */
  braceletId?: string
  /** Исходный Lote до архивации. */
  sourceBatchId?: string
  /** Tras Dividir lote: etiqueta visible A/B/C… (misma cepa, otro grupo físico). */
  lotSegmentSuffix?: string
  /** Trazabilidad: sourceBatchId del grupo del que se separó este sub-lote. */
  splitFromSourceBatchId?: string
  /** Маркировка группы по цвету стяжки (без сканера). */
  colorTagKey?: BraceletColorTagKey
  seedType: 'Semilla' | 'Clon'
  /** Sub-tipo de semilla: genética certificada INASE o nueva genética propia del club. */
  seedOriginType?: 'certificada' | 'propia'
  /** Código INASE — solo cuando seedOriginType === 'certificada'. */
  inaseCode?: string
  /** Esqueje propio (madre en registro) vs comprado / externo. */
  cloneOrigin?: CloneOriginKind
  /** Proveedor u origen si `cloneOrigin === 'externo'`. */
  cloneExternalSource?: string
  /** Tipo de genética (lote → plantas al trasplantar). */
  geneticsType?: GeneticsType
  /** Base cultivation mode. */
  growMode?: 'indoor' | 'outdoor'
  date: string
  stageTag: string
  stage: string
  location: string
  /** Узел топологии (настройки → локации). */
  topologyRoomId?: string
  topologyFixtureId?: string
  topologyLevelId?: string
  imageUrl: string
  ageDays?: number
  motherPlantId?: string
  healthStatus?: 'ok' | 'plaga' | 'alert'
  /** Inicio floración (YYYY-MM-DD) — base para pronóstico de cosecha. */
  floweringStartDate?: string
  /** Altura media registrada al pasar a flor (cm). */
  flowerAvgHeightCm?: number
  /** Poda / defoliación al traslado a floración. */
  flowerPruningType?: FlowerPruningType
  /** Fecha en que entró a vegetación (YYYY-MM-DD), al trasplantar desde germinación. */
  vegetacionStartDate?: string
  /** ISO datetime when entered germinación stage; day counter anchor. */
  propagacionStartedAt?: string
  /** ISO datetime when entered vegetacion; day counter anchor. */
  vegetacionStartedAt?: string
  /** ISO datetime when entered floracion; day counter anchor. */
  floracionStartedAt?: string
  /** ISO datetime cuando el lote pasó a la columna Cosecha (tras registrar cosecha). */
  cosechaStartedAt?: string
  /** Semanas de floración 12/12 para fotoperíodo, asignadas al pasar a floración. */
  flowerDurationWeeks?: number
  /** Propagacion passport / environment / nutrients (optional). */
  breeder?: string
  seedCount?: number
  germinationStartDate?: string
  /** Valores estándar de germinación; `other` usa `germinationMethod` como texto libre. */
  germinationMethodCode?: GerminationMethodCode
  germinationMethod?: string
  cloneGeneration?: string
  rootingHormone?: string
  lightingSchedule?: string
  lightingSpec?: string
  /** Preset de tipo de luz; si `other`, el texto libre va en `lightingCustom`. */
  lightingPresetCode?: LightingPresetCode
  lightingCustom?: string
  /** PPFD objetivo / medido en propagador o sala (μmol/m²/s). */
  lightingPpfd?: number
  substrateType?: string
  substratePresetCode?: SubstratePresetCode
  /** Enlace a Inventario / Herramientas. */
  substrateToolId?: string
  fertilizerToolId?: string
  lightingToolId?: string
  potToolId?: string
  nutrientLine?: string
  nutrientPh?: number
  nutrientEc?: number
  solutionTempC?: number
  /** История / журнал (герминация). */
  propagacionLog?: PropagacionLogEntry[]
  /**
   * Texto de descripción solo para esta partida (toma precedencia sobre `summary`/`notes` del banco).
   * `undefined` = usar datos JSON del catálogo; string vacío = sin texto mostrado.
   */
  batchStrainDescription?: string
  /** Overrides fenotipo vs catálogo (plantilla por variedad). */
  batchThcPercent?: number
  batchCbdPercent?: number
  batchSativaPercent?: number
  batchIndicaPercent?: number
  batchRuderalisPercent?: number
  /** Riego (ciclo). */
  irrigationMethodCode?: IrrigationMethodCode
  irrigationMethodCustom?: string
  /** Volumen maceta + unidad de visualización. */
  potSizeValue?: number
  potSizeUnit?: 'L' | 'gal'
  /** Volumen según tallas estándar; `50_plus` = 50 L+; con `other` usan num/unidad. */
  potVolumePresetCode?: PotVolumePresetCode
  /** Vegetación: técnica / estrategia de formación (pasaporte). */
  vegCultivationTechniqueCode?: VegCultivationTechniqueCode
  /** Si `vegCultivationTechniqueCode === 'other'`. */
  vegCultivationTechniqueCustom?: string
  /** Veg/flor: seguimiento individual (baja documentada o cuarentena). */
  cultivoUnitStatus?: CultivoUnitStatus
  quarantineReason?: string
  quarantineSinceAt?: string
}

export type CultivoKanbanTab = 'propagacion' | 'vegetacion' | 'floracion' | 'cosecha'

export type CultivoKanbanState = Record<CultivoKanbanTab, PlantCardItem[]>

/** Bajas al pasar de vegetación a floración (otros motivos que el trasplante desde propagador). */
export type FlowerBajaReasonCode = 'weak_plant' | 'male_herm' | 'disease_pest'

export const FLOWER_BAJA_REASONS: { code: FlowerBajaReasonCode; label: string }[] = [
  { code: 'weak_plant', label: 'Planta débil' },
  { code: 'male_herm', label: 'Macho / Hermafrodita' },
  { code: 'disease_pest', label: 'Plagas / Enfermedad' },
]

export type FlowerPruningType = 'ninguna' | 'lollipopping' | 'topping' | 'defoliacion'

export const FLOWER_PRUNING_OPTIONS: { value: FlowerPruningType; label: string }[] = [
  { value: 'ninguna', label: 'Ninguna' },
  { value: 'lollipopping', label: 'Lollipopping' },
  { value: 'topping', label: 'Topping' },
  { value: 'defoliacion', label: 'Defoliación' },
]

/** Auditoría: sesión veg → floración. */
export type CultivationFlowerMoveHistoryEntry = {
  id: string
  at: string
  strain: string
  sourceBatchId?: string
  selectedCount: number
  bajasCount: number
  bajaReasonCode?: FlowerBajaReasonCode
  bajaReasonLabel?: string
  floweringStartDate: string
  /** Opcional: ya no se exige en el modal de traslado. */
  avgHeightCm?: number
  pruningType: FlowerPruningType
  /** Solo genética fotoperíodica. */
  flowerDurationWeeks?: number
  locationLabel: string
  topologyRoomId: string
  topologyFixtureId?: string
  topologyLevelId?: string
  plantIds: string[]
}
