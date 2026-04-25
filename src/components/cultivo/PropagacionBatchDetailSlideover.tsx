import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRightCircle,
  ClipboardList,
  Diamond,
  Droplets,
  Trash2,
  FileText,
  FlaskConical,
  GitBranch,
  LayoutGrid,
  Leaf,
  Package,
  Pencil,
  Plus,
  Rocket,
  Ruler,
  Scissors,
  Search,
  ShieldAlert,
  Skull,
  Sprout,
  Sun,
  TestTube2,
  Thermometer,
  MapPin,
  X,
  Zap,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  CultivoKanbanTab,
  CultivoDestruccionMethodCode,
  CultivoLateBajaReasonCode,
  DiarioBajaPlantaData,
  DiarioPropagacionChecklistCode,
  GerminationMethodCode,
  IrrigationMethodCode,
  LightingPresetCode,
  PotVolumePresetCode,
  PropagacionLogEntry,
  SubstratePresetCode,
  VegCultivationTechniqueCode,
} from '../../store/cultivationTypes'
import { type AppLocale, useSettingsStore } from '../../store/useSettingsStore'
import type { TopologySelection } from '../../store/locationTopologyTypes'
import type { PlantCardItem } from './PlantCard'
import { useCrmStore } from '../../store/useCrmStore'
import { useCultivationStore } from '../../store/useCultivationStore'
import { DEFAULT_TOPOLOGY_COMPANY_ID, useLocationTopologyStore } from '../../store/useLocationTopologyStore'
import { useToolsStore } from '../../store/useToolsStore'
import {
  propagacionAliveCount,
  propagacionPlantedBaseline,
  sumDiarioDescarte,
} from '../../lib/cultivo/propagacionCounts'
import { resolveCultivoPeerGroup } from '../../lib/cultivo/resolveCultivoPeerGroup'
import { formatTopologyLabel } from '../../lib/locationTopologyFormat'
import {
  applyDiarioBajaPlantaToBoard,
  applyDiarioCuarentenaToBoard,
} from '../../lib/cultivo/applyLateStageCompliance'
import { appendDiarioToBoard } from '../../lib/diario/appendPropagacionDiario'
import { patchCultivoBoardItem } from '../../lib/cultivo/patchCultivoBoardItem'
import { formatDiarioLogSummaryLine } from '../../lib/diario/formatDiarioSummary'
import { formatInClubTimeZone } from '../../lib/clubTime'
import { formatDiarioTimestamp } from '../../lib/diario/formatDiarioTimestamp'
import { DiarioAlturaCanopyModal } from '../diario/DiarioAlturaCanopyModal'
import { DiarioActionMenu } from '../diario/DiarioActionMenu'
import { DiarioClimaModal } from '../diario/DiarioClimaModal'
import { DiarioDescarteModal } from '../diario/DiarioDescarteModal'
import { DiarioRegistrarBajaModal } from '../diario/DiarioRegistrarBajaModal'
import { DiarioCuarentenaModal } from '../diario/DiarioCuarentenaModal'
import { ActaDestruccionModal } from '../diario/ActaDestruccionModal'
import { DiarioInspeccionModal } from '../diario/DiarioInspeccionModal'
import { DiarioMantenimientoModal } from '../diario/DiarioMantenimientoModal'
import { DiarioPropagacionChecklistModal } from '../diario/DiarioPropagacionChecklistModal'
import { DiarioRiegoNutricionModal } from '../diario/DiarioRiegoNutricionModal'
import { useTranslation } from '../../i18n/useTranslation'
import { SoftSelect } from '../ui/SoftSelect'
import { ToolsInventorySearchSelect } from '../ui/ToolsInventorySearchSelect'
import { cn } from '../../lib/cn'
import { GrowModeFieldModal } from './envFieldModals/GrowModeFieldModal'
import { IrrigationFieldModal } from './envFieldModals/IrrigationFieldModal'
import { VegTechniqueFieldModal } from './envFieldModals/VegTechniqueFieldModal'
import { LightingFieldModal } from './envFieldModals/LightingFieldModal'
import { PotVolumeFieldModal } from './envFieldModals/PotVolumeFieldModal'
import { SubstrateFieldModal } from './envFieldModals/SubstrateFieldModal'
import { PropagacionBatchDashboard } from './PropagacionBatchDashboard'
import { CanspaceMarkThumb } from './CanspaceMarkThumb'
import {
  RelocatePlantsModal,
  type RelocatePlantsConfirmPayload,
} from './RelocatePlantsModal'

/** Día de cultivo siempre 1-based: el día de inicio cuenta como día 1 (nunca 0). */
function dayOfCycleFromStartIso(isoDate: string): number {
  const start = new Date(isoDate)
  if (Number.isNaN(start.getTime())) return 1
  const now = new Date()
  const fullDays = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  return Math.max(1, fullDays + 1)
}

function formatRuDate(iso: string, timeZone: string): string {
  const d = new Date(iso + (iso.length <= 10 ? 'T12:00:00' : ''))
  if (Number.isNaN(d.getTime())) return iso
  return formatInClubTimeZone(d, timeZone, 'ru', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const uid =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? () => crypto.randomUUID()
    : () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

type TSlide = (k: string, vars?: Record<string, string | number>) => string

function looksLikeBraceletUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())
}

function braceletLineDetail(p: PlantCardItem, tf: TSlide): string {
  const br = p.braceletId?.trim()
  if (br) {
    return br.startsWith('#')
      ? tf('diario.bajaBracelet', { id: br })
      : tf('diario.bajaBraceletHash', { id: br.replace(/^#/, '') })
  }
  const id = p.id.trim()
  if (looksLikeBraceletUuid(id)) return tf('diario.bajaBraceletUuid', { tail: id.slice(-8) })
  return tf('diario.bajaBraceletHash', { id })
}

/** Quita « · Rating X.X» del resumen importado (API / JSON legado). */
function stripCatalogRatingFromSummary(text: string): string {
  if (!text.trim()) return text.trim()
  return text
    .replace(/\s*·\s*Rating\s+[\d.]+\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Primera letra «visible» de cada línea en mayúscula (p. ej. hybrid → Hybrid). Solo para texto del catálogo. */
function capitalizeFirstLetterEachLine(text: string): string {
  if (!text) return text
  return text
    .split('\n')
    .map((line) => {
      const leadingSpace = line.match(/^\s*/)?.[0] ?? ''
      const rest = line.slice(leadingSpace.length)
      if (!rest) return line
      const idx = rest.search(/\p{L}/u)
      if (idx === -1) return line
      const ch = rest[idx]
      return (
        leadingSpace + rest.slice(0, idx) + ch.toLocaleUpperCase() + rest.slice(idx + ch.length)
      )
    })
    .join('\n')
}

/** Si el JSON solo trae `geneticRatio` como texto (p. ej. «80% Indica / 20% Sativa»). */
function parseGeneticRatioPercents(text: string | undefined): {
  sativa?: number
  indica?: number
  ruderalis?: number
} {
  if (!text?.trim()) return {}
  const out: { sativa?: number; indica?: number; ruderalis?: number } = {}
  const re = /(\d+(?:\.\d+)?)\s*%\s*(indica|sativa|ruderalis)\b/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const v = Math.max(0, Math.min(100, Math.round(Number(m[1]) * 10) / 10))
    if (!Number.isFinite(v)) continue
    const k = m[2].toLowerCase()
    if (k === 'indica') out.indica = v
    else if (k === 'sativa') out.sativa = v
    else if (k === 'ruderalis') out.ruderalis = v
  }
  return out
}

function EmptyActionLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-left text-sm font-medium text-sky-700/90 underline decoration-sky-600/40 underline-offset-2 transition hover:text-sky-800 hover:decoration-sky-700 dark:text-sky-300 dark:decoration-sky-500/50 dark:hover:text-sky-200 dark:hover:decoration-sky-400"
    >
      <Plus className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2.5} />
      {children}
    </button>
  )
}

const GERMINATION_CODES: GerminationMethodCode[] = [
  'cotton_discs',
  'water',
  'peat_tablet',
  'soil_direct',
  'other',
]

function germT(code: GerminationMethodCode, t: (k: string) => string): string {
  const keys: Record<GerminationMethodCode, string> = {
    cotton_discs: 'germinacionDetail.germCottonDiscs',
    water: 'germinacionDetail.germWater',
    peat_tablet: 'germinacionDetail.germPeatTablet',
    soil_direct: 'germinacionDetail.germSoilDirect',
    other: 'germinacionDetail.germOtherOption',
  }
  return t(keys[code])
}

function irrigT(code: IrrigationMethodCode, t: (k: string) => string): string {
  const keys: Record<IrrigationMethodCode, string> = {
    manual: 'germinacionDetail.irrigManual',
    drip: 'germinacionDetail.irrigDrip',
    dwc: 'germinacionDetail.irrigDwc',
    nft: 'germinacionDetail.irrigNft',
    ebb_flow: 'germinacionDetail.irrigEbbFlow',
    autopot: 'germinacionDetail.irrigAutopot',
    wick: 'germinacionDetail.irrigWick',
    aeroponic: 'germinacionDetail.irrigAeroponic',
    sprinkler: 'germinacionDetail.irrigSprinkler',
    other: 'germinacionDetail.irrigOther',
  }
  return t(keys[code])
}

function lightingCardLabel(code: LightingPresetCode, t: (k: string) => string): string {
  const keys: Record<LightingPresetCode, string> = {
    led: 'germinacionDetail.lightPresetLed',
    hps: 'germinacionDetail.lightPresetHps',
    cmh: 'germinacionDetail.lightPresetCmh',
    fluorescent: 'germinacionDetail.lightPresetFluor',
    sun: 'germinacionDetail.lightPresetSun',
    other: 'germinacionDetail.irrigOther',
  }
  return t(keys[code])
}

function substrateCardLabel(code: SubstratePresetCode, t: (k: string) => string): string {
  const keys: Record<SubstratePresetCode, string> = {
    soil: 'germinacionDetail.subPresetSoil',
    coco: 'germinacionDetail.subPresetCoco',
    rockwool: 'germinacionDetail.subPresetRockwool',
    water_hydro: 'germinacionDetail.subPresetWater',
    leca: 'germinacionDetail.subPresetLeca',
    other: 'germinacionDetail.irrigOther',
  }
  return t(keys[code])
}

function potCardLabel(code: Exclude<PotVolumePresetCode, 'other'>, t: (k: string) => string): string {
  const keys: Record<Exclude<PotVolumePresetCode, 'other'>, string> = {
    '1': 'germinacionDetail.potPreset1L',
    '3': 'germinacionDetail.potPreset3L',
    '5': 'germinacionDetail.potPreset5L',
    '7': 'germinacionDetail.potPreset7L',
    '11': 'germinacionDetail.potPreset11L',
    '15': 'germinacionDetail.potPreset15L',
    '20': 'germinacionDetail.potPreset20L',
    '50_plus': 'germinacionDetail.potPreset50Plus',
  }
  return t(keys[code])
}

function formatPotDisplay(
  value: number | undefined,
  unit: 'L' | 'gal' | undefined,
  locale: AppLocale,
): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  const u = unit === 'gal' ? 'gal' : 'L'
  const n = Math.round(value * 10) / 10
  if (u === 'gal') return `${n} gal`
  return locale === 'es' ? `${n} L` : `${n} л`
}

function vegStageDayNumber(item: PlantCardItem): number {
  const startedAt = item.vegetacionStartedAt?.trim()
  if (startedAt) {
    const ms = Date.parse(startedAt)
    if (Number.isFinite(ms)) {
      const elapsedMs = Math.max(0, Date.now() - ms)
      return Math.floor(elapsedMs / 86_400_000) + 1
    }
  }
  if (item.ageDays != null && Number.isFinite(item.ageDays)) {
    return Math.max(1, Math.round(item.ageDays))
  }
  const m = String(item.stageTag ?? '').match(/(\d+)/)
  if (m) return Math.max(1, parseInt(m[1]!, 10))
  return 1
}

function florFlowerDayNumber(item: PlantCardItem): number {
  const iso = item.floracionStartedAt?.trim()
  if (iso) {
    const ms = Date.parse(iso)
    if (Number.isFinite(ms)) {
      return Math.max(1, Math.floor(Math.max(0, Date.now() - ms) / 86_400_000) + 1)
    }
  }
  const d = item.floweringStartDate?.trim()
  if (d) {
    const ms = Date.parse(d.length <= 10 ? `${d}T12:00:00` : d)
    if (Number.isFinite(ms)) {
      return Math.max(1, Math.floor(Math.max(0, Date.now() - ms) / 86_400_000) + 1)
    }
  }
  if (item.ageDays != null && Number.isFinite(item.ageDays)) {
    return Math.max(1, Math.round(item.ageDays))
  }
  const m = String(item.stageTag ?? '').match(/(\d+)/)
  if (m) return Math.max(1, parseInt(m[1]!, 10))
  return 1
}

function cosechaDayNumber(item: PlantCardItem): number {
  const iso = item.cosechaStartedAt?.trim()
  if (iso) {
    const ms = Date.parse(iso)
    if (Number.isFinite(ms)) {
      return Math.max(1, Math.floor(Math.max(0, Date.now() - ms) / 86_400_000) + 1)
    }
  }
  if (item.ageDays != null && Number.isFinite(item.ageDays)) {
    return Math.max(1, Math.round(item.ageDays))
  }
  const m = String(item.stageTag ?? '').match(/(\d+)/)
  if (m) return Math.max(1, parseInt(m[1]!, 10))
  return 1
}

function formatGenotypeLine(
  sat: number | undefined,
  ind: number | undefined,
  rud: number | undefined,
  t: (k: string) => string,
): string | null {
  const parts: { v: number; label: string }[] = []
  if (ind != null && ind > 0) parts.push({ v: ind, label: t('germinacionDetail.genIndica') })
  if (sat != null && sat > 0) parts.push({ v: sat, label: t('germinacionDetail.genSativa') })
  if (rud != null && rud > 0) parts.push({ v: rud, label: t('germinacionDetail.genRuderalis') })
  if (parts.length === 0) return null
  parts.sort((a, b) => b.v - a.v)
  return parts.map((p) => `${p.v}% ${p.label}`).join(' / ')
}

export function PropagacionBatchDetailSlideover({
  item,
  open,
  onClose,
  onBracelet,
  onMoveToFloracion,
  onHarvest,
  onEditRow,
  boardTab = 'propagacion',
}: {
  item: PlantCardItem
  open: boolean
  onClose: () => void
  /** Germinación: flujo de pulseras. */
  onBracelet?: () => void
  /** Vegetación: pasar a floración. */
  onMoveToFloracion?: () => void
  /** Floración: abrir cosecha. */
  onHarvest?: () => void
  /** Cerrar slideover y abrir edición de lote (p. ej. imagen / datos vía catálogo). */
  onEditRow?: () => void
  /** Tablero activo en Cultivo (persistencia del journal en la columna correcta). */
  boardTab?: CultivoKanbanTab
}) {
  const { t, locale } = useTranslation()
  const clubTimeZone = useSettingsStore((s) => s.timezone)
  const isVegFlorCosecha =
    boardTab === 'vegetacion' || boardTab === 'floracion' || boardTab === 'cosecha'
  const isFlorOrCosecha = boardTab === 'floracion' || boardTab === 'cosecha'
  const currentUserName = useCrmStore((s) => s.currentUserName)
  const setCultivoBoard = useCultivationStore((s) => s.setCultivoBoard)
  const cultivoBoard = useCultivationStore((s) => s.cultivoBoard)
  const geneticsBank = useCultivationStore((s) => (Array.isArray(s.geneticsBank) ? s.geneticsBank : []))
  const topoRooms = useLocationTopologyStore((s) => (Array.isArray(s.rooms) ? s.rooms : []))
  const topoFixtures = useLocationTopologyStore((s) => (Array.isArray(s.fixtures) ? s.fixtures : []))
  const topoLevels = useLocationTopologyStore((s) => (Array.isArray(s.levels) ? s.levels : []))
  const toolsItems = useToolsStore((s) => s.items)

  const bankRow = useMemo(
    () =>
      geneticsBank.find(
        (g) =>
          g.name.trim().toLowerCase() === String(item.strain ?? '').trim().toLowerCase(),
      ),
    [geneticsBank, item.strain],
  )

  const strainThumbUrl = useMemo(
    () => bankRow?.imageUrl?.trim() || item.imageUrl?.trim() || '',
    [bankRow?.imageUrl, item.imageUrl],
  )
  const [strainImgFailed, setStrainImgFailed] = useState(false)
  useEffect(() => setStrainImgFailed(false), [strainThumbUrl])

  const jsonStrainDescription = capitalizeFirstLetterEachLine(
    stripCatalogRatingFromSummary(
      (bankRow?.summary?.trim() || bankRow?.notes?.trim() || '') as string,
    ),
  )
  const displayStrainDescription =
    item.batchStrainDescription !== undefined ? item.batchStrainDescription.trim() : jsonStrainDescription

  const bankGenoFromRatio = useMemo(
    () => parseGeneticRatioPercents(bankRow?.geneticRatio),
    [bankRow?.geneticRatio],
  )
  const thcEff = item.batchThcPercent ?? bankRow?.thcPercent
  const cbdEff = item.batchCbdPercent ?? bankRow?.cbdPercent
  const satEff =
    item.batchSativaPercent ?? bankRow?.sativaPercent ?? bankGenoFromRatio.sativa
  const indEff =
    item.batchIndicaPercent ?? bankRow?.indicaPercent ?? bankGenoFromRatio.indica
  const rudEff =
    item.batchRuderalisPercent ?? bankRow?.ruderalisPercent ?? bankGenoFromRatio.ruderalis
  const genotypeLine = formatGenotypeLine(satEff, indEff, rudEff, t)

  const irrigationDisplay = useMemo(() => {
    const code = item.irrigationMethodCode
    if (!code) return null
    if (code === 'other') return item.irrigationMethodCustom?.trim() || t('germinacionDetail.irrigOther')
    return irrigT(code, t)
  }, [item.irrigationMethodCode, item.irrigationMethodCustom, t])

  type BlockEditor =
    | null
    | 'passport'
    | 'nutrition'
    | 'lighting'
    | 'substrate'
    | 'irrigation'
    | 'potVolume'
    | 'growMode'
    | 'vegTechnique'
  const [blockEditor, setBlockEditor] = useState<BlockEditor>(null)

  const substrateToolName = useMemo(
    () => (item.substrateToolId ? toolsItems.find((x) => x.id === item.substrateToolId)?.name : undefined),
    [item.substrateToolId, toolsItems],
  )
  const fertilizerToolName = useMemo(
    () => (item.fertilizerToolId ? toolsItems.find((x) => x.id === item.fertilizerToolId)?.name : undefined),
    [item.fertilizerToolId, toolsItems],
  )
  const lightingToolName = useMemo(
    () => (item.lightingToolId ? toolsItems.find((x) => x.id === item.lightingToolId)?.name : undefined),
    [item.lightingToolId, toolsItems],
  )
  const potToolName = useMemo(
    () => (item.potToolId ? toolsItems.find((x) => x.id === item.potToolId)?.name : undefined),
    [item.potToolId, toolsItems],
  )

  const lightingTypePart = useMemo(() => {
    if (item.lightingPresetCode === 'other') return item.lightingCustom?.trim() || null
    if (item.lightingPresetCode) return lightingCardLabel(item.lightingPresetCode, t)
    return item.lightingSpec?.trim() || null
  }, [item.lightingCustom, item.lightingPresetCode, item.lightingSpec, t])

  const substrateTypePart = useMemo(() => {
    if (item.substratePresetCode === 'other') return item.substrateType?.trim() || null
    if (item.substratePresetCode) return substrateCardLabel(item.substratePresetCode, t)
    return item.substrateType?.trim() || null
  }, [item.substratePresetCode, item.substrateType, t])

  const potVolumeReadable = useMemo(() => {
    if (item.potVolumePresetCode === '50_plus') return t('germinacionDetail.potPreset50Plus')
    if (item.potVolumePresetCode && item.potVolumePresetCode !== 'other') {
      return potCardLabel(item.potVolumePresetCode, t)
    }
    return formatPotDisplay(item.potSizeValue, item.potSizeUnit, locale)
  }, [
    item.potSizeUnit,
    item.potSizeValue,
    item.potVolumePresetCode,
    locale,
    t,
  ])

  const substrateDisplay = [substrateToolName, substrateTypePart].filter(Boolean).join(' · ') || ''
  const fertilizerDisplay = [fertilizerToolName, item.nutrientLine?.trim()].filter(Boolean).join(' · ') || ''
  const lightingPpfdPart =
    item.lightingPpfd != null && Number.isFinite(item.lightingPpfd)
      ? `${Math.round(item.lightingPpfd)} PPFD`
      : null
  const lightingDisplay =
    [lightingToolName, lightingTypePart, item.lightingSchedule?.trim(), lightingPpfdPart].filter(Boolean).join(' · ') ||
    ''
  const potLineDisplay =
    [potToolName, potVolumeReadable].filter(Boolean).join(' · ') || potVolumeReadable || ''

  const vegTechniqueDisplay = useMemo(() => {
    const c = item.vegCultivationTechniqueCode
    if (!c) return null
    if (c === 'other') {
      return item.vegCultivationTechniqueCustom?.trim() || t('vegetacionDetail.techniqueOther')
    }
    const keys: Record<VegCultivationTechniqueCode, string> = {
      tradicional: 'vegetacionDetail.techniqueTradicional',
      scrog: 'vegetacionDetail.techniqueScrog',
      sog: 'vegetacionDetail.techniqueSog',
      lst: 'vegetacionDetail.techniqueLst',
      mainlining: 'vegetacionDetail.techniqueMainlining',
      supercropping: 'vegetacionDetail.techniqueSupercropping',
      other: 'vegetacionDetail.techniqueOther',
    }
    return t(keys[c])
  }, [
    item.vegCultivationTechniqueCode,
    item.vegCultivationTechniqueCustom,
    t,
  ])

  const [quickNote, setQuickNote] = useState('')
  const [diarioModal, setDiarioModal] = useState<
    null | 'riego' | 'inspeccion' | 'clima' | 'mantenimiento' | 'altura'
  >(null)
  const [propCheckModal, setPropCheckModal] = useState<DiarioPropagacionChecklistCode | null>(null)
  const [descarteModalOpen, setDescarteModalOpen] = useState(false)
  const [bajaPlantaModalOpen, setBajaPlantaModalOpen] = useState(false)
  const [cuarentenaModalOpen, setCuarentenaModalOpen] = useState(false)
  const [actaOpen, setActaOpen] = useState(false)
  const [relocateModalOpen, setRelocateModalOpen] = useState(false)
  const [actaContext, setActaContext] = useState<{
    data: DiarioBajaPlantaData
    atIso: string
    braceletLines: string[]
  } | null>(null)

  const topologyLocLabels = useMemo(
    () => ({
      room: t('topologyUi.room'),
      fixture: t('topologyUi.fixture'),
      level: t('topologyUi.level'),
      pickRoom: t('topologyUi.pickRoom'),
      pickFixture: t('topologyUi.pickFixture'),
      pickLevel: t('topologyUi.pickLevel'),
      emptyRooms: t('topologyUi.emptyRooms'),
      summary: t('topologyUi.summary'),
    }),
    [t],
  )

  const peerPlants = useMemo(() => {
    if (!isVegFlorCosecha) return [] as PlantCardItem[]
    return resolveCultivoPeerGroup(item, cultivoBoard[boardTab])
  }, [boardTab, item, cultivoBoard, isVegFlorCosecha])

  const lateInv = useMemo(() => {
    if (!isVegFlorCosecha) return null
    let activos = 0
    let bajas = 0
    let cuarentena = 0
    for (const p of peerPlants) {
      const s = p.cultivoUnitStatus
      if (s === 'baja') bajas++
      else if (s === 'quarantine') cuarentena++
      else activos++
    }
    return { activos, bajas, cuarentena }
  }, [boardTab, peerPlants, isVegFlorCosecha])

  const diarioBatchIds = useMemo(() => {
    if (isVegFlorCosecha) {
      return peerPlants.map((p) => p.id)
    }
    return [item.id]
  }, [isVegFlorCosecha, item.id, peerPlants])

  const commitRelocate = useCallback(
    (payload: RelocatePlantsConfirmPayload) => {
      if (!isVegFlorCosecha) return
      const { plantIds, topology, locationLabel } = payload
      if (plantIds.length < 1) return
      const at = new Date().toISOString()
      const author = currentUserName.trim() ? currentUserName.trim() : undefined
      setCultivoBoard((prev) => {
        let next = prev
        for (const id of plantIds) {
          next = patchCultivoBoardItem(next, boardTab, id, {
            location: locationLabel,
            topologyRoomId: topology.roomId,
            topologyFixtureId: topology.fixtureId,
            topologyLevelId: topology.levelId,
          })
        }
        return appendDiarioToBoard(
          next,
          boardTab,
          diarioBatchIds,
          () => ({
            kind: 'diario_reubicacion',
            at,
            author,
            diarioReubicacion: {
              plantIds,
              movedCount: plantIds.length,
              locationLabel,
            },
          }),
          uid,
        )
      })
    },
    [boardTab, currentUserName, diarioBatchIds, isVegFlorCosecha, setCultivoBoard],
  )

  /** Solo propagador: partidas clon o semilla. */
  const propagacionDiarioChecklists =
    boardTab === 'propagacion' && (item.seedType === 'Clon' || item.seedType === 'Semilla')
      ? {
          onPick: (code: DiarioPropagacionChecklistCode) => setPropCheckModal(code),
          onDescarte:
            item.trackingType !== 'planta' && propagacionAliveCount(item) > 0
              ? () => setDescarteModalOpen(true)
              : undefined,
        }
      : null

  const dashInventory = useMemo(() => {
    if (boardTab !== 'propagacion') return null
    if (item.trackingType === 'planta') return null
    const planted = propagacionPlantedBaseline(item)
    if (planted <= 0) return null
    const discarded = sumDiarioDescarte(item.propagacionLog)
    const alive = propagacionAliveCount(item)
    const survivalPct = planted > 0 ? Math.round((alive / planted) * 1000) / 10 : 0
    return { planted, discarded, alive, survivalPct }
  }, [boardTab, item])

  const commitDiarioLog = useCallback(
    (entry: Omit<PropagacionLogEntry, 'id'>) => {
      setCultivoBoard((prev) => appendDiarioToBoard(prev, boardTab, diarioBatchIds, () => entry, uid))
    },
    [diarioBatchIds, setCultivoBoard, boardTab],
  )

  const commitDescarte = useCallback(
    (entry: Omit<PropagacionLogEntry, 'id'>) => {
      if (boardTab !== 'propagacion') return
      if (entry.kind !== 'diario_descarte' || !entry.diarioDescarte) return
      const count = Math.floor(entry.diarioDescarte.count)
      setCultivoBoard((prev) => ({
        ...prev,
        propagacion: prev.propagacion.map((p) => {
          if (p.id !== item.id) return p
          const planted = p.initialQuantity ?? p.quantity ?? 0
          const lostBefore = sumDiarioDescarte(p.propagacionLog)
          const aliveBefore = Math.max(0, planted - lostBefore)
          if (count < 1 || count > aliveBefore) return p
          const newEntry: PropagacionLogEntry = { ...entry, id: uid() }
          const nextLog = [...(p.propagacionLog ?? []), newEntry]
          const lostAfter = lostBefore + count
          const aliveAfter = Math.max(0, planted - lostAfter)
          return {
            ...p,
            initialQuantity: p.initialQuantity ?? planted,
            quantity: aliveAfter,
            propagacionLog: nextLog,
          }
        }),
      }))
    },
    [boardTab, item.id, setCultivoBoard],
  )

  const commitBajaPlanta = useCallback(
    (payload: {
      plantIds: string[]
      reasonCode: CultivoLateBajaReasonCode
      weightGrams?: number
      destructionMethodCode: CultivoDestruccionMethodCode
      destructionMethodNotes?: string
      notes?: string
    }) => {
      if (!isVegFlorCosecha) return
      const tab = boardTab
      const actaId = uid()
      const data: DiarioBajaPlantaData = {
        actaId,
        plantIds: payload.plantIds,
        reasonCode: payload.reasonCode,
        weightGrams: payload.weightGrams,
        destructionMethodCode: payload.destructionMethodCode,
        destructionMethodNotes: payload.destructionMethodNotes,
        notes: payload.notes,
      }
      const atIso = new Date().toISOString()
      const author = currentUserName.trim() || undefined
      const idToPeer = new Map(peerPlants.map((x) => [x.id, x]))
      const braceletLines = payload.plantIds.map((id) => {
        const p = idToPeer.get(id)
        return p ? braceletLineDetail(p, t) : id
      })
      setCultivoBoard((prev) => applyDiarioBajaPlantaToBoard(prev, tab, data, atIso, author, uid))
      setActaContext({ data, atIso, braceletLines })
      setActaOpen(true)
    },
    [boardTab, currentUserName, isVegFlorCosecha, peerPlants, setCultivoBoard, t],
  )

  const commitCuarentena = useCallback(
    (payload: {
      plantIds: string[]
      reason: string
      topology: TopologySelection
      locationLabel: string
    }) => {
      if (!isVegFlorCosecha) return
      const tab = boardTab
      const atIso = new Date().toISOString()
      const author = currentUserName.trim() || undefined
      const data = {
        plantIds: payload.plantIds,
        reason: payload.reason,
        topologyRoomId: payload.topology.roomId,
        topologyFixtureId: payload.topology.fixtureId,
        topologyLevelId: payload.topology.levelId,
        locationLabel: payload.locationLabel,
      }
      setCultivoBoard((prev) => applyDiarioCuarentenaToBoard(prev, tab, data, atIso, author, uid))
    },
    [boardTab, currentUserName, isVegFlorCosecha, setCultivoBoard],
  )

  const [draftBreeder, setDraftBreeder] = useState('')
  const [draftSeedCount, setDraftSeedCount] = useState('')
  const [draftGermStart, setDraftGermStart] = useState('')
  const [draftGermCode, setDraftGermCode] = useState<GerminationMethodCode | ''>('')
  const [draftGermCustom, setDraftGermCustom] = useState('')
  const [draftMotherId, setDraftMotherId] = useState('')
  const [draftGeneration, setDraftGeneration] = useState('')
  const [draftHormone, setDraftHormone] = useState('')
  const [draftNutrientLine, setDraftNutrientLine] = useState('')

  const [descEditing, setDescEditing] = useState(false)
  const [descDraft, setDescDraft] = useState('')

  const [profilePopover, setProfilePopover] = useState<null | 'thc' | 'cbd' | 'geno'>(null)
  const [popThc, setPopThc] = useState('')
  const [popCbd, setPopCbd] = useState('')
  const [popSat, setPopSat] = useState('')
  const [popInd, setPopInd] = useState('')
  const [popRud, setPopRud] = useState('')

  const [draftFertilizerToolId, setDraftFertilizerToolId] = useState<string | null>(null)

  const passportGeneticRef = useRef<HTMLDivElement>(null)

  const applyPatch = useCallback(
    (patch: Partial<PlantCardItem>, log?: PropagacionLogEntry) => {
      setCultivoBoard((prev) => patchCultivoBoardItem(prev, boardTab, item.id, patch, log))
    },
    [boardTab, item.id, setCultivoBoard],
  )

  const saveQuickNote = useCallback(() => {
    const text = quickNote.trim()
    if (!text) return
    if (isVegFlorCosecha) {
      commitDiarioLog({
        kind: 'note',
        at: new Date().toISOString(),
        text,
        author: t('germinacionDetail.noteAuthorSelf'),
      })
      setQuickNote('')
      return
    }
    applyPatch(
      {},
      {
        id: uid(),
        at: new Date().toISOString(),
        kind: 'note',
        text,
        author: t('germinacionDetail.noteAuthorSelf'),
      },
    )
    setQuickNote('')
  }, [applyPatch, boardTab, commitDiarioLog, isVegFlorCosecha, quickNote, t])

  useEffect(() => {
    if (!open) {
      setDescEditing(false)
      setProfilePopover(null)
      setBlockEditor(null)
      setDiarioModal(null)
      setPropCheckModal(null)
      setDescarteModalOpen(false)
      setBajaPlantaModalOpen(false)
      setCuarentenaModalOpen(false)
      setActaOpen(false)
      setActaContext(null)
    }
  }, [open])

  const startDescEdit = useCallback(
    (emptyOnly: boolean) => {
      if (emptyOnly) setDescDraft('')
      else {
        const base =
          item.batchStrainDescription !== undefined
            ? item.batchStrainDescription
            : jsonStrainDescription
        setDescDraft(base)
      }
      setDescEditing(true)
    },
    [item.batchStrainDescription, jsonStrainDescription],
  )

  useEffect(() => {
    if (!profilePopover) return
    const el = (e: MouseEvent) => {
      if (passportGeneticRef.current && !passportGeneticRef.current.contains(e.target as Node)) {
        setProfilePopover(null)
      }
    }
    document.addEventListener('mousedown', el)
    return () => document.removeEventListener('mousedown', el)
  }, [profilePopover])

  const commitDescription = useCallback(() => {
    applyPatch({ batchStrainDescription: descDraft.trim() })
    setDescEditing(false)
  }, [applyPatch, descDraft])

  useEffect(() => {
    if (!blockEditor) return
    if (blockEditor === 'passport') {
      setDraftBreeder(item.breeder?.trim() ?? '')
      setDraftSeedCount(
        item.seedCount != null ? String(item.seedCount) : item.quantity != null ? String(item.quantity) : '',
      )
      setDraftGermStart(item.germinationStartDate ?? item.date ?? '')
      if (item.germinationMethodCode) {
        setDraftGermCode(item.germinationMethodCode)
        setDraftGermCustom(item.germinationMethodCode === 'other' ? (item.germinationMethod?.trim() ?? '') : '')
      } else if (item.germinationMethod?.trim()) {
        setDraftGermCode('other')
        setDraftGermCustom(item.germinationMethod.trim())
      } else {
        setDraftGermCode('')
        setDraftGermCustom('')
      }
      setDraftMotherId(item.motherPlantId?.trim() ?? '')
      setDraftGeneration(item.cloneGeneration?.trim() ?? '')
      setDraftHormone(item.rootingHormone?.trim() ?? '')
    }
    if (blockEditor === 'nutrition') {
      setDraftNutrientLine(item.nutrientLine?.trim() ?? '')
      setDraftFertilizerToolId(item.fertilizerToolId ?? null)
    }
  }, [blockEditor, item])

  const openPassport = useCallback(() => setBlockEditor('passport'), [])
  const openLightingField = useCallback(() => setBlockEditor('lighting'), [])
  const openSubstrateField = useCallback(() => setBlockEditor('substrate'), [])
  const openNutrition = useCallback(() => setBlockEditor('nutrition'), [])
  const openIrrigationOnly = useCallback(() => setBlockEditor('irrigation'), [])
  const openPotVolumeField = useCallback(() => setBlockEditor('potVolume'), [])
  const openGrowModeField = useCallback(() => setBlockEditor('growMode'), [])
  const openVegTechniqueField = useCallback(() => setBlockEditor('vegTechnique'), [])

  const closeBlockEditor = useCallback(() => setBlockEditor(null), [])

  const savePassportBlock = useCallback(() => {
    const seedN = draftSeedCount.trim() ? Math.max(0, Math.floor(Number(draftSeedCount) || 0)) : undefined
    applyPatch({
      breeder: draftBreeder.trim() || undefined,
      seedCount: seedN,
      germinationStartDate: draftGermStart.trim() || undefined,
      germinationMethodCode: draftGermCode || undefined,
      germinationMethod: draftGermCode === 'other' ? draftGermCustom.trim() || undefined : undefined,
      motherPlantId: draftMotherId.trim() || undefined,
      cloneGeneration: draftGeneration.trim() || undefined,
      rootingHormone: draftHormone.trim() || undefined,
    })
    closeBlockEditor()
  }, [
    applyPatch,
    draftBreeder,
    draftSeedCount,
    draftGermStart,
    draftGermCode,
    draftGermCustom,
    draftMotherId,
    draftGeneration,
    draftHormone,
    closeBlockEditor,
  ])

  const saveNutritionBlock = useCallback(() => {
    applyPatch({
      nutrientLine: draftNutrientLine.trim() || undefined,
      fertilizerToolId: draftFertilizerToolId ?? undefined,
    })
    closeBlockEditor()
  }, [applyPatch, draftNutrientLine, draftFertilizerToolId, closeBlockEditor])

  const isClone = item.seedType === 'Clon'
  const isInaseCertifiedSeed =
    item.seedType === 'Semilla' && item.seedComplianceType === 'certificada'
  const age =
    item.ageDays != null && Number.isFinite(item.ageDays)
      ? Math.max(1, Math.round(item.ageDays))
      : dayOfCycleFromStartIso(item.propagacionStartedAt ?? item.date)

  const passportQtyDisplay = useMemo(() => {
    if (isVegFlorCosecha) {
      const peerLen = peerPlants.length
      const loteQty =
        item.trackingType !== 'planta' &&
        item.quantity != null &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0
          ? Math.floor(item.quantity)
          : 0
      return Math.max(1, peerLen, loteQty)
    }
    if (item.trackingType === 'planta') return item.quantity ?? 1
    return propagacionAliveCount(item)
  }, [boardTab, isVegFlorCosecha, peerPlants, item.trackingType, item.quantity])

  const locationLineForPassport = useMemo(() => {
    if (item.topologyRoomId?.trim()) {
      const label = formatTopologyLabel(
        {
          roomId: item.topologyRoomId,
          fixtureId: item.topologyFixtureId,
          levelId: item.topologyLevelId,
        },
        topoRooms,
        topoFixtures,
        topoLevels,
      ).trim()
      if (label) return label
    }
    return item.location?.trim() || ''
  }, [
    item.topologyRoomId,
    item.topologyFixtureId,
    item.topologyLevelId,
    item.location,
    topoRooms,
    topoFixtures,
    topoLevels,
  ])

  const growMode = item.growMode === 'outdoor' ? 'OUTDOOR' : 'INDOOR'
  const growModeClass =
    item.growMode === 'outdoor'
      ? 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/45 dark:text-amber-200 dark:ring-amber-700/40'
      : 'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-950/45 dark:text-blue-200 dark:ring-blue-700/40'
  const typeAccentClass = isClone
    ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-200 dark:ring-emerald-700/40'
    : 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/45 dark:text-amber-200 dark:ring-amber-700/40'

  const hasPh = item.nutrientPh != null && Number.isFinite(item.nutrientPh)
  const hasEc = item.nutrientEc != null && Number.isFinite(item.nutrientEc)

  const germSelectOptions = useMemo(
    () => [
      { value: '' as const, label: '—' },
      ...GERMINATION_CODES.map((c) => ({ value: c, label: germT(c, t) })),
    ],
    [t],
  )

  const germinationRowLabel = useMemo(() => {
    if (item.germinationMethodCode === 'other') return item.germinationMethod?.trim() || ''
    if (item.germinationMethodCode) return germT(item.germinationMethodCode, t)
    return item.germinationMethod?.trim() || ''
  }, [item.germinationMethod, item.germinationMethodCode, t])

  const timelineEntries = useMemo(() => {
    const list = [...(item.propagacionLog ?? [])]
    return list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [item.propagacionLog])

  const renderLogBody = (e: PropagacionLogEntry) => {
    if (e.kind === 'system' && e.systemKey === 'lote_split' && e.splitLote) {
      const s = e.splitLote
      return (
        <span className="text-gray-800 dark:text-[#e5e5e5]">
          {t('diario.summaryLoteSplit', {
            n: String(s.movedCount),
            loc: s.locationLabel,
            newId: s.newBatchId,
            fromId: s.fromBatchId,
          })}
        </span>
      )
    }
    if (e.kind === 'system' && e.systemKey) {
      const systemCopy: Record<NonNullable<PropagacionLogEntry['systemKey']>, string> = {
        batch_created: t('germinacionDetail.logBatchCreated'),
        moved_to_vegetacion: t('germinacionDetail.logMovedToVegetacion'),
        moved_to_floracion: t('germinacionDetail.logMovedToFloracion'),
        moved_to_cosecha: t('germinacionDetail.logMovedToCosecha'),
        lote_split: t('germinacionDetail.logLoteSplitFallback'),
      }
      return (
        <span className="text-gray-800 dark:text-[#e5e5e5]">{systemCopy[e.systemKey] ?? t('germinacionDetail.logBatchCreated')}</span>
      )
    }
    if (e.kind === 'note' && e.text) {
      return (
        <span className="text-gray-800 dark:text-[#e5e5e5]">
          <span className="font-medium text-gray-900 dark:text-[#f1f1f1]">{t('germinacionDetail.logNoteLabel')}:</span>{' '}
          &quot;{e.text}&quot;
          {e.author ? (
            <span className="text-gray-500 dark:text-[#a3a3a3]"> {t('germinacionDetail.logNoteMeta', { author: e.author })}</span>
          ) : null}
        </span>
      )
    }
    if (e.kind === 'measurement') {
      const phPrev = e.phPrev != null ? String(e.phPrev.toFixed(1)) : '—'
      const ph = e.ph != null ? String(e.ph.toFixed(1)) : '—'
      const ecPrev = e.ecPrev != null ? String(e.ecPrev.toFixed(2)) : '—'
      const ec = e.ec != null ? String(e.ec.toFixed(2)) : '—'
      const tempPart =
        e.tempC != null ? t('germinacionDetail.logTempPart', { temp: String(e.tempC) }) : ''
      return (
        <span className="text-gray-800 dark:text-[#e5e5e5]">
          {t('germinacionDetail.logMeasurement', { phPrev, ph, ecPrev, ec, tempPart })}
        </span>
      )
    }
    if (e.kind === 'diario_riego_nutricion' && e.diarioRiegoNutricion) {
      return <span className="text-gray-800 dark:text-[#e5e5e5]">{formatDiarioLogSummaryLine(e, t)}</span>
    }
    if (e.kind === 'diario_clima' && e.diarioClima) {
      return <span className="text-gray-800 dark:text-[#e5e5e5]">{formatDiarioLogSummaryLine(e, t)}</span>
    }
    if (e.kind === 'diario_mantenimiento' && e.diarioMantenimiento) {
      return <span className="text-gray-800 dark:text-[#e5e5e5]">{formatDiarioLogSummaryLine(e, t)}</span>
    }
    if (e.kind === 'diario_altura_canopy' && e.diarioAlturaCanopy) {
      return <span className="text-gray-800 dark:text-[#e5e5e5]">{formatDiarioLogSummaryLine(e, t)}</span>
    }
    if (e.kind === 'diario_propagacion_checklist' && e.diarioPropagacionChecklist) {
      return <span className="text-gray-800 dark:text-[#e5e5e5]">{formatDiarioLogSummaryLine(e, t)}</span>
    }
    if (e.kind === 'diario_descarte' && e.diarioDescarte) {
      return <span className="font-medium text-red-800/90">{formatDiarioLogSummaryLine(e, t)}</span>
    }
    if (e.kind === 'diario_baja_planta' && e.diarioBajaPlanta) {
      return <span className="font-medium text-red-900/90">{formatDiarioLogSummaryLine(e, t)}</span>
    }
    if (e.kind === 'diario_cuarentena' && e.diarioCuarentena) {
      return <span className="font-medium text-amber-900/90">{formatDiarioLogSummaryLine(e, t)}</span>
    }
    if (e.kind === 'diario_reubicacion' && e.diarioReubicacion) {
      return <span className="font-medium text-sky-900/90">{formatDiarioLogSummaryLine(e, t)}</span>
    }
    if (e.kind === 'diario_inspeccion' && e.diarioInspeccion) {
      const summary = formatDiarioLogSummaryLine(e, t)
      const photo = e.diarioInspeccion.photoDataUrl
      return (
        <span className="inline-flex flex-wrap items-center gap-2 text-gray-800 dark:text-[#e5e5e5]">
          <span>{summary}</span>
          {photo ? (
            <img
              src={photo}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 object-cover dark:border-[#3d3d3d]"
              title={t('diario.photoAttached')}
            />
          ) : null}
        </span>
      )
    }
    return <span className="text-gray-600 dark:text-[#a3a3a3]">—</span>
  }

  const logIcon = (e: PropagacionLogEntry) => {
    if (e.kind === 'system') {
      if (e.systemKey === 'lote_split') {
        return (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            <GitBranch className="h-4 w-4" strokeWidth={2} />
          </span>
        )
      }
      const isBatchCreated = e.systemKey === 'batch_created'
      const Icon = isBatchCreated ? Rocket : ArrowRightCircle
      const tone = isBatchCreated
        ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200'
        : 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-200'
      return (
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      )
    }
    if (e.kind === 'measurement') {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200">
          <Droplets className="h-4 w-4" />
        </span>
      )
    }
    if (e.kind === 'diario_riego_nutricion') {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          <FlaskConical className="h-4 w-4" />
        </span>
      )
    }
    if (e.kind === 'diario_inspeccion') {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <Search className="h-4 w-4" />
        </span>
      )
    }
    if (e.kind === 'diario_clima') {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-[#2a2a2a] dark:text-slate-200">
          <Thermometer className="h-4 w-4" />
        </span>
      )
    }
    if (e.kind === 'diario_mantenimiento') {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
          <Scissors className="h-4 w-4" />
        </span>
      )
    }
    if (e.kind === 'diario_altura_canopy') {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
          <Ruler className="h-4 w-4" />
        </span>
      )
    }
    if (e.kind === 'diario_propagacion_checklist') {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime-100 text-lime-800 dark:bg-lime-950/40 dark:text-lime-200">
          <ClipboardList className="h-4 w-4" />
        </span>
      )
    }
    if (e.kind === 'diario_descarte') {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/45 dark:text-red-200">
          <Trash2 className="h-4 w-4" />
        </span>
      )
    }
    if (e.kind === 'diario_baja_planta') {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-200 text-red-900 dark:bg-red-950/55 dark:text-red-200">
          <Skull className="h-4 w-4" />
        </span>
      )
    }
    if (e.kind === 'diario_cuarentena') {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <ShieldAlert className="h-4 w-4" />
        </span>
      )
    }
    if (e.kind === 'diario_reubicacion') {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
          <MapPin className="h-4 w-4" />
        </span>
      )
    }
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <FileText className="h-4 w-4" />
      </span>
    )
  }

  const clampPct = (raw: number) => Math.max(0, Math.min(100, Math.round(raw * 10) / 10))

  const formatChemPct = (n: number) => (Math.abs(n - Math.round(n)) < 1e-6 ? String(Math.round(n)) : n.toFixed(1))

  const geneticProfileSection = (
    <div ref={passportGeneticRef} className="space-y-3 pb-4">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8c8c8c]">
        {t('germinacionDetail.geneticProfile')}
      </h4>
      <dl className="space-y-3 text-sm">
        <div className="relative">
          <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.thcShort')}</dt>
          <dd className="mt-1">
            {thcEff != null && Number.isFinite(thcEff) ? (
              <button
                type="button"
                className="font-semibold text-gray-900 underline decoration-dashed decoration-gray-400 underline-offset-4 hover:decoration-gray-600 dark:text-[#f1f1f1] dark:decoration-gray-500 dark:hover:decoration-gray-400"
                onClick={() => {
                  setPopThc(String(thcEff))
                  setProfilePopover('thc')
                }}
              >
                {formatChemPct(thcEff)}%
              </button>
            ) : (
              <EmptyActionLink
                onClick={() => {
                  setPopThc('')
                  setProfilePopover('thc')
                }}
              >
                {t('germinacionDetail.addThcPlus')}
              </EmptyActionLink>
            )}
            {profilePopover === 'thc' ? (
              <div className="absolute left-0 top-full z-40 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-black/40">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-medium text-gray-600 dark:text-[#a3a3a3]">{t('germinacionDetail.profilePopoverTitle')}</p>
                  <button
                    type="button"
                    className="shrink-0 rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-[#a3a3a3] dark:hover:bg-[#2e2e2e]"
                    aria-label={t('common.close')}
                    onClick={() => setProfilePopover(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                  value={popThc}
                  onChange={(e) => setPopThc(e.target.value)}
                  placeholder="0–100"
                  inputMode="decimal"
                />
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg bg-sky-600 py-1.5 text-xs font-semibold text-white"
                  onClick={() => {
                    const raw = popThc.trim() === '' ? NaN : Number(popThc.replace(',', '.'))
                    applyPatch({
                      batchThcPercent: Number.isFinite(raw) ? clampPct(raw) : undefined,
                    })
                    setProfilePopover(null)
                  }}
                >
                  {t('germinacionDetail.profileApply')}
                </button>
              </div>
            ) : null}
          </dd>
        </div>
        <div className="relative">
          <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.cbdShort')}</dt>
          <dd className="mt-1">
            {cbdEff != null && Number.isFinite(cbdEff) ? (
              <button
                type="button"
                className="font-semibold text-gray-900 underline decoration-dashed decoration-gray-400 underline-offset-4 hover:decoration-gray-600 dark:text-[#f1f1f1] dark:decoration-gray-500 dark:hover:decoration-gray-400"
                onClick={() => {
                  setPopCbd(String(cbdEff))
                  setProfilePopover('cbd')
                }}
              >
                {formatChemPct(cbdEff)}%
              </button>
            ) : (
              <EmptyActionLink
                onClick={() => {
                  setPopCbd('')
                  setProfilePopover('cbd')
                }}
              >
                {t('germinacionDetail.addCbdPlus')}
              </EmptyActionLink>
            )}
            {profilePopover === 'cbd' ? (
              <div className="absolute left-0 top-full z-40 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-black/40">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-medium text-gray-600 dark:text-[#a3a3a3]">{t('germinacionDetail.profilePopoverTitle')}</p>
                  <button
                    type="button"
                    className="shrink-0 rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-[#a3a3a3] dark:hover:bg-[#2e2e2e]"
                    aria-label={t('common.close')}
                    onClick={() => setProfilePopover(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                  value={popCbd}
                  onChange={(e) => setPopCbd(e.target.value)}
                  placeholder="0–100"
                  inputMode="decimal"
                />
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg bg-sky-600 py-1.5 text-xs font-semibold text-white"
                  onClick={() => {
                    const raw = popCbd.trim() === '' ? NaN : Number(popCbd.replace(',', '.'))
                    applyPatch({
                      batchCbdPercent: Number.isFinite(raw) ? clampPct(raw) : undefined,
                    })
                    setProfilePopover(null)
                  }}
                >
                  {t('germinacionDetail.profileApply')}
                </button>
              </div>
            ) : null}
          </dd>
        </div>
        <div className="relative">
          <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.genotypeShort')}</dt>
                            <dd className="mt-1 text-gray-700 dark:text-[#d4d4d4]">
            {genotypeLine ? (
              <button
                type="button"
                className="text-left text-sm font-medium text-gray-900 underline decoration-dashed decoration-gray-400 underline-offset-4 hover:decoration-gray-600 dark:text-[#f1f1f1] dark:decoration-gray-500 dark:hover:decoration-gray-400"
                onClick={() => {
                  setPopSat(satEff != null ? String(satEff) : '')
                  setPopInd(indEff != null ? String(indEff) : '')
                  setPopRud(rudEff != null ? String(rudEff) : '')
                  setProfilePopover('geno')
                }}
              >
                {genotypeLine}
              </button>
            ) : (
              <EmptyActionLink
                onClick={() => {
                  setPopSat(satEff != null ? String(satEff) : '')
                  setPopInd(indEff != null ? String(indEff) : '')
                  setPopRud(rudEff != null ? String(rudEff) : '')
                  setProfilePopover('geno')
                }}
              >
                {t('germinacionDetail.addGenotypePlus')}
              </EmptyActionLink>
            )}
            {profilePopover === 'geno' ? (
              <div className="absolute left-0 top-full z-40 mt-2 w-64 max-w-[90vw] rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-black/40">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] text-gray-600 dark:text-[#a3a3a3]">{t('germinacionDetail.profileGenotypeHint')}</p>
                  <button
                    type="button"
                    className="shrink-0 rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-[#a3a3a3] dark:hover:bg-[#2e2e2e]"
                    aria-label={t('common.close')}
                    onClick={() => setProfilePopover(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-[#8c8c8c]">
                    {t('germinacionDetail.genSativa')}
                    <input
                      className="mt-0.5 w-full rounded border border-gray-200 bg-white px-1 py-1 text-xs text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                      value={popSat}
                      onChange={(e) => setPopSat(e.target.value)}
                      inputMode="decimal"
                    />
                  </label>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-[#8c8c8c]">
                    {t('germinacionDetail.genIndica')}
                    <input
                      className="mt-0.5 w-full rounded border border-gray-200 bg-white px-1 py-1 text-xs text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                      value={popInd}
                      onChange={(e) => setPopInd(e.target.value)}
                      inputMode="decimal"
                    />
                  </label>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-[#8c8c8c]">
                    {t('germinacionDetail.genRuderalis')}
                    <input
                      className="mt-0.5 w-full rounded border border-gray-200 bg-white px-1 py-1 text-xs text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                      value={popRud}
                      onChange={(e) => setPopRud(e.target.value)}
                      inputMode="decimal"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg bg-sky-600 py-1.5 text-xs font-semibold text-white"
                  onClick={() => {
                    const ps = popSat.trim() === '' ? NaN : Number(popSat.replace(',', '.'))
                    const pi = popInd.trim() === '' ? NaN : Number(popInd.replace(',', '.'))
                    const pr = popRud.trim() === '' ? NaN : Number(popRud.replace(',', '.'))
                    applyPatch({
                      batchSativaPercent: Number.isFinite(ps) ? clampPct(ps) : undefined,
                      batchIndicaPercent: Number.isFinite(pi) ? clampPct(pi) : undefined,
                      batchRuderalisPercent: Number.isFinite(pr) ? clampPct(pr) : undefined,
                    })
                    setProfilePopover(null)
                  }}
                >
                  {t('germinacionDetail.profileApply')}
                </button>
              </div>
            ) : null}
          </dd>
        </div>
      </dl>
    </div>
  )

  const modals =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            {blockEditor === 'passport' ? (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 dark:bg-black/60">
                <div
                  className="absolute inset-0"
                  role="presentation"
                  onClick={() => closeBlockEditor()}
                />
                <div className="relative max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-black/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-lg font-semibold text-gray-900 dark:text-[#f1f1f1]">{t('germinacionDetail.modalPassportTitle')}</p>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-[#a3a3a3] dark:hover:bg-[#2e2e2e]"
                      onClick={() => closeBlockEditor()}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {isClone ? (
                      <>
                        <label className="block text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">
                          {t('germinacionDetail.fieldMotherId')}
                        </label>
                        <input
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                          value={draftMotherId}
                          onChange={(e) => setDraftMotherId(e.target.value)}
                        />
                        <label className="block text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">
                          {t('germinacionDetail.fieldGeneration')}
                        </label>
                        <input
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                          value={draftGeneration}
                          onChange={(e) => setDraftGeneration(e.target.value)}
                          placeholder="F1"
                        />
                        <label className="block text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">
                          {t('germinacionDetail.fieldRootingHormone')}
                        </label>
                        <input
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                          value={draftHormone}
                          onChange={(e) => setDraftHormone(e.target.value)}
                        />
                      </>
                    ) : (
                      <>
                        <label className="block text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">
                          {t('germinacionDetail.fieldBreeder')}
                        </label>
                        <input
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                          value={draftBreeder}
                          onChange={(e) => setDraftBreeder(e.target.value)}
                        />
                        <label className="block text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">
                          {t('germinacionDetail.fieldSeedCount')}
                        </label>
                        <input
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                          value={draftSeedCount}
                          onChange={(e) => setDraftSeedCount(e.target.value)}
                          inputMode="numeric"
                        />
                        <label className="block text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">
                          {t('germinacionDetail.fieldGermStart')}
                        </label>
                        <input
                          type="date"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-0 dark:[&::-webkit-calendar-picker-indicator]:invert"
                          value={draftGermStart.slice(0, 10)}
                          onChange={(e) => setDraftGermStart(e.target.value)}
                        />
                        <label className="block text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">
                          {t('germinacionDetail.fieldGermMethod')}
                        </label>
                        <SoftSelect
                          value={draftGermCode}
                          onChange={(v) => {
                            const nv = v as GerminationMethodCode | ''
                            setDraftGermCode(nv)
                            if (nv !== 'other') setDraftGermCustom('')
                          }}
                          options={germSelectOptions}
                          chipText={
                            germSelectOptions.find((o) => o.value === draftGermCode)?.label ?? '—'
                          }
                          ariaLabel={t('germinacionDetail.fieldGermMethod')}
                          variant="field"
                        />
                        <motion.div
                          initial={false}
                          animate={{ height: draftGermCode === 'other' ? 'auto' : 0, opacity: draftGermCode === 'other' ? 1 : 0 }}
                          className="overflow-hidden"
                        >
                          <label className="mt-2 block text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">
                            {t('germinacionDetail.otherCustomPlaceholder')}
                          </label>
                          <input
                            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                            value={draftGermCustom}
                            onChange={(e) => setDraftGermCustom(e.target.value)}
                            placeholder={t('germinacionDetail.otherCustomPlaceholder')}
                          />
                        </motion.div>
                      </>
                    )}
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#e8e8e8]"
                      onClick={() => closeBlockEditor()}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-green-800"
                      onClick={savePassportBlock}
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <LightingFieldModal
              open={blockEditor === 'lighting'}
              item={item}
              onClose={closeBlockEditor}
              onSave={applyPatch}
              t={t}
              propagadorMode
            />
            <SubstrateFieldModal
              open={blockEditor === 'substrate'}
              item={item}
              onClose={closeBlockEditor}
              onSave={applyPatch}
              t={t}
            />
            <PotVolumeFieldModal
              open={blockEditor === 'potVolume'}
              item={item}
              onClose={closeBlockEditor}
              onSave={applyPatch}
              t={t}
            />
            <GrowModeFieldModal
              open={blockEditor === 'growMode'}
              item={item}
              onClose={closeBlockEditor}
              onSave={applyPatch}
              t={t}
            />
            <IrrigationFieldModal
              open={blockEditor === 'irrigation'}
              item={item}
              onClose={closeBlockEditor}
              onSave={applyPatch}
              t={t}
            />
            <VegTechniqueFieldModal
              open={blockEditor === 'vegTechnique'}
              item={item}
              onClose={closeBlockEditor}
              onSave={applyPatch}
              t={t}
            />

            {blockEditor === 'nutrition' ? (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 dark:bg-black/60">
                <div className="absolute inset-0" role="presentation" onClick={() => closeBlockEditor()} />
                <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-black/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-lg font-semibold text-gray-900 dark:text-[#f1f1f1]">{t('germinacionDetail.modalNutritionTitle')}</p>
                    <button type="button" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-[#a3a3a3] dark:hover:bg-[#2e2e2e]" onClick={() => closeBlockEditor()}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    <label className="block text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">{t('germinacionDetail.fieldNutrientLine')}</label>
                    <ToolsInventorySearchSelect
                      category="fertilizer"
                      valueId={draftFertilizerToolId}
                      onChangeId={(id) => setDraftFertilizerToolId(id)}
                      placeholderPick={t('tools.pickFromInventory')}
                      ariaLabel={t('tools.catFertilizer')}
                    />
                    <input
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                      value={draftNutrientLine}
                      onChange={(e) => setDraftNutrientLine(e.target.value)}
                      placeholder={t('tools.manualFertilizer')}
                    />
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button type="button" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#e8e8e8]" onClick={() => closeBlockEditor()}>
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-green-800"
                      onClick={saveNutritionBlock}
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <DiarioRiegoNutricionModal
              open={diarioModal === 'riego'}
              onClose={() => setDiarioModal(null)}
              onCommit={commitDiarioLog}
              batchIds={diarioBatchIds}
              author={currentUserName.trim() ? currentUserName : undefined}
              t={t}
              floracionMode={isFlorOrCosecha}
            />
            <DiarioInspeccionModal
              open={diarioModal === 'inspeccion'}
              onClose={() => setDiarioModal(null)}
              onCommit={commitDiarioLog}
              batchIds={diarioBatchIds}
              author={currentUserName.trim() ? currentUserName : undefined}
              t={t}
              floracionMode={isFlorOrCosecha}
            />
            <DiarioClimaModal
              open={diarioModal === 'clima'}
              onClose={() => setDiarioModal(null)}
              onCommit={commitDiarioLog}
              batchIds={diarioBatchIds}
              author={currentUserName.trim() ? currentUserName : undefined}
              t={t}
            />
            <DiarioMantenimientoModal
              open={diarioModal === 'mantenimiento'}
              onClose={() => setDiarioModal(null)}
              onCommit={commitDiarioLog}
              batchIds={diarioBatchIds}
              author={currentUserName.trim() ? currentUserName : undefined}
              t={t}
              vegetacionMode={boardTab === 'vegetacion'}
              floracionMode={isFlorOrCosecha}
            />
            <DiarioAlturaCanopyModal
              open={diarioModal === 'altura'}
              onClose={() => setDiarioModal(null)}
              onCommit={commitDiarioLog}
              batchIds={diarioBatchIds}
              author={currentUserName.trim() ? currentUserName : undefined}
              t={t}
            />
            <DiarioPropagacionChecklistModal
              open={propCheckModal != null}
              code={propCheckModal}
              onClose={() => setPropCheckModal(null)}
              onCommit={commitDiarioLog}
              batchIds={diarioBatchIds}
              author={currentUserName.trim() ? currentUserName : undefined}
              t={t}
            />
            <DiarioDescarteModal
              open={descarteModalOpen}
              onClose={() => setDescarteModalOpen(false)}
              onCommit={commitDescarte}
              maxRemovable={propagacionAliveCount(item)}
              plantedBaseline={propagacionPlantedBaseline(item)}
              batchIds={diarioBatchIds}
              author={currentUserName.trim() ? currentUserName : undefined}
              t={t}
            />
            <DiarioRegistrarBajaModal
              open={bajaPlantaModalOpen}
              onClose={() => setBajaPlantaModalOpen(false)}
              floracionMode={isFlorOrCosecha}
              peerPlants={peerPlants}
              onConfirm={commitBajaPlanta}
              t={t}
            />
            <DiarioCuarentenaModal
              open={cuarentenaModalOpen}
              onClose={() => setCuarentenaModalOpen(false)}
              companyId={DEFAULT_TOPOLOGY_COMPANY_ID}
              locLabels={topologyLocLabels}
              peerPlants={peerPlants}
              onConfirm={commitCuarentena}
              t={t}
            />
            <RelocatePlantsModal
              open={relocateModalOpen}
              peerGroup={peerPlants}
              companyId={DEFAULT_TOPOLOGY_COMPANY_ID}
              onClose={() => setRelocateModalOpen(false)}
              onConfirm={(p) => {
                commitRelocate(p)
                setRelocateModalOpen(false)
              }}
            />
            {actaContext ? (
              <ActaDestruccionModal
                open={actaOpen}
                onClose={() => {
                  setActaOpen(false)
                  setActaContext(null)
                }}
                strain={item.strain}
                data={actaContext.data}
                braceletLines={actaContext.braceletLines}
                atIso={actaContext.atIso}
                author={currentUserName.trim() || undefined}
                t={t}
              />
            ) : null}
          </>,
          document.body,
        )
      : null

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label={t('common.close')}
            className="fixed inset-0 z-[60] bg-black/25 backdrop-blur-[2px] dark:bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-3xl flex-col border-l border-gray-200/80 bg-white shadow-[-12px_0_48px_rgba(0,0,0,0.08)] md:max-w-[min(920px,96vw)] dark:border-[#3d3d3d] dark:bg-[#1a1a1a] dark:shadow-[-12px_0_60px_rgba(0,0,0,0.55)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="flex max-h-full min-h-0 flex-1 flex-col overflow-y-auto">
              <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-6 py-5 backdrop-blur-md dark:border-[#2e2e2e] dark:bg-[#1a1a1a]/95">
                <div className="relative shrink-0">
                  {strainThumbUrl && !strainImgFailed ? (
                    <img
                      src={strainThumbUrl}
                      alt=""
                      className="h-[72px] w-[72px] rounded-2xl object-cover object-left object-top shadow-sm ring-1 ring-gray-100 md:h-20 md:w-20 dark:ring-[#3d3d3d]"
                      onError={() => setStrainImgFailed(true)}
                    />
                  ) : (
                    <div
                      className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-slate-100/90 ring-1 ring-inset ring-slate-200/80 md:h-20 md:w-20 dark:bg-[#181818] dark:ring-0"
                      aria-hidden
                    >
                      <CanspaceMarkThumb emptyThumb className="h-11 w-11 md:h-12 md:w-12" />
                    </div>
                  )}
                  {onEditRow ? (
                    <button
                      type="button"
                      onClick={onEditRow}
                      title={t('common.edit')}
                      aria-label={t('common.edit')}
                      className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition hover:bg-gray-50 hover:text-gray-900 dark:border-[#3d3d3d] dark:bg-[#252525] dark:text-[#c4c4c4] dark:hover:bg-[#2e2e2e] dark:hover:text-[#f1f1f1]"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 pr-2">
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl dark:text-[#f1f1f1]">
                    {item.strain}
                  </h2>
                  {item.trackingType === 'lote' ? (
                    <p className="mt-1 text-sm font-semibold tracking-wide text-gray-600 dark:text-[#a3a3a3]">
                      {item.inaseLegalLotLabel?.trim() || t('propagadorUi.loteId', { id: item.id })}
                    </p>
                  ) : item.inaseLegalLotLabel?.trim() ? (
                    <p className="mt-1 text-sm font-semibold tracking-wide text-gray-600 dark:text-[#a3a3a3]">
                      {item.inaseLegalLotLabel.trim()}
                    </p>
                  ) : null}
                  <div className="group/desc relative mt-2 min-h-[1.5rem]">
                    {descEditing ? (
                      <textarea
                        className="mt-1 min-h-[88px] w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200 dark:border-[#3d3d3d] dark:bg-[#252525] dark:text-[#e8e8e8] dark:placeholder:text-[#6b6b6b] dark:focus:border-sky-500 dark:focus:ring-sky-500/30"
                        value={descDraft}
                        onChange={(e) => setDescDraft(e.target.value)}
                        onBlur={() => commitDescription()}
                        placeholder={t('germinacionDetail.descriptionPlaceholder')}
                        autoFocus
                      />
                    ) : displayStrainDescription ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            startDescEdit(false)
                          }
                        }}
                        className="relative mt-1 cursor-pointer rounded-xl bg-gray-50/90 px-3 py-2 pr-10 text-sm leading-relaxed text-gray-700 transition hover:bg-gray-100 dark:bg-[#252525] dark:text-[#d4d4d4] dark:hover:bg-[#2e2e2e]"
                        onClick={() => startDescEdit(false)}
                      >
                        <p className="whitespace-pre-wrap">{displayStrainDescription}</p>
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-lg p-1.5 text-gray-400 opacity-0 transition hover:bg-white hover:text-gray-700 group-hover/desc:opacity-100 dark:text-[#8c8c8c] dark:hover:bg-[#2e2e2e] dark:hover:text-[#e5e5e5]"
                          aria-label={t('common.edit')}
                          onClick={(e) => {
                            e.stopPropagation()
                            startDescEdit(false)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <EmptyActionLink onClick={() => startDescEdit(true)}>
                          {t('germinacionDetail.addDescription')}
                        </EmptyActionLink>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-800 ring-1 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800/40">
                    <Diamond className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" strokeWidth={2} />
                    {boardTab === 'vegetacion'
                      ? t('vegetacionDetail.batchDetailBadge')
                      : boardTab === 'floracion'
                        ? t('floracionDetail.batchDetailBadge')
                        : boardTab === 'cosecha'
                          ? t('cosechaDetail.batchDetailBadge')
                          : t('germinacionDetail.batchBadge')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-2xl p-2.5 text-gray-500 transition hover:bg-gray-100 dark:text-[#a3a3a3] dark:hover:bg-[#2e2e2e]"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="grid flex-1 gap-8 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-10">
                <div className="flex flex-col gap-4">
                  <PropagacionBatchDashboard
                    propagacionLog={item.propagacionLog}
                    age={age}
                    locale={locale}
                    timeZone={clubTimeZone}
                    t={t}
                    inventory={dashInventory}
                    lateInventory={lateInv}
                    mode={
                      boardTab === 'vegetacion'
                        ? 'vegetacion'
                        : boardTab === 'floracion' || boardTab === 'cosecha'
                          ? 'floracion'
                          : 'propagacion'
                    }
                    vegStageDay={boardTab === 'vegetacion' ? vegStageDayNumber(item) : undefined}
                    florFlowerDay={
                      boardTab === 'floracion'
                        ? florFlowerDayNumber(item)
                        : boardTab === 'cosecha'
                          ? cosechaDayNumber(item)
                          : undefined
                    }
                    geneticsType={item.geneticsType}
                    flowerDurationWeeks={item.flowerDurationWeeks}
                  />

                  {peerPlants.length >= 1 && isVegFlorCosecha ? (
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-black/20">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#a3a3a3]">
                        {t('germinacionDetail.peerPlantsTitle', { n: peerPlants.length })}
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {peerPlants.map((p) => {
                          const isHere = p.id === item.id
                          const st = p.cultivoUnitStatus
                          return (
                            <li
                              key={p.id}
                              className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 text-gray-800 ring-1 ring-gray-100 dark:bg-[#222] dark:text-[#e5e5e5] dark:ring-[#3d3d3d]"
                            >
                              <span className="font-medium">{braceletLineDetail(p, t)}</span>
                              {isHere ? (
                                <span className="text-[10px] font-semibold uppercase text-sky-700 dark:text-sky-300">
                                  {t('germinacionDetail.peerThisCard')}
                                </span>
                              ) : null}
                              {st === 'quarantine' ? (
                                <span className="inline-flex items-center gap-0.5 text-amber-700" title={t('diario.badgeCuarentena')}>
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                </span>
                              ) : null}
                              {st === 'baja' ? (
                                <span className="text-[10px] font-bold uppercase text-red-700">{t('diario.badgeBaja')}</span>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}

                  <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-black/20">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#a3a3a3]">
                      {t('germinacionDetail.journalTitle')}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <input
                        className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:placeholder:text-[#6b6b6b]"
                        value={quickNote}
                        onChange={(e) => setQuickNote(e.target.value)}
                        placeholder={t('germinacionDetail.quickNotePh')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            saveQuickNote()
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={saveQuickNote}
                        className="shrink-0 rounded-full bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-green-800"
                      >
                        {t('germinacionDetail.saveNote')}
                      </button>
                    </div>

                    <DiarioActionMenu
                      className="mt-4"
                      t={t}
                      menuVariant={
                        boardTab === 'vegetacion'
                          ? 'vegetacion'
                          : isFlorOrCosecha
                            ? 'floracion'
                            : 'default'
                      }
                      lateStageCompliance={
                        isVegFlorCosecha
                          ? {
                              onRegistrarBaja: () => setBajaPlantaModalOpen(true),
                              onCuarentena: () => setCuarentenaModalOpen(true),
                              onReubicar: () => setRelocateModalOpen(true),
                            }
                          : null
                      }
                      propagacionChecklists={propagacionDiarioChecklists}
                      onPick={(action) => {
                        if (action === 'altura') {
                          setDiarioModal('altura')
                          return
                        }
                        const m = action === 'nutricion' ? 'riego' : action
                        setDiarioModal(m)
                      }}
                    />

                    <div className="relative mt-6">
                      {timelineEntries.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 dark:text-[#8c8c8c]">{t('germinacionDetail.timelineEmpty')}</p>
                      ) : (
                        <ul className="space-y-0">
                          {timelineEntries.map((e, i) => (
                            <li key={e.id} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                {logIcon(e)}
                                {i < timelineEntries.length - 1 ? (
                                  <span className="mt-1 w-px flex-1 min-h-[12px] bg-gray-200 dark:bg-[#3d3d3d]" />
                                ) : null}
                              </div>
                              <div className="min-w-0 flex-1 pb-6">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-[11px] font-medium text-gray-400 dark:text-[#8c8c8c]">
                                    {formatDiarioTimestamp(e.at, locale, clubTimeZone)}
                                  </p>
                                  {e.author && e.kind !== 'note' ? (
                                    <p
                                      className="max-w-[45%] shrink-0 truncate text-right text-[11px] text-gray-500 dark:text-[#a3a3a3]"
                                      title={e.author}
                                    >
                                      {e.author}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="mt-1 text-sm leading-snug">{renderLogBody(e)}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-6">
                  <section className="group/passport relative rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-black/20">
                    <button
                      type="button"
                      onClick={openPassport}
                      title={t('germinacionDetail.editPassportAria')}
                      aria-label={t('germinacionDetail.editPassportAria')}
                      className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-700 group-hover/passport:opacity-100 dark:text-[#8c8c8c] dark:hover:bg-[#2e2e2e] dark:hover:text-[#e5e5e5]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 pr-10 dark:text-[#a3a3a3]">
                      {t('germinacionDetail.passportTitle')}
                    </h3>
                    <dl className="mt-4 space-y-4 text-sm">
                      <div>
                        <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.fieldType')}</dt>
                        <dd className="mt-1 text-gray-700 dark:text-[#d4d4d4]">
                          {isClone ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1',
                                typeAccentClass,
                              )}
                            >
                              <Leaf className="h-3.5 w-3.5" />
                              Clon
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1',
                                typeAccentClass,
                              )}
                            >
                              <Sprout className="h-3.5 w-3.5" />
                              Semilla
                            </span>
                          )}
                        </dd>
                      </div>
                      {isInaseCertifiedSeed ? (
                        <div className="border-t border-gray-100 pt-3 dark:border-[#2e2e2e]">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-amber-900/90 dark:text-amber-200/90">
                            {t('germinacionDetail.passportInaseTitle')}
                          </dt>
                          <dd className="mt-2 space-y-3 text-gray-700 dark:text-[#d4d4d4]">
                            <div>
                              <p className="text-[11px] font-medium text-gray-500 dark:text-[#a3a3a3]">
                                {t('cultivoBoard.inaseVarietyLabel')}
                              </p>
                              <p className="mt-0.5 font-medium text-gray-900 dark:text-[#f1f1f1]">
                                {[
                                  item.inaseVarietyId?.trim(),
                                  (item.inaseVarietyName ?? item.strain)?.trim(),
                                ]
                                  .filter(Boolean)
                                  .join(' · ') || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-gray-500 dark:text-[#a3a3a3]">
                                {t('cultivoBoard.inaseProviderRncyfsLabel')}
                              </p>
                              <p className="mt-0.5 font-medium text-gray-900 dark:text-[#f1f1f1]">
                                {item.inaseProviderRncyfs?.trim() || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-gray-500 dark:text-[#a3a3a3]">
                                {t('cultivoBoard.inaseSecurityStampLabel')}
                              </p>
                              <p className="mt-0.5 font-medium text-gray-900 dark:text-[#f1f1f1]">
                                {item.inaseSecurityStamp?.trim() || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-gray-500 dark:text-[#a3a3a3]">
                                {t('cultivoBoard.inaseHarvestYearLabel')}
                              </p>
                              <p className="mt-0.5 font-medium text-gray-900 dark:text-[#f1f1f1]">
                                {item.inaseHarvestYear != null && Number.isFinite(item.inaseHarvestYear)
                                  ? String(item.inaseHarvestYear)
                                  : '—'}
                              </p>
                            </div>
                            {item.inaseLabelPhotoDataUrl?.trim() ? (
                              <div>
                                <p className="text-[11px] font-medium text-gray-500 dark:text-[#a3a3a3]">
                                  {t('germinacionDetail.passportInaseLabelPhoto')}
                                </p>
                                <a
                                  href={item.inaseLabelPhotoDataUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-block max-w-full"
                                >
                                  <img
                                    src={item.inaseLabelPhotoDataUrl}
                                    alt=""
                                    className="max-h-56 w-full max-w-sm rounded-xl border border-gray-200 object-contain dark:border-[#3d3d3d]"
                                  />
                                </a>
                              </div>
                            ) : null}
                          </dd>
                        </div>
                      ) : null}
                      {isClone ? (
                        <>
                          <div>
                            <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">
                              {t('germinacionDetail.fieldMotherId')}
                            </dt>
                            <dd className="mt-1">
                              {item.motherPlantId?.trim() ? (
                                <span className="font-medium text-gray-900 dark:text-[#f1f1f1]">
                                  {t('germinacionDetail.motherCutFrom', {
                                    id: item.motherPlantId.trim(),
                                  })}
                                </span>
                              ) : (
                                <EmptyActionLink onClick={openPassport}>{t('germinacionDetail.addMotherSource')}</EmptyActionLink>
                              )}
                            </dd>
                          </div>
                          {geneticProfileSection}
                          <div>
                            <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.fieldGeneration')}</dt>
                            <dd className="mt-1 text-gray-700 dark:text-[#d4d4d4]">
                              {item.cloneGeneration?.trim() ? (
                                item.cloneGeneration
                              ) : (
                                <EmptyActionLink onClick={openPassport}>{t('germinacionDetail.addGeneration')}</EmptyActionLink>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.fieldRootingHormone')}</dt>
                            <dd className="mt-1 text-gray-700 dark:text-[#d4d4d4]">
                              {item.rootingHormone?.trim() ? (
                                item.rootingHormone
                              ) : (
                                <EmptyActionLink onClick={openPassport}>{t('germinacionDetail.addHormone')}</EmptyActionLink>
                              )}
                            </dd>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.fieldBreeder')}</dt>
                            <dd className="mt-1 text-gray-700 dark:text-[#d4d4d4]">
                              {item.breeder?.trim() ? (
                                item.breeder
                              ) : (
                                <EmptyActionLink onClick={openPassport}>{t('germinacionDetail.addBreeder')}</EmptyActionLink>
                              )}
                            </dd>
                          </div>
                          {geneticProfileSection}
                          <div>
                            <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.fieldSeedCount')}</dt>
                            <dd className="mt-1 text-gray-700 dark:text-[#d4d4d4]">
                              {item.seedCount != null ? (
                                item.seedCount
                              ) : item.quantity != null ? (
                                item.quantity
                              ) : (
                                <EmptyActionLink onClick={openPassport}>{t('germinacionDetail.addSeedCount')}</EmptyActionLink>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.fieldGermStart')}</dt>
                            <dd className="mt-1 text-gray-700 dark:text-[#d4d4d4]">
                              {item.germinationStartDate ? (
                                formatRuDate(item.germinationStartDate, clubTimeZone)
                              ) : (
                                <EmptyActionLink onClick={openPassport}>{t('germinacionDetail.addGermDate')}</EmptyActionLink>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.fieldGermMethod')}</dt>
                            <dd className="mt-1 text-gray-700 dark:text-[#d4d4d4]">
                              {germinationRowLabel ? (
                                <button
                                  type="button"
                                  className="text-left font-medium text-gray-900 underline decoration-dashed decoration-gray-400 underline-offset-4 hover:decoration-gray-600 dark:text-[#f1f1f1] dark:decoration-gray-500 dark:hover:decoration-gray-400"
                                  onClick={openPassport}
                                >
                                  {germinationRowLabel}
                                </button>
                              ) : (
                                <EmptyActionLink onClick={openPassport}>{t('germinacionDetail.addGermMethod')}</EmptyActionLink>
                              )}
                            </dd>
                          </div>
                        </>
                      )}
                      <div>
                        <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.fieldStartBatch')}</dt>
                        <dd className="mt-1 text-gray-700 dark:text-[#d4d4d4]">
                          {formatRuDate(item.date, clubTimeZone)}
                          <span className="ml-1.5 text-xs text-gray-500 dark:text-[#a3a3a3]">({item.date})</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">
                          {boardTab === 'vegetacion'
                            ? t('vegetacionDetail.passportVegAgeSection')
                            : boardTab === 'floracion'
                              ? t('floracionDetail.passportFlorAgeSection')
                              : boardTab === 'cosecha'
                                ? t('cosechaDetail.passportCosechaSection')
                                : t('germinacionDetail.ageSection')}
                        </dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-[#f1f1f1]">
                          {boardTab === 'vegetacion'
                            ? t('vegetacionDetail.vegStageWidgetDay', { n: vegStageDayNumber(item) })
                            : boardTab === 'floracion'
                              ? t('floracionDetail.flowerTimerLine', {
                                  week: String(Math.max(1, Math.ceil(florFlowerDayNumber(item) / 7))),
                                  day: String(florFlowerDayNumber(item)),
                                })
                              : boardTab === 'cosecha'
                                ? t('cosechaDetail.cosechaDay', { n: cosechaDayNumber(item) })
                                : t('germinacionDetail.ageDayLabel', { n: age })}
                        </dd>
                      </div>
                      <div className="group/env border-t border-gray-100 pt-3 dark:border-[#2e2e2e]">
                        <div className="flex items-start justify-between gap-2">
                          <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.environmentBlock')}</dt>
                          <button
                            type="button"
                            title={t('germinacionDetail.editEnvironmentAria')}
                            aria-label={t('germinacionDetail.editEnvironmentAria')}
                            onClick={openGrowModeField}
                            className="shrink-0 rounded-lg p-1.5 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-700 group-hover/env:opacity-100 dark:text-[#8c8c8c] dark:hover:bg-[#2e2e2e] dark:hover:text-[#e5e5e5]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <dd className="mt-2">
                          <button
                            type="button"
                            onClick={openGrowModeField}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 transition hover:opacity-90',
                              growModeClass,
                            )}
                          >
                            <Sun className="h-3.5 w-3.5" />
                            {growMode}
                          </button>
                        </dd>
                        <dd className="mt-2 flex items-start gap-2 text-gray-700 dark:text-[#d4d4d4]">
                          <Zap className="mt-0.5 h-4 w-4 text-gray-500 dark:text-[#a3a3a3]" />
                          <span>
                            {lightingDisplay ? (
                              <button
                                type="button"
                                className="text-left font-medium text-gray-800 underline decoration-dashed decoration-gray-400 underline-offset-4 hover:decoration-gray-600 dark:text-[#e8e8e8] dark:decoration-gray-500 dark:hover:decoration-gray-400"
                                onClick={openLightingField}
                              >
                                {lightingDisplay}
                              </button>
                            ) : (
                              <EmptyActionLink onClick={openLightingField}>{t('germinacionDetail.addLight')}</EmptyActionLink>
                            )}
                          </span>
                        </dd>
                        <dd className="mt-1 flex items-start gap-2 text-gray-700 dark:text-[#d4d4d4]">
                          <Leaf className="mt-0.5 h-4 w-4 text-gray-500 dark:text-[#a3a3a3]" />
                          <span>
                            {substrateDisplay ? (
                              <button
                                type="button"
                                className="text-left font-medium text-gray-800 underline decoration-dashed decoration-gray-400 underline-offset-4 hover:decoration-gray-600 dark:text-[#e8e8e8] dark:decoration-gray-500 dark:hover:decoration-gray-400"
                                onClick={openSubstrateField}
                              >
                                {substrateDisplay}
                              </button>
                            ) : (
                              <EmptyActionLink onClick={openSubstrateField}>
                                {t('germinacionDetail.addSubstrate')}
                              </EmptyActionLink>
                            )}
                          </span>
                        </dd>
                        <dd className="mt-2 flex items-start gap-2 text-gray-700 dark:text-[#d4d4d4]">
                          <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                          <span>
                            {irrigationDisplay ? (
                              <button
                                type="button"
                                className="text-left font-medium text-gray-800 underline decoration-dashed decoration-gray-400 underline-offset-4 hover:decoration-gray-600 dark:text-[#e8e8e8] dark:decoration-gray-500 dark:hover:decoration-gray-400"
                                onClick={openIrrigationOnly}
                              >
                                {t('germinacionDetail.fieldIrrigation')}: {irrigationDisplay}
                              </button>
                            ) : (
                              <EmptyActionLink onClick={openIrrigationOnly}>{t('germinacionDetail.addIrrigation')}</EmptyActionLink>
                            )}
                          </span>
                        </dd>
                        <dd className="mt-1 flex items-start gap-2 text-gray-700 dark:text-[#d4d4d4]">
                          <Package className="mt-0.5 h-4 w-4 shrink-0 text-amber-600/90" />
                          <span>
                            {potLineDisplay ? (
                              <button
                                type="button"
                                className="text-left font-medium text-gray-800 underline decoration-dashed decoration-gray-400 underline-offset-4 hover:decoration-gray-600 dark:text-[#e8e8e8] dark:decoration-gray-500 dark:hover:decoration-gray-400"
                                onClick={openPotVolumeField}
                              >
                                {t('germinacionDetail.fieldPotSize')}: {potLineDisplay}
                              </button>
                            ) : (
                              <EmptyActionLink onClick={openPotVolumeField}>
                                {t('germinacionDetail.addPotSize')}
                              </EmptyActionLink>
                            )}
                          </span>
                        </dd>
                        {boardTab === 'vegetacion' ? (
                          <dd className="mt-2 flex items-start gap-2 text-gray-700 dark:text-[#d4d4d4]">
                            <LayoutGrid className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/90" />
                            <span>
                              {vegTechniqueDisplay ? (
                                <button
                                  type="button"
                                  className="text-left font-medium text-gray-800 underline decoration-dashed decoration-gray-400 underline-offset-4 hover:decoration-gray-600 dark:text-[#e8e8e8] dark:decoration-gray-500 dark:hover:decoration-gray-400"
                                  onClick={openVegTechniqueField}
                                >
                                  {t('vegetacionDetail.fieldTechniqueShort')}: {vegTechniqueDisplay}
                                </button>
                              ) : (
                                <EmptyActionLink onClick={openVegTechniqueField}>
                                  {t('vegetacionDetail.addTechnique')}
                                </EmptyActionLink>
                              )}
                            </span>
                          </dd>
                        ) : null}
                      </div>
                      <div className="group/nut border-t border-gray-100 pt-3 dark:border-[#2e2e2e]">
                        <div className="flex items-start justify-between gap-2">
                          <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.nutritionBlock')}</dt>
                          <button
                            type="button"
                            title={t('germinacionDetail.editNutritionAria')}
                            aria-label={t('germinacionDetail.editNutritionAria')}
                            onClick={openNutrition}
                            className="shrink-0 rounded-lg p-1.5 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-700 group-hover/nut:opacity-100 dark:text-[#8c8c8c] dark:hover:bg-[#2e2e2e] dark:hover:text-[#e5e5e5]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <dd className="mt-2 flex items-start gap-2 text-gray-700 dark:text-[#d4d4d4]">
                          <TestTube2 className="mt-0.5 h-4 w-4 text-gray-500 dark:text-[#a3a3a3]" />
                          <span>
                            {fertilizerDisplay ? (
                              <button
                                type="button"
                                className="text-left font-medium text-gray-800 underline decoration-dashed decoration-gray-400 underline-offset-4 hover:decoration-gray-600 dark:text-[#e8e8e8] dark:decoration-gray-500 dark:hover:decoration-gray-400"
                                onClick={openNutrition}
                              >
                                {fertilizerDisplay}
                              </button>
                            ) : (
                              <EmptyActionLink onClick={openNutrition}>{t('germinacionDetail.addNutrientLine')}</EmptyActionLink>
                            )}
                          </span>
                        </dd>
                        {hasPh || hasEc ? (
                          <dd className="mt-1 flex items-start gap-2 text-gray-700 dark:text-[#d4d4d4]">
                            <Droplets className="mt-0.5 h-4 w-4 text-gray-500 dark:text-[#a3a3a3]" />
                            <span>
                              {t('germinacionDetail.nutrientMeterLine', {
                                ph: hasPh ? item.nutrientPh!.toFixed(1) : '—',
                                ec: hasEc ? item.nutrientEc!.toFixed(2) : '—',
                                tempPart:
                                  item.solutionTempC != null
                                    ? t('germinacionDetail.logTempPart', { temp: String(item.solutionTempC) })
                                    : '',
                              })}
                            </span>
                          </dd>
                        ) : null}
                      </div>
                      <div className="border-t border-gray-100 pt-3 dark:border-[#2e2e2e]">
                        <dt className="text-xs font-semibold text-gray-800 dark:text-[#c8c8c8]">{t('germinacionDetail.locationBlock')}</dt>
                        <dd className="mt-1">
                          {isVegFlorCosecha ? (
                            <button
                              type="button"
                              onClick={() => setRelocateModalOpen(true)}
                              className="inline-flex items-center gap-1.5 text-left text-sm font-medium text-sky-700 underline decoration-sky-600/40 underline-offset-2 transition hover:text-sky-900 hover:decoration-sky-700 dark:text-sky-300 dark:decoration-sky-500/50 dark:hover:text-sky-200"
                            >
                              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} />
                              {locationLineForPassport || t('relocate.noLocationLabel')}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-[#a3a3a3]">{item.location || '—'}</span>
                          )}
                        </dd>
                        <dd className="mt-1 text-xs text-gray-500 dark:text-[#a3a3a3]">
                          {t('germinacionDetail.lotQtyLine', {
                            q: String(passportQtyDisplay),
                            init:
                              item.initialQuantity != null &&
                              item.initialQuantity > passportQtyDisplay
                                ? t('germinacionDetail.lotQtyInit', { n: item.initialQuantity })
                                : '',
                          })}
                          {t('germinacionDetail.lotQtyUnit')}
                        </dd>
                        {item.splitFromSourceBatchId?.trim() ? (
                          <dd className="mt-2 rounded-lg border border-slate-100 bg-slate-50/90 px-2.5 py-1.5 text-[11px] text-slate-700 dark:border-[#3d3d3d] dark:bg-[#222] dark:text-[#d4d4d4]">
                            <span className="font-semibold uppercase tracking-wide text-slate-600 dark:text-[#b0b0b0]">
                              {t('loteSplit.traceTitle')}
                            </span>
                            <span className="mt-0.5 block">{t('loteSplit.traceFrom', { id: item.splitFromSourceBatchId.trim() })}</span>
                          </dd>
                        ) : null}
                      </div>
                    </dl>
                    {boardTab === 'vegetacion' &&
                    item.trackingType !== 'planta' &&
                    passportQtyDisplay >= 1 ? (
                      <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/50 p-3.5 dark:border-teal-900/40 dark:bg-teal-950/35">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-900/80 dark:text-teal-200/90">
                          {t('vegetacionDetail.passportInventoryTitle')}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-[#f1f1f1]">
                          {t('vegetacionDetail.passportInventoryCount', { n: passportQtyDisplay })}
                        </p>
                        <p className="mt-2 text-sm font-medium text-teal-900 dark:text-teal-200">
                          {t('vegetacionDetail.viewIndividualPlants', { n: passportQtyDisplay })}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-600 dark:text-[#a3a3a3]">
                          {t('vegetacionDetail.braceletIdRange', {
                            from: String(1).padStart(3, '0'),
                            to: String(passportQtyDisplay).padStart(3, '0'),
                          })}
                        </p>
                      </div>
                    ) : null}
                  </section>

                  {boardTab === 'vegetacion' && onMoveToFloracion ? (
                    <button
                      type="button"
                      onClick={onMoveToFloracion}
                      className="w-full rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-600 to-indigo-700 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(109,40,217,0.35)] transition hover:brightness-105"
                    >
                      {t('vegetacionDetail.ctaMoveToFlower')}
                    </button>
                  ) : boardTab === 'floracion' && onHarvest ? (
                    <button
                      type="button"
                      onClick={onHarvest}
                      className="w-full rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(217,119,6,0.35)] transition hover:brightness-105"
                    >
                      {t('floracionRow.harvest')}
                    </button>
                  ) : onBracelet ? (
                    <button
                      type="button"
                      onClick={onBracelet}
                      className="w-full rounded-2xl border border-teal-400/30 bg-gradient-to-r from-teal-500 to-teal-600 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(20,184,166,0.35)] transition hover:brightness-105"
                    >
                      {t('germinacionDetail.putBracelet')}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.aside>
          {modals}
        </>
      ) : null}
    </AnimatePresence>
  )
}
