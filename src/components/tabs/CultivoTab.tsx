import { motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Droplets,
  Filter,
  Flower2,
  Leaf,
  MapPin,
  Plus,
  Shield,
  Sprout,
  Tags,
  Wheat,
} from 'lucide-react'
import { type PlantCardItem } from '../cultivo/PlantCard'
import { PropagacionBatchCard } from '../cultivo/PropagacionBatchCard'
import { CultivoLoteListRow } from '../cultivo/CultivoLoteListRow'
import { PropagacionBatchDetailSlideover } from '../cultivo/PropagacionBatchDetailSlideover'
import { EditCultivoItemModal } from '../cultivo/EditCultivoItemModal'
import { MotherPlantSearchSelect } from '../cultivo/MotherPlantSearchSelect'
import { HarvestModal } from '../cultivo/HarvestModal'
import { LocationSelector } from '../location/LocationSelector'
import { MoveToFlowerModal, type MoveToFlowerConfirmPayload } from '../cultivo/MoveToFlowerModal'
import { resolveCultivoPeerGroup as resolveVegPeerGroup } from '../../lib/cultivo/resolveCultivoPeerGroup'
import { DividirLoteModal } from '../cultivo/DividirLoteModal'
import { TransplantModal, type TransplantModalConfirmPayload } from '../cultivo/TransplantModal'
import { StrainAutocomplete } from '../ui/StrainAutocomplete'
import {
  BRACELET_COLOR_TRACKING_OPTIONS,
  GENETICS_TYPE_OPTIONS,
  type CloneOriginKind,
  type CultivoKanbanTab,
  type GeneticsType,
  type PropagacionLogEntry,
} from '../../store/cultivationTypes'
import { INASE_VARIETIES } from '../../data/inaseVarieties'
import { cn } from '../../lib/cn'
import { formatTopologyLabel } from '../../lib/locationTopologyFormat'
import { applyLoteSplit } from '../../lib/cultivo/applyLoteSplit'
import { batchGroupKey, groupPlantsBySourceBatch } from '../../lib/cultivo/groupPlantsBySourceBatch'
import type { RoomPurpose, TopologySelection } from '../../store/locationTopologyTypes'
import { useCultivationStore } from '../../store/useCultivationStore'
import { useLocationTopologyStore } from '../../store/useLocationTopologyStore'
import { useTranslation } from '../../i18n/useTranslation'
import { SoftSelect } from '../ui/SoftSelect'
import { PostCosechaTab } from './PostCosechaTab'

const CREATE_LOT_EXCLUDED_ROOM_TYPES: RoomPurpose[] = ['quarantine', 'drying']

type BoardTab = CultivoKanbanTab
type ColumnId = 'c1' | 'c2' | 'c3'

type ColumnDef = {
  id: ColumnId
  title: string
  icon: typeof Sprout
}

type CreateKind = 'lote' | 'planta'

/** Тот же зелёный, что кнопки в шапке / сайдбаре. */
const CULTIVO_BRAND_GREEN = '#06663F'
/** Круг = квадрат (как h-14); свёрнуто gap-0, развёрнуто — ghost с gap-2 под ширину. */
const ADD_FAB_COLLAPSED_PX = 56
/** Доп. ширина к раскрытию (скругление + визуальный воздух). */
const ADD_FAB_EXPAND_WIDTH_PAD_PX = 10

/** Oculta flechas de `<input type="number">` (Chrome / Safari / Firefox reciente). */
const INPUT_NO_NUMBER_SPINNER =
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

function cx(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(' ')
}

function localIsoDate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nowIsoDateTime(): string {
  return new Date().toISOString()
}

/** Diario continuo: copia el historial y añade evento de sistema al cambiar de etapa. */
function appendStageTransitionLog(
  existing: PropagacionLogEntry[] | undefined,
  systemKey: 'moved_to_vegetacion' | 'moved_to_floracion' | 'moved_to_cosecha',
  atIso: string,
): PropagacionLogEntry[] {
  return [
    ...(existing ?? []),
    {
      id: `sys-${systemKey}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      at: atIso,
      kind: 'system' as const,
      systemKey,
    },
  ]
}

const INASE_LABEL_PHOTO_MAX_BYTES = 2_400_000

async function compressImageFileToDataUrl(file: File): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!file.type.startsWith('image/')) return null

  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('image_load_failed'))
    })
    img.src = url
    await loaded

    const maxSide = 1600
    const w0 = Math.max(1, img.naturalWidth || img.width)
    const h0 = Math.max(1, img.naturalHeight || img.height)
    const scale = Math.min(1, maxSide / Math.max(w0, h0))
    const w = Math.max(1, Math.round(w0 * scale))
    const h = Math.max(1, Math.round(h0 * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, w, h)

    const tryJpeg = (q: number) => canvas.toDataURL('image/jpeg', q)
    let out = tryJpeg(0.82)
    if (out.length > INASE_LABEL_PHOTO_MAX_BYTES) out = tryJpeg(0.72)
    if (out.length > INASE_LABEL_PHOTO_MAX_BYTES) out = tryJpeg(0.62)
    if (out.length > INASE_LABEL_PHOTO_MAX_BYTES) out = tryJpeg(0.52)
    if (out.length > INASE_LABEL_PHOTO_MAX_BYTES) {
      const w2 = Math.max(1, Math.round(w * 0.85))
      const h2 = Math.max(1, Math.round(h * 0.85))
      canvas.width = w2
      canvas.height = h2
      ctx.drawImage(img, 0, 0, w2, h2)
      out = tryJpeg(0.62)
    }
    if (out.length > INASE_LABEL_PHOTO_MAX_BYTES) return null
    return out
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function CultivoTab() {
  const tenantId = 'tenant-default'
  const geneticsBank = useCultivationStore((s) => (Array.isArray(s.geneticsBank) ? s.geneticsBank : []))
  const cultivoBoardStore = useCultivationStore((s) => s.cultivoBoard)
  const board = useMemo(() => {
    const b = cultivoBoardStore
    return {
      propagacion: Array.isArray(b?.propagacion) ? b.propagacion : [],
      vegetacion: Array.isArray(b?.vegetacion) ? b.vegetacion : [],
      floracion: Array.isArray(b?.floracion) ? b.floracion : [],
      cosecha: Array.isArray(b?.cosecha) ? b.cosecha : [],
    }
  }, [cultivoBoardStore])

  const setCultivoBoard = useCultivationStore((s) => s.setCultivoBoard)
  const recordCultivoTransplant = useCultivationStore((s) => s.recordCultivoTransplant)
  const recordCultivoFlowerMove = useCultivationStore((s) => s.recordCultivoFlowerMove)
  const recordFloracionHarvestBatch = useCultivationStore((s) => s.recordFloracionHarvestBatch)
  const plantsRegistry = useCultivationStore((s) => (Array.isArray(s.plants) ? s.plants : []))
  const cultivationRooms = useCultivationStore((s) => (Array.isArray(s.rooms) ? s.rooms : []))
  const [activeTab, setActiveTab] = useState<BoardTab>('propagacion')
  const [detailItemId, setDetailItemId] = useState<string | null>(null)

  /** Tras ir al Cultivo desde el dashboard (widget Floración, etc.). */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cultivo-pending-board-tab')
      if (
        raw === 'propagacion' ||
        raw === 'vegetacion' ||
        raw === 'floracion' ||
        raw === 'cosecha'
      ) {
        setActiveTab(raw)
        sessionStorage.removeItem('cultivo-pending-board-tab')
      }
    } catch {
      // ignore
    }
  }, [])
  const [addFabOpen, setAddFabOpen] = useState(false)
  const [addFabMotionOk, setAddFabMotionOk] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setAddFabMotionOk(!mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  const [createOpen, setCreateOpen] = useState(false)
  const [createKind, setCreateKind] = useState<CreateKind>('lote')
  const [createStrain, setCreateStrain] = useState('')
  const [createSeedType, setCreateSeedType] = useState<'Semilla' | 'Clon'>('Semilla')
  const [createSeedComplianceType, setCreateSeedComplianceType] = useState<'certificada' | 'propia'>('propia')
  const [createInaseVarietyId, setCreateInaseVarietyId] = useState<string>('')
  const [createInaseProviderRncyfs, setCreateInaseProviderRncyfs] = useState('')
  const [createInaseSecurityStamp, setCreateInaseSecurityStamp] = useState('')
  const [createInaseHarvestYear, setCreateInaseHarvestYear] = useState('')
  const [createInaseLabelPhotoDataUrl, setCreateInaseLabelPhotoDataUrl] = useState<string | null>(null)
  const createInaseLabelPhotoInputRef = useRef<HTMLInputElement>(null)
  const [createQty, setCreateQty] = useState('50')
  const [createDate, setCreateDate] = useState(localIsoDate())
  const [createGrowMode, setCreateGrowMode] = useState<'indoor' | 'outdoor'>('indoor')
  const [createCloneOrigin, setCreateCloneOrigin] = useState<'' | CloneOriginKind>('')
  const [createMotherRegistryId, setCreateMotherRegistryId] = useState('')
  const [createCloneExternalSource, setCreateCloneExternalSource] = useState('')
  const [createGeneticsType, setCreateGeneticsType] = useState<GeneticsType>('fotoperiodica')
  const [transferLotId, setTransferLotId] = useState<string | null>(null)
  const [transplantTopology, setTransplantTopology] = useState<TopologySelection | null>(null)
  const [createTopology, setCreateTopology] = useState<TopologySelection | null>(null)
  const [createTopologyError, setCreateTopologyError] = useState(false)
  /** Incrementar al fallar «Crear» sin sala → re‑ejecuta la animación de sacudida en la pala. */
  const [createFillBannerShakeKey, setCreateFillBannerShakeKey] = useState(0)
  const [moveFlowerAnchorId, setMoveFlowerAnchorId] = useState<string | null>(null)
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [harvestItemId, setHarvestItemId] = useState<string | null>(null)
  /** Cosecha masiva: todas las tarjetas a retirar de floración (misma partida). */
  const [harvestBatchPlantIds, setHarvestBatchPlantIds] = useState<string[] | null>(null)
  const [dividirLoteCtx, setDividirLoteCtx] = useState<{
    batch: PlantCardItem[]
    tab: 'vegetacion' | 'floracion'
  } | null>(null)
  const [strainFilter, setStrainFilter] = useState<string>('__all__')
  const [originFilter, setOriginFilter] = useState<'all' | 'semilla' | 'clon'>('all')

  const topoRooms = useLocationTopologyStore((s) => (Array.isArray(s.rooms) ? s.rooms : []))
  const topoFixtures = useLocationTopologyStore((s) => (Array.isArray(s.fixtures) ? s.fixtures : []))
  const topoLevels = useLocationTopologyStore((s) => (Array.isArray(s.levels) ? s.levels : []))

  const { t } = useTranslation()

  const addFabLabelText = useMemo(() => t('cultivoBoard.addSeedlingLot'), [t])
  /** Полная ширина «текст + +»; не зависит от свёрнутой подписи (max-w-0). */
  const addFabMeasureRef = useRef<HTMLSpanElement>(null)
  const [addFabExpandedW, setAddFabExpandedW] = useState(ADD_FAB_COLLAPSED_PX)

  useLayoutEffect(() => {
    const el = addFabMeasureRef.current
    if (!el) return
    const measure = () => {
      const w = Math.ceil(el.scrollWidth)
      setAddFabExpandedW(
        Math.min(920, Math.max(ADD_FAB_COLLAPSED_PX + 4, w + ADD_FAB_EXPAND_WIDTH_PAD_PX)),
      )
    }
    let alive = true
    const safeMeasure = () => {
      if (alive) measure()
    }
    safeMeasure()
    window.addEventListener('resize', safeMeasure)
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    const p = fonts?.ready
    if (p) void p.then(safeMeasure)
    return () => {
      alive = false
      window.removeEventListener('resize', safeMeasure)
    }
  }, [addFabLabelText])

  useEffect(() => {
    const onOpenCreate = (evt: Event) => {
      const detail = (evt as CustomEvent<{ kind?: 'lote' | 'planta' }>).detail
      const nextKind = detail?.kind === 'planta' ? 'planta' : 'lote'
      setCreateKind(nextKind)
      setCreateQty(nextKind === 'planta' ? '1' : '50')
      setCreateOpen(true)
    }
    const onFocusItem = (evt: Event) => {
      const detail = (evt as CustomEvent<{ itemId?: string }>).detail
      const id = String(detail?.itemId ?? '').trim()
      if (!id) return
      const inProp = board.propagacion.some((x) => x.id === id)
      const inVeg = board.vegetacion.some((x) => x.id === id)
      const inFlor = board.floracion.some((x) => x.id === id)
      const inCosecha = board.cosecha.some((x) => x.id === id)
      if (inProp) setActiveTab('propagacion')
      else if (inVeg) setActiveTab('vegetacion')
      else if (inFlor) setActiveTab('floracion')
      else if (inCosecha) setActiveTab('cosecha')
      setDetailItemId(id)
    }
    window.addEventListener('cultivo:open-create', onOpenCreate as EventListener)
    window.addEventListener('cultivo:focus-item', onFocusItem as EventListener)
    return () => {
      window.removeEventListener('cultivo:open-create', onOpenCreate as EventListener)
      window.removeEventListener('cultivo:focus-item', onFocusItem as EventListener)
    }
  }, [board.cosecha, board.floracion, board.propagacion, board.vegetacion])

  const TAB_LABEL = useMemo(
    () =>
      ({
        propagacion: t('cultivoBoard.tabGerminacion'),
        vegetacion: t('cultivoBoard.tabVegetacion'),
        floracion: t('cultivoBoard.tabFloracion'),
        cosecha: t('cultivoBoard.tabCosecha'),
      }) satisfies Record<BoardTab, string>,
    [t],
  )

  /** Solo germinación: edición por subcolumna c1–c3. Veg/flor ya no muestran subetapas en UI. */
  const germinacionColumns = useMemo(
    () =>
      [
        { id: 'c1' as const, title: t('cultivoBoard.germinacionCol1'), icon: Sprout },
        { id: 'c2' as const, title: t('cultivoBoard.germinacionCol2'), icon: Droplets },
        { id: 'c3' as const, title: t('cultivoBoard.germinacionCol3'), icon: Tags },
      ] satisfies ColumnDef[],
    [t],
  )

  const strainFilterChipText = useMemo(
    () =>
      t('cultivoBoard.filterStrainChip', {
        sel:
          strainFilter === '__all__'
            ? t('cultivoBoard.filterStrainChipAll')
            : strainFilter,
      }),
    [t, strainFilter],
  )

  const originFilterChipText = useMemo(() => {
    const sel =
      originFilter === 'all'
        ? t('cultivoBoard.filterOriginChipAll')
        : originFilter === 'semilla'
          ? t('cultivoBoard.originSeedOption')
          : t('cultivoBoard.originCloneOption')
    return t('cultivoBoard.filterOriginChip', { sel })
  }, [t, originFilter])

  const createFormTopologyLabels = useMemo(
    () => ({
      room: t('cultivoBoard.createLocationRoomLabel'),
      fixture: t('topologyUi.fixture'),
      level: t('topologyUi.level'),
      pickRoom: t('cultivoBoard.createLocationPickRoom'),
      pickFixture: t('topologyUi.pickFixture'),
      pickLevel: t('topologyUi.pickLevel'),
      emptyRooms: t('topologyUi.emptyRooms'),
      summary: t('topologyUi.summary'),
    }),
    [t],
  )

  const items = board[activeTab]
  const total = items.length

  const activeBadgeText = useMemo(() => {
    if (activeTab === 'vegetacion' || activeTab === 'floracion' || activeTab === 'cosecha') {
      const lotes = groupPlantsBySourceBatch(items).length
      const plantas = items.length
      if (lotes === 1) return t('cultivoBoard.activeBadgeLotesOne', { plantas })
      return t('cultivoBoard.activeBadgeLotes', { lotes, plantas })
    }
    if (total === 1) return t('cultivoBoard.activeBadgeOne', { n: total })
    return t('cultivoBoard.activeBadgeOther', { n: total })
  }, [activeTab, items, t, total])

  const strainOptions = useMemo(() => {
    const u = [
      ...new Set(items.map((i) => String(i.strain ?? '').trim()).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    return u
  }, [items])

  const strainFilterOptions = useMemo(
    () => [
      { value: '__all__' as const, label: t('cultivoBoard.filterStrainAll') },
      ...strainOptions.map((s) => ({ value: s, label: s })),
    ],
    [t, strainOptions],
  )

  const originFilterOptions = useMemo(
    () =>
      [
        { value: 'all' as const, label: t('cultivoBoard.filterAllShort') },
        { value: 'semilla' as const, label: t('cultivoBoard.filterOriginSeed') },
        { value: 'clon' as const, label: t('cultivoBoard.filterOriginClone') },
      ] as const,
    [t],
  )

  const createKindOptions = useMemo(
    () =>
      [
        { value: 'lote' as CreateKind, label: t('cultivoBoard.kindLot') },
        { value: 'planta' as CreateKind, label: t('cultivoBoard.kindPlant') },
      ] as const,
    [t],
  )

  const createSeedTypeOptions = useMemo(
    () =>
      [
        { value: 'Semilla' as const, label: t('cultivoBoard.originSeedOption') },
        { value: 'Clon' as const, label: t('cultivoBoard.originCloneOption') },
      ] as const,
    [t],
  )

  const createGeneticsOptions = useMemo(
    () =>
      GENETICS_TYPE_OPTIONS.map((opt) => ({
        value: opt.value,
        label: t(`geneticsTypeOption.${opt.value}` as 'geneticsTypeOption.fotoperiodica'),
      })),
    [t],
  )

  const filteredItems = useMemo(() => {
    let out = items
    if (strainFilter !== '__all__')
      out = out.filter((i) => String(i.strain ?? '').trim() === strainFilter)
    if (originFilter === 'semilla') out = out.filter((i) => i.seedType === 'Semilla')
    if (originFilter === 'clon') out = out.filter((i) => i.seedType === 'Clon')
    return out
  }, [items, strainFilter, originFilter])

  const lateStageBatchGroups = useMemo(() => {
    if (activeTab !== 'vegetacion' && activeTab !== 'floracion' && activeTab !== 'cosecha')
      return null
    return groupPlantsBySourceBatch(filteredItems)
  }, [activeTab, filteredItems])

  const hasActiveFilters = strainFilter !== '__all__' || originFilter !== 'all'

  const detailItem = useMemo(() => items.find((x) => x.id === detailItemId) ?? null, [items, detailItemId])
  const transferLot = useMemo(
    () => board.propagacion.find((x) => x.id === transferLotId) ?? null,
    [board.propagacion, transferLotId],
  )

  const moveFlowerAnchor = useMemo(
    () => board.vegetacion.find((x) => x.id === moveFlowerAnchorId) ?? null,
    [board.vegetacion, moveFlowerAnchorId],
  )
  const moveFlowerPeers = useMemo(() => {
    if (!moveFlowerAnchor) return []
    return resolveVegPeerGroup(moveFlowerAnchor, board.vegetacion).filter(
      (p) => p.cultivoUnitStatus !== 'baja',
    )
  }, [moveFlowerAnchor, board.vegetacion])

  useEffect(() => {
    if (transferLotId) {
      setTransplantTopology(null)
    }
  }, [transferLotId])

  useEffect(() => {
    if (createOpen) {
      setCreateKind('lote')
      setCreateStrain('')
      setCreateQty('50')
      setCreateSeedType('Semilla')
      setCreateSeedComplianceType('propia')
      setCreateInaseVarietyId('')
      setCreateInaseProviderRncyfs('')
      setCreateInaseSecurityStamp('')
      setCreateInaseHarvestYear('')
      setCreateInaseLabelPhotoDataUrl(null)
      if (createInaseLabelPhotoInputRef.current) createInaseLabelPhotoInputRef.current.value = ''
      setCreateCloneOrigin('')
      setCreateMotherRegistryId('')
      setCreateCloneExternalSource('')
      setCreateTopology(null)
      setCreateTopologyError(false)
      setCreateFillBannerShakeKey(0)
      setCreateGeneticsType('fotoperiodica')
      setCreateDate(localIsoDate())
      setCreateGrowMode('indoor')
    }
  }, [createOpen])

  useEffect(() => {
    if (!createOpen) return
    const prevHtml = document.documentElement.style.overflow
    const prevBody = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevHtml
      document.body.style.overflow = prevBody
    }
  }, [createOpen])

  useEffect(() => {
    if (moveFlowerAnchorId && moveFlowerPeers.length === 0) {
      setMoveFlowerAnchorId(null)
    }
  }, [moveFlowerAnchorId, moveFlowerPeers.length])

  useEffect(() => {
    setStrainFilter('__all__')
    setOriginFilter('all')
  }, [activeTab])

  const deleteCultivoRow = (itemId: string) => {
    if (!window.confirm(t('cultivoBoard.deleteRowConfirm'))) return
    setCultivoBoard((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((x) => x.id !== itemId),
    }))
    setDetailItemId((p) => (p === itemId ? null : p))
    setEditItemId((p) => (p === itemId ? null : p))
    setHarvestItemId((p) => (p === itemId ? null : p))
    setHarvestBatchPlantIds((prev) => (prev?.includes(itemId) ? null : prev))
  }

  const deleteCultivoBatch = (plantIds: string[]) => {
    const n = plantIds.length
    if (n === 0) return
    if (!window.confirm(t('cultivoBoard.deleteBatchConfirm', { n }))) return
    const idSet = new Set(plantIds)
    setCultivoBoard((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((x) => !idSet.has(x.id)),
    }))
    setDetailItemId((p) => (p && idSet.has(p) ? null : p))
    setEditItemId((p) => (p && idSet.has(p) ? null : p))
    setHarvestItemId((p) => (p && idSet.has(p) ? null : p))
    setHarvestBatchPlantIds(null)
  }

  const makeLoteSplitId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  const confirmDividirLote = (
    moveCount: number,
    topology: TopologySelection,
    locationLabel: string,
  ) => {
    const ctx = dividirLoteCtx
    if (!ctx) return
    const idSet = new Set(ctx.batch.map((p) => p.id))
    setCultivoBoard((prev) =>
      applyLoteSplit({
        board: prev,
        tab: ctx.tab,
        batchPlantIds: idSet,
        moveCount,
        topology,
        locationLabel,
        makeId: makeLoteSplitId,
      }),
    )
  }

  const saveEditedCultivoItem = (updated: PlantCardItem) => {
    setCultivoBoard((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((it) => (it.id === updated.id ? updated : it)),
    }))
  }

  const confirmHarvest = () => {
    const batchIds = harvestBatchPlantIds
    const itemId = harvestItemId
    if (!itemId) return

    const targets =
      batchIds && batchIds.length > 0
        ? batchIds
        : [itemId]

    const item = board.floracion.find((x) => x.id === targets[0])
    if (!item) {
      setHarvestItemId(null)
      setHarvestBatchPlantIds(null)
      return
    }

    const qty = Math.max(1, targets.length)
    let roomLabel = item.location?.trim() ?? ''
    if (item.topologyRoomId) {
      const topoLabel = formatTopologyLabel(
        {
          roomId: item.topologyRoomId,
          fixtureId: item.topologyFixtureId,
          levelId: item.topologyLevelId,
        },
        topoRooms,
        topoFixtures,
        topoLevels,
      )
      if (topoLabel.trim()) roomLabel = topoLabel
    }
    if (!roomLabel) roomLabel = t('cultivoBoard.harvestFallbackRoom')

    const tableLabel =
      item.sourceBatchId?.trim() ||
      item.braceletId?.trim() ||
      (item.trackingType === 'planta'
        ? t('cultivoBoard.harvestTablePlant')
        : t('cultivoBoard.harvestTableLotFlor'))

    recordFloracionHarvestBatch({
      sourceCardId: item.id,
      strain: item.strain,
      plantCount: qty,
      plantIds: targets,
      roomId: item.topologyRoomId ?? 'cultivo-floracion',
      tableId: item.topologyFixtureId ?? item.id,
      roomLabel,
      tableLabel,
    })

    const removeSet = new Set(targets)
    const atCosecha = nowIsoDateTime()
    setCultivoBoard((prev) => {
      const toMove = prev.floracion.filter((x) => removeSet.has(x.id))
      const nextFlor = prev.floracion.filter((x) => !removeSet.has(x.id))
      const moved: PlantCardItem[] = toMove.map((p) => ({
        ...p,
        cosechaStartedAt: atCosecha,
        stageTag: t('cultivoBoard.stageTagCosecha'),
        propagacionLog: appendStageTransitionLog(p.propagacionLog, 'moved_to_cosecha', atCosecha),
      }))
      return {
        ...prev,
        floracion: nextFlor,
        cosecha: [...moved, ...prev.cosecha],
      }
    })
    setDetailItemId((p) => (p && removeSet.has(p) ? null : p))
    setHarvestItemId(null)
    setHarvestBatchPlantIds(null)
    setActiveTab('cosecha')
  }

  const stageTitleMap = useMemo(
    () =>
      ({
        c1: germinacionColumns[0].title,
        c2: germinacionColumns[1].title,
        c3: germinacionColumns[2].title,
      }) as Record<ColumnId, string>,
    [germinacionColumns],
  )

  const editItem = useMemo(
    () => items.find((x) => x.id === editItemId) ?? null,
    [items, editItemId],
  )

  const harvestItem = useMemo(
    () => board.floracion.find((x) => x.id === harvestItemId) ?? null,
    [board.floracion, harvestItemId],
  )

  const openMoveToFlowerModal = (itemId: string) => {
    if (!board.vegetacion.some((x) => x.id === itemId)) return
    setMoveFlowerAnchorId(itemId)
  }

  const handleMoveToFlowerConfirm = (payload: MoveToFlowerConfirmPayload) => {
    if (!moveFlowerAnchorId) return
    const anchor = board.vegetacion.find((x) => x.id === moveFlowerAnchorId)
    if (!anchor) {
      setMoveFlowerAnchorId(null)
      return
    }
    const peerGroup = resolveVegPeerGroup(anchor, board.vegetacion)
    const peerIds = new Set(peerGroup.map((p) => p.id))
    const selected = payload.selectedIds.filter((id) => peerIds.has(id))
    if (selected.length === 0) return

    const locationLabel =
      payload.locationLabel.trim() ||
      formatTopologyLabel(payload.topology, topoRooms, topoFixtures, topoLevels)

    const florStartedAt = nowIsoDateTime()
    setCultivoBoard((prev) => {
      const a = prev.vegetacion.find((x) => x.id === moveFlowerAnchorId)
      if (!a) return prev
      const peers = resolveVegPeerGroup(a, prev.vegetacion)
      const peerSet = new Set(peers.map((p) => p.id))
      const selectedSet = new Set(selected)
      const veg = prev.vegetacion.filter((p) => {
        if (selectedSet.has(p.id)) return false
        if (peerSet.has(p.id) && p.cultivoUnitStatus === 'baja') return true
        if (peerSet.has(p.id)) return false
        return true
      })
      const byId = new Map(peers.map((p) => [p.id, p]))
      const moved: PlantCardItem[] = selected.map((id) => {
        const p = byId.get(id)!
        const isAuto = p.geneticsType === 'automatica'
        return {
          ...p,
          cultivoUnitStatus: undefined,
          quarantineReason: undefined,
          quarantineSinceAt: undefined,
          propagacionLog: appendStageTransitionLog(
            p.propagacionLog,
            'moved_to_floracion',
            florStartedAt,
          ),
          stage: 'c1',
          stageTag: t('cultivoBoard.stageTagFlor'),
          ageDays: undefined,
          location: locationLabel,
          topologyRoomId: payload.topology.roomId,
          topologyFixtureId: payload.topology.fixtureId,
          topologyLevelId: payload.topology.levelId,
          lightingSchedule: !isAuto ? '12/12' : p.lightingSchedule,
          floweringStartDate: payload.floweringStartDate,
          floracionStartedAt: florStartedAt,
          flowerPruningType: payload.pruningType,
          flowerDurationWeeks:
            !isAuto && payload.flowerDurationWeeks != null
              ? payload.flowerDurationWeeks
              : undefined,
        }
      })
      return {
        ...prev,
        vegetacion: veg,
        floracion: [...moved, ...prev.floracion],
      }
    })

    recordCultivoFlowerMove({
      strain: anchor.strain,
      sourceBatchId: anchor.sourceBatchId,
      selectedCount: selected.length,
      bajasCount: payload.bajasCount,
      bajaReasonCode: payload.bajaReasonCode,
      bajaReasonLabel: payload.bajaReasonLabel,
      floweringStartDate: payload.floweringStartDate,
      pruningType: payload.pruningType,
      flowerDurationWeeks: payload.flowerDurationWeeks,
      locationLabel,
      topologyRoomId: payload.topology.roomId,
      topologyFixtureId: payload.topology.fixtureId,
      topologyLevelId: payload.topology.levelId,
      plantIds: selected,
    })

    setMoveFlowerAnchorId(null)
    setDetailItemId(null)
    setActiveTab('floracion')
  }

  const createLot = () => {
    if (!createTopology?.roomId) {
      setCreateTopologyError(true)
      setCreateFillBannerShakeKey((k) => k + 1)
      return
    }
    setCreateTopologyError(false)

    if (createSeedType === 'Semilla' && createSeedComplianceType === 'certificada') {
      const inaseVariety = INASE_VARIETIES.find((v) => v.id === createInaseVarietyId) ?? null
      const harvestYear = Number(String(createInaseHarvestYear).trim())
      if (!inaseVariety) {
        window.alert(t('cultivoBoard.errInaseVarietyRequired'))
        return
      }
      if (!createInaseProviderRncyfs.trim()) {
        window.alert(t('cultivoBoard.errInaseProviderRequired'))
        return
      }
      if (!createInaseSecurityStamp.trim()) {
        window.alert(t('cultivoBoard.errInaseStampRequired'))
        return
      }
      if (!Number.isFinite(harvestYear) || harvestYear < 1900 || harvestYear > 2100) {
        window.alert(t('cultivoBoard.errInaseHarvestYearRequired'))
        return
      }
    }
    if (createSeedType === 'Clon') {
      if (createCloneOrigin !== 'propio' && createCloneOrigin !== 'externo') {
        window.alert(t('cultivoBoard.errCloneOriginRequired'))
        return
      }
      if (createCloneOrigin === 'propio' && !createMotherRegistryId.trim()) {
        window.alert(t('cultivoBoard.errMotherPickRequired'))
        return
      }
    }

    const strainName = createStrain.trim()
    if (!strainName) {
      window.alert(t('cultivoBoard.errStrainRequired'))
      return
    }

    let qty: number
    if (createKind === 'planta') {
      qty = 1
    } else {
      const raw = String(createQty).trim().replace(',', '.')
      const n = Number(raw)
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        window.alert(t('cultivoBoard.errQtyInteger'))
        return
      }
      if (n < 1) {
        window.alert(t('cultivoBoard.errQtyMinOne'))
        return
      }
      if (n < 2) {
        window.alert(t('cultivoBoard.errQtyLotMin'))
        return
      }
      qty = n
    }

    const idPrefix = createKind === 'planta' ? 'P' : 'L'
    const id = `${idPrefix}${Date.now().toString().slice(-5)}`
    const bankKey = strainName.toLowerCase()
    const bankImg =
      geneticsBank.find((g) => g.name.trim().toLowerCase() === bankKey)?.imageUrl?.trim() ?? ''
    const locationLabel = formatTopologyLabel(createTopology, topoRooms, topoFixtures, topoLevels)
    const inaseVariety = INASE_VARIETIES.find((v) => v.id === createInaseVarietyId) ?? null
    const inaseHarvestYearNum = Number(String(createInaseHarvestYear).trim())
    const newRow: PlantCardItem = {
      id,
      strain: strainName,
      quantity: qty,
      initialQuantity: createKind === 'lote' ? qty : 1,
      trackingType: createKind,
      seedType: createSeedType,
      seedComplianceType: createSeedType === 'Semilla' ? createSeedComplianceType : undefined,
      inaseVarietyId:
        createSeedType === 'Semilla' && createSeedComplianceType === 'certificada'
          ? inaseVariety?.id
          : undefined,
      inaseVarietyName:
        createSeedType === 'Semilla' && createSeedComplianceType === 'certificada'
          ? inaseVariety?.name
          : undefined,
      inaseProviderRncyfs:
        createSeedType === 'Semilla' && createSeedComplianceType === 'certificada'
          ? createInaseProviderRncyfs.trim() || undefined
          : undefined,
      inaseSecurityStamp:
        createSeedType === 'Semilla' && createSeedComplianceType === 'certificada'
          ? createInaseSecurityStamp.trim() || undefined
          : undefined,
      inaseHarvestYear:
        createSeedType === 'Semilla' && createSeedComplianceType === 'certificada' && Number.isFinite(inaseHarvestYearNum)
          ? Math.round(inaseHarvestYearNum)
          : undefined,
      inaseLabelPhotoDataUrl:
        createSeedType === 'Semilla' && createSeedComplianceType === 'certificada' && createInaseLabelPhotoDataUrl
          ? createInaseLabelPhotoDataUrl
          : undefined,
      geneticsType: createGeneticsType,
      growMode: createGrowMode,
      date: createDate,
      stageTag:
        activeTab === 'vegetacion'
          ? t('cultivoBoard.stageTagVeg')
          : activeTab === 'floracion'
            ? t('cultivoBoard.stageTagFlor')
            : t('cultivoBoard.stageTagProp'),
      stage: 'c1',
      location: locationLabel,
      topologyRoomId: createTopology.roomId,
      topologyFixtureId: createTopology.fixtureId,
      topologyLevelId: createTopology.levelId,
      imageUrl: bankImg,
      healthStatus: 'ok',
      ageDays: undefined,
      propagacionStartedAt: activeTab === 'propagacion' ? nowIsoDateTime() : undefined,
      motherPlantId:
        createSeedType === 'Clon' && createCloneOrigin === 'propio'
          ? createMotherRegistryId.trim() || undefined
          : undefined,
      cloneOrigin: createSeedType === 'Clon' ? createCloneOrigin || undefined : undefined,
      cloneExternalSource:
        createSeedType === 'Clon' && createCloneOrigin === 'externo'
          ? createCloneExternalSource.trim() || undefined
          : undefined,
      vegetacionStartDate: activeTab === 'vegetacion' ? createDate.trim() || localIsoDate() : undefined,
      vegetacionStartedAt: activeTab === 'vegetacion' ? nowIsoDateTime() : undefined,
      floracionStartedAt: activeTab === 'floracion' ? nowIsoDateTime() : undefined,
      floweringStartDate: activeTab === 'floracion' ? createDate.trim() || localIsoDate() : undefined,
      propagacionLog:
        activeTab === 'propagacion'
          ? [
              {
                id: `log-${Date.now()}`,
                at: nowIsoDateTime(),
                kind: 'system',
                systemKey: 'batch_created',
              },
            ]
          : undefined,
    }
    setCultivoBoard((prev) => ({ ...prev, [activeTab]: [newRow, ...prev[activeTab]] }))
    setCreateOpen(false)
  }

  const handleTransplantConfirm = (payload: TransplantModalConfirmPayload) => {
    if (!transferLot) return
    const sourceBatchId = transferLot.id
    const vegEntryIso = localIsoDate()
    const vegStartedAt = nowIsoDateTime()
    const vegPropagacionLog = appendStageTransitionLog(
      transferLot.propagacionLog,
      'moved_to_vegetacion',
      vegStartedAt,
    )
    if (payload.trackingMode === 'color') {
      const opt = BRACELET_COLOR_TRACKING_OPTIONS.find((o) => o.key === payload.colorKey)
      if (!opt) return
      const n = payload.healthyCount
      const locList = payload.plantLocations
      const normLocKey = (s: string) =>
        s.trim().replace(/^#/, '').replace(/\s+/g, '').toLowerCase()
      setCultivoBoard((prev) => {
        const nextProp = prev.propagacion.filter((x) => x.id !== transferLot.id)
        const addVeg: PlantCardItem[] = Array.from({ length: n }, (_, i) => {
          const displayNum = String(i + 1).padStart(2, '0')
          const tag = `${opt.emoji} ${opt.code}-${displayNum}`
          const loc =
            locList[i] ??
            locList.find((p) => normLocKey(p.braceletId) === normLocKey(tag))
          const locFields = loc
            ? {
                location: loc.locationLabel,
                topologyRoomId: loc.topologyRoomId,
                topologyFixtureId: loc.topologyFixtureId,
                topologyLevelId: loc.topologyLevelId,
              }
            : { location: '—' as const }
          return {
            ...transferLot,
            id: `veg-${sourceBatchId}-${opt.key}-${displayNum}`,
            braceletId: tag,
            colorTagKey: opt.key,
            sourceBatchId,
            quantity: 1,
            initialQuantity: 1,
            trackingType: 'planta' as const,
            propagacionLog: vegPropagacionLog,
            stage: 'c1',
            stageTag: t('cultivoBoard.stageTagVeg'),
            vegetacionStartDate: vegEntryIso,
            vegetacionStartedAt: vegStartedAt,
            ageDays: undefined,
            ...locFields,
          }
        })
        return {
          ...prev,
          propagacion: nextProp,
          vegetacion: [...addVeg, ...prev.vegetacion],
        }
      })
      recordCultivoTransplant({
        batchId: sourceBatchId,
        strain: transferLot.strain,
        transferredCount: n,
        lossCount: payload.lossCount,
        lossReasonCode: payload.lossReasonCode,
        lossReasonLabel: payload.lossReasonLabel,
        notes: payload.sessionNotes,
        trackingMode: 'color',
        colorTagLabel: opt.labelEtiqueta,
      })
      setTransferLotId(null)
      setActiveTab('vegetacion')
      return
    }

    const ids = payload.scannedBraceletIds
    const normLocKey = (s: string) =>
      s.trim().replace(/^#/, '').replace(/\s+/g, '').toLowerCase()
    const locByBracelet = new Map(
      payload.plantLocations.map((p) => [normLocKey(p.braceletId), p]),
    )
    setCultivoBoard((prev) => {
      const nextProp = prev.propagacion.filter((x) => x.id !== transferLot.id)
      const addVeg: PlantCardItem[] = ids.map((raw) => {
        const trimmed = raw.trim()
        const idCore = trimmed.replace(/^#/, '').replace(/\s+/g, '') || trimmed
        const braceletDisplay = trimmed.startsWith('#') ? trimmed : `#${idCore}`
        const loc =
          locByBracelet.get(normLocKey(trimmed)) ??
          locByBracelet.get(normLocKey(idCore))
        if (!loc) {
          return {
            ...transferLot,
            id: idCore,
            braceletId: braceletDisplay,
            sourceBatchId,
            quantity: 1,
            initialQuantity: 1,
            trackingType: 'planta' as const,
            propagacionLog: vegPropagacionLog,
            stage: 'c1',
            stageTag: t('cultivoBoard.stageTagVeg'),
            location: '—',
            vegetacionStartDate: vegEntryIso,
            vegetacionStartedAt: vegStartedAt,
            ageDays: undefined,
          }
        }
        return {
          ...transferLot,
          id: idCore,
          braceletId: braceletDisplay,
          sourceBatchId,
          quantity: 1,
          initialQuantity: 1,
          trackingType: 'planta' as const,
          propagacionLog: vegPropagacionLog,
          stage: 'c1',
          stageTag: t('cultivoBoard.stageTagVeg'),
          location: loc.locationLabel,
          topologyRoomId: loc.topologyRoomId,
          topologyFixtureId: loc.topologyFixtureId,
          topologyLevelId: loc.topologyLevelId,
          vegetacionStartDate: vegEntryIso,
          vegetacionStartedAt: vegStartedAt,
          ageDays: undefined,
        }
      })
      return {
        ...prev,
        propagacion: nextProp,
        vegetacion: [...addVeg, ...prev.vegetacion],
      }
    })
    recordCultivoTransplant({
      batchId: sourceBatchId,
      strain: transferLot.strain,
      transferredCount: ids.length,
      lossCount: payload.lossCount,
      lossReasonCode: payload.lossReasonCode,
      lossReasonLabel: payload.lossReasonLabel,
      notes: payload.sessionNotes,
      trackingMode: 'id',
    })
    setTransferLotId(null)
    setActiveTab('vegetacion')
  }

  return (
    <div className="min-h-0 w-full overflow-x-visible px-6 pb-8 pt-6 md:px-8 md:pb-10 md:pt-8">
        <header className="mb-6 flex flex-col gap-4 overflow-visible lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-[#f1f1f1]">
                {t('cultivoBoard.pageTitle')}
              </h1>
              <span className="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 dark:bg-[#2a2a2a] dark:text-[#a3a3a3]">
                {activeBadgeText}
              </span>
              {hasActiveFilters ? (
                <span className="text-xs text-gray-400 dark:text-[#8c8c8c]">
                  {t('cultivoBoard.filteredCountHint', { n: filteredItems.length })}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <SoftSelect
                value={strainFilter}
                onChange={setStrainFilter}
                options={strainFilterOptions}
                chipText={strainFilterChipText}
                icon={Filter}
                ariaLabel={t('cultivoBoard.filterStrainHelp')}
                borderless
              />
              <SoftSelect
                value={originFilter}
                onChange={setOriginFilter}
                options={[...originFilterOptions]}
                chipText={originFilterChipText}
                icon={MapPin}
                ariaLabel={t('cultivoBoard.originFilterLabel')}
                borderless
              />
            </div>
          </div>
          {activeTab !== 'cosecha' ? (
            <div className="flex min-w-0 shrink-0 justify-end self-end overflow-visible pr-0.5 lg:self-start">
              <button
                type="button"
                aria-label={addFabLabelText}
                title={addFabLabelText}
                aria-expanded={addFabOpen}
                onClick={() => setCreateOpen(true)}
                onMouseEnter={() => setAddFabOpen(true)}
                onMouseLeave={() => setAddFabOpen(false)}
                onFocus={() => setAddFabOpen(true)}
                onBlur={() => setAddFabOpen(false)}
                className={cn(
                  'relative flex h-14 shrink-0 cursor-pointer items-center overflow-hidden rounded-full text-sm font-semibold text-white',
                  addFabOpen ? 'justify-end' : 'justify-center',
                  'hover:brightness-110 active:brightness-95',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#181818]',
                )}
                style={{
                  width: addFabOpen ? addFabExpandedW : ADD_FAB_COLLAPSED_PX,
                  backgroundColor: CULTIVO_BRAND_GREEN,
                  transition: addFabMotionOk
                    ? 'width 420ms cubic-bezier(0.22, 1, 0.36, 1)'
                    : undefined,
                }}
              >
                <span
                  ref={addFabMeasureRef}
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 -z-10 flex w-max flex-row items-center gap-2 pl-5 pr-4 opacity-0"
                >
                  <span className="whitespace-nowrap">{addFabLabelText}</span>
                  <Plus className="h-6 w-6 shrink-0" strokeWidth={2.25} aria-hidden />
                </span>
                <span
                  className={cn(
                    'relative z-[1] flex h-full w-max shrink-0 flex-row items-center',
                    addFabOpen ? 'justify-end gap-2 pl-5 pr-4' : 'justify-center gap-0',
                  )}
                >
                  <span
                    className={cn(
                      'min-w-0 overflow-hidden whitespace-nowrap transition-[max-width] duration-300 ease-out',
                      addFabOpen ? 'max-w-[min(90vw,720px)]' : 'max-w-0',
                    )}
                    aria-hidden={!addFabOpen}
                  >
                    {addFabLabelText}
                  </span>
                  <Plus className="h-6 w-6 shrink-0" strokeWidth={2.25} aria-hidden />
                </span>
              </button>
            </div>
          ) : null}
        </header>

        <div className="relative mb-8 flex w-full rounded-full bg-green-50/60 p-1.5 shadow-inner backdrop-blur-md dark:bg-[#252525] dark:shadow-none dark:backdrop-blur-none">
          {(['propagacion', 'vegetacion', 'floracion', 'cosecha'] as BoardTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab)
                setDetailItemId(null)
              }}
              className={cx(
                'relative flex min-h-[42px] flex-1 items-center justify-center rounded-full px-4 py-2 text-sm transition-colors duration-200',
                activeTab === tab
                  ? 'font-semibold text-white'
                  : 'font-medium text-gray-500 hover:text-green-800 dark:text-[#9a9a9a] dark:hover:text-[#f1f1f1]',
              )}
            >
              {activeTab === tab ? (
                <motion.span
                  layoutId="cultivo-kanban-stage-pill"
                  className="pointer-events-none absolute inset-0 z-[1] rounded-full"
                  style={{ backgroundColor: CULTIVO_BRAND_GREEN }}
                  transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                  aria-hidden
                />
              ) : null}
              <span className="relative z-[2] inline-flex items-center justify-center gap-2">
                {tab === 'propagacion' ? <Sprout className="h-4 w-4 shrink-0" strokeWidth={2} /> : null}
                {tab === 'vegetacion' ? <Leaf className="h-4 w-4 shrink-0" strokeWidth={2} /> : null}
                {tab === 'floracion' ? <Flower2 className="h-4 w-4 shrink-0" strokeWidth={2} /> : null}
                {tab === 'cosecha' ? <Wheat className="h-4 w-4 shrink-0" strokeWidth={2} /> : null}
                {TAB_LABEL[tab]}
              </span>
            </button>
          ))}
        </div>

        <section className="space-y-3">
          {filteredItems.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white/60 px-4 py-8 text-center text-sm text-gray-500 dark:border-[#3d3d3d] dark:bg-[#252525] dark:text-[#a3a3a3]">
              {t('cultivoBoard.emptyFiltered')}
            </p>
          ) : null}
          {activeTab === 'propagacion'
            ? filteredItems.map((item) => (
                <PropagacionBatchCard
                  key={item.id}
                  item={item}
                  onOpenDetail={() => setDetailItemId(item.id)}
                  onMoveToVegetacion={() => {
                    setDetailItemId(null)
                    setTransferLotId(item.id)
                  }}
                  onEditRow={() => setEditItemId(item.id)}
                  onDeleteRow={() => deleteCultivoRow(item.id)}
                />
              ))
            : lateStageBatchGroups
              ? lateStageBatchGroups.map((batch) => {
                  const repId = batch[0]!.id
                  const activeIds = batch.filter((p) => p.cultivoUnitStatus !== 'baja').map((p) => p.id)
                  const rowVariant =
                    activeTab === 'vegetacion'
                      ? 'vegetacion'
                      : activeTab === 'cosecha'
                        ? 'cosecha'
                        : 'floracion'
                  return (
                    <CultivoLoteListRow
                      key={batchGroupKey(batch)}
                      variant={rowVariant}
                      plants={batch}
                      onOpenDetail={() => setDetailItemId(repId)}
                      onPrimaryAction={() => {
                        if (activeTab === 'vegetacion') {
                          openMoveToFlowerModal(repId)
                        } else if (activeTab === 'floracion' && activeIds.length > 0) {
                          setHarvestItemId(repId)
                          setHarvestBatchPlantIds(activeIds)
                        }
                      }}
                      onEditRow={() => setEditItemId(repId)}
                      onDeleteBatch={() => deleteCultivoBatch(batch.map((p) => p.id))}
                      onSplitLote={
                        activeTab === 'vegetacion' || activeTab === 'floracion'
                          ? () =>
                              setDividirLoteCtx({
                                batch,
                                tab: activeTab === 'vegetacion' ? 'vegetacion' : 'floracion',
                              })
                          : undefined
                      }
                    />
                  )
                })
              : null}
        </section>

        {activeTab === 'cosecha' ? (
          <div className="mt-8">
            <PostCosechaTab />
          </div>
        ) : null}

        {detailItem &&
        (activeTab === 'propagacion' ||
          activeTab === 'vegetacion' ||
          activeTab === 'floracion' ||
          activeTab === 'cosecha') ? (
          <PropagacionBatchDetailSlideover
            boardTab={activeTab}
            item={detailItem}
            open
            onClose={() => setDetailItemId(null)}
            onBracelet={
              activeTab === 'propagacion' ? () => setTransferLotId(detailItem.id) : undefined
            }
            onMoveToFloracion={
              activeTab === 'vegetacion'
                ? () => {
                    openMoveToFlowerModal(detailItem.id)
                    setDetailItemId(null)
                  }
                : undefined
            }
            onHarvest={
              activeTab === 'floracion'
                ? () => {
                    const peers = resolveVegPeerGroup(detailItem, board.floracion).filter(
                      (p) => p.cultivoUnitStatus !== 'baja',
                    )
                    setHarvestBatchPlantIds(peers.map((p) => p.id))
                    setHarvestItemId(detailItem.id)
                    setDetailItemId(null)
                  }
                : undefined
            }
            onEditRow={() => {
              setEditItemId(detailItem.id)
              setDetailItemId(null)
            }}
          />
        ) : null}

        {createOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/35 p-4 py-8"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setCreateOpen(false)
            }}
          >
            <div
              className={cn(
                'my-auto w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl',
                'border-white/70 bg-white/95',
                'dark:border-white/[0.10] dark:bg-[#1c1c1c]',
              )}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="scrollbar-modern scrollbar-modern-dark max-h-[min(92dvh,calc(100vh-2rem))] overflow-y-auto overscroll-contain p-5">
              <p className="text-lg font-semibold text-gray-900 dark:text-[#f1f1f1]">
                {t('cultivoBoard.createModalTitle')}
              </p>
              <div className="mt-3 space-y-3">
                <label className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                  {t('cultivoBoard.createChooseKind')}
                  <span className="text-red-500"> *</span>
                </label>
                <SoftSelect
                  value={createKind}
                  onChange={(next) => {
                    setCreateKind(next)
                    if (next === 'planta') {
                      setCreateQty('1')
                    } else {
                      setCreateQty((q) => {
                        const n = Number(String(q).trim().replace(',', '.'))
                        return Number.isFinite(n) && Number.isInteger(n) && n >= 2
                          ? String(n)
                          : '50'
                      })
                    }
                  }}
                  options={[...createKindOptions]}
                  chipText={
                    createKind === 'planta'
                      ? t('cultivoBoard.kindPlant')
                      : t('cultivoBoard.kindLot')
                  }
                  ariaLabel={t('cultivoBoard.createChooseKind')}
                  variant="field"
                />

                {createSeedType === 'Semilla' && createSeedComplianceType === 'certificada' ? (
                  <div className="min-w-0">
                    <label className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                      {t('cultivoBoard.originFilterLabel')}
                      <span className="text-red-500"> *</span>
                    </label>
                    <div className="mt-1">
                      <SoftSelect
                        value={createSeedType}
                        onChange={(v) => {
                          setCreateSeedType(v)
                          if (v === 'Semilla') {
                            setCreateSeedComplianceType('propia')
                            setCreateInaseVarietyId('')
                            setCreateInaseProviderRncyfs('')
                            setCreateInaseSecurityStamp('')
                            setCreateInaseHarvestYear('')
                            setCreateInaseLabelPhotoDataUrl(null)
                            if (createInaseLabelPhotoInputRef.current)
                              createInaseLabelPhotoInputRef.current.value = ''
                          }
                          setCreateCloneOrigin('')
                          setCreateMotherRegistryId('')
                          setCreateCloneExternalSource('')
                        }}
                        options={[...createSeedTypeOptions]}
                        chipText={
                          createSeedType === 'Semilla'
                            ? t('cultivoBoard.originSeedOption')
                            : t('cultivoBoard.originCloneOption')
                        }
                        ariaLabel={t('cultivoBoard.originFilterLabel')}
                        variant="field"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <label className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                      {t('cultivoBoard.originFilterLabel')}
                      <span className="text-red-500"> *</span>
                    </label>
                    <div className="mt-1">
                      <SoftSelect
                        value={createSeedType}
                        onChange={(v) => {
                          setCreateSeedType(v)
                          if (v === 'Semilla') {
                            setCreateSeedComplianceType('propia')
                            setCreateInaseVarietyId('')
                            setCreateInaseProviderRncyfs('')
                            setCreateInaseSecurityStamp('')
                            setCreateInaseHarvestYear('')
                            setCreateInaseLabelPhotoDataUrl(null)
                            if (createInaseLabelPhotoInputRef.current)
                              createInaseLabelPhotoInputRef.current.value = ''
                          }
                          setCreateCloneOrigin('')
                          setCreateMotherRegistryId('')
                          setCreateCloneExternalSource('')
                        }}
                        options={[...createSeedTypeOptions]}
                        chipText={
                          createSeedType === 'Semilla'
                            ? t('cultivoBoard.originSeedOption')
                            : t('cultivoBoard.originCloneOption')
                        }
                        ariaLabel={t('cultivoBoard.originFilterLabel')}
                        variant="field"
                      />
                    </div>
                  </div>
                )}
                {createSeedType === 'Clon' ? (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                        {t('cultivoBoard.cloneOriginLabel')}
                        <span className="text-red-500"> *</span>
                      </span>
                      <div className="mt-1">
                        <SoftSelect
                          value={createCloneOrigin}
                          onChange={(v) => {
                            const next = v as CloneOriginKind | ''
                            setCreateCloneOrigin(next)
                            if (next !== 'propio') setCreateMotherRegistryId('')
                            if (next !== 'externo') setCreateCloneExternalSource('')
                          }}
                          options={[
                            {
                              value: 'propio',
                              label: t('cultivoBoard.cloneOriginPropio'),
                            },
                            {
                              value: 'externo',
                              label: t('cultivoBoard.cloneOriginExterno'),
                            },
                          ]}
                          chipText={
                            createCloneOrigin === 'propio'
                              ? t('cultivoBoard.cloneOriginPropio')
                              : createCloneOrigin === 'externo'
                                ? t('cultivoBoard.cloneOriginExterno')
                                : t('cultivoBoard.cloneOriginPick')
                          }
                          chipClassName={!createCloneOrigin ? 'text-gray-400' : undefined}
                          ariaLabel={t('cultivoBoard.cloneOriginLabel')}
                          variant="field"
                        />
                      </div>
                    </label>
                    {createCloneOrigin === 'propio' ? (
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                          {t('cultivoBoard.motherIdLabel')}
                          <span className="text-red-500"> *</span>
                        </label>
                        <div className="mt-1">
                          <MotherPlantSearchSelect
                            plants={plantsRegistry}
                            rooms={cultivationRooms}
                            value={createMotherRegistryId}
                            onChange={setCreateMotherRegistryId}
                            placeholder={t('cultivoBoard.motherSearchPh')}
                            emptyHint={t('cultivoBoard.motherSearchEmpty')}
                          />
                        </div>
                      </div>
                    ) : null}
                    {createCloneOrigin === 'externo' ? (
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                          {t('cultivoBoard.cloneExternalSourceLabel')}
                        </label>
                        <input
                          type="text"
                          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:placeholder:text-[#8c8c8c]"
                          value={createCloneExternalSource}
                          onChange={(e) => setCreateCloneExternalSource(e.target.value)}
                          placeholder={t('cultivoBoard.cloneExternalSourcePh')}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {createSeedType === 'Semilla' ? (
                  <div className="space-y-2">
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                        {t('cultivoBoard.seedComplianceTypeLabel')}
                        <span className="text-red-500"> *</span>
                      </span>
                      <div className="mt-1">
                        <SoftSelect
                          value={createSeedComplianceType}
                          onChange={(v) => {
                            const next = (v === 'certificada' ? 'certificada' : 'propia') as
                              | 'certificada'
                              | 'propia'
                            setCreateSeedComplianceType(next)
                            if (next !== 'certificada') {
                              setCreateInaseVarietyId('')
                              setCreateInaseProviderRncyfs('')
                              setCreateInaseSecurityStamp('')
                              setCreateInaseHarvestYear('')
                              setCreateInaseLabelPhotoDataUrl(null)
                              if (createInaseLabelPhotoInputRef.current)
                                createInaseLabelPhotoInputRef.current.value = ''
                            }
                          }}
                          options={[
                            { value: 'certificada', label: t('cultivoBoard.seedCertifiedTitle') },
                            { value: 'propia', label: t('cultivoBoard.seedOwnTitle') },
                          ]}
                          chipText={
                            createSeedComplianceType === 'certificada'
                              ? t('cultivoBoard.seedCertifiedTitle')
                              : t('cultivoBoard.seedOwnTitle')
                          }
                          ariaLabel={t('cultivoBoard.seedComplianceTypeLabel')}
                          variant="field"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-gray-600 dark:text-[#8c8c8c]">
                        {createSeedComplianceType === 'certificada'
                          ? t('cultivoBoard.seedCertifiedHint')
                          : t('cultivoBoard.seedOwnHint')}
                      </p>
                    </label>

                    {createSeedComplianceType === 'certificada' ? (
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                            {t('cultivoBoard.inaseVarietyLabel')}
                            <span className="text-red-500"> *</span>
                          </span>
                          <div className="mt-1">
                            <SoftSelect
                              value={createInaseVarietyId}
                              onChange={(v) => {
                                const next = String(v ?? '')
                                setCreateInaseVarietyId(next)
                                const row = INASE_VARIETIES.find((x) => x.id === next)
                                setCreateStrain(row?.name ?? '')
                              }}
                              options={INASE_VARIETIES.map((v) => ({
                                value: v.id,
                                label: `${v.id} / ${v.name}`,
                              }))}
                              chipText={
                                INASE_VARIETIES.find((x) => x.id === createInaseVarietyId)
                                  ? `${createInaseVarietyId} / ${INASE_VARIETIES.find((x) => x.id === createInaseVarietyId)!.name}`
                                  : t('cultivoBoard.inasePickVariety')
                              }
                              chipClassName={!createInaseVarietyId ? 'text-gray-400' : undefined}
                              ariaLabel={t('cultivoBoard.inaseVarietyLabel')}
                              variant="field"
                            />
                          </div>
                        </label>

                        <div className="min-w-0">
                          <label className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                            {t('cultivoBoard.quantity')}
                            <span className="text-red-500"> *</span>
                          </label>
                          <input
                            type="number"
                            min={createKind === 'lote' ? 2 : 1}
                            max={99999}
                            step={1}
                            inputMode="numeric"
                            className={cn(
                              'mt-1 box-border min-h-[42px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]',
                              INPUT_NO_NUMBER_SPINNER,
                              createKind === 'planta' &&
                                'cursor-not-allowed opacity-60',
                            )}
                            value={createQty}
                            onChange={(e) => setCreateQty(e.target.value)}
                            placeholder={t('cultivoBoard.qtyPh')}
                            disabled={createKind === 'planta'}
                            aria-label={t('cultivoBoard.quantity')}
                          />
                        </div>

                        <label className="block">
                          <span className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                            {t('cultivoBoard.inaseProviderRncyfsLabel')}
                            <span className="text-red-500"> *</span>
                          </span>
                          <input
                            type="text"
                            className={cn(
                              'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
                              'dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:placeholder:text-[#8c8c8c]',
                            )}
                            value={createInaseProviderRncyfs}
                            onChange={(e) => setCreateInaseProviderRncyfs(e.target.value)}
                            placeholder={t('cultivoBoard.inaseProviderRncyfsPh')}
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                            {t('cultivoBoard.inaseSecurityStampLabel')}
                            <span className="text-red-500"> *</span>
                          </span>
                          <input
                            type="text"
                            className={cn(
                              'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
                              'dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:placeholder:text-[#8c8c8c]',
                            )}
                            value={createInaseSecurityStamp}
                            onChange={(e) => setCreateInaseSecurityStamp(e.target.value)}
                            placeholder={t('cultivoBoard.inaseSecurityStampPh')}
                          />
                        </label>

                        <div className="grid grid-cols-1 gap-2">
                          <label className="block">
                            <span className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                              {t('cultivoBoard.inaseHarvestYearLabel')}
                              <span className="text-red-500"> *</span>
                            </span>
                            <input
                              type="number"
                              min={1900}
                              max={2100}
                              step={1}
                              inputMode="numeric"
                              className={cn(
                                'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900',
                                'dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]',
                                INPUT_NO_NUMBER_SPINNER,
                              )}
                              value={createInaseHarvestYear}
                              onChange={(e) => setCreateInaseHarvestYear(e.target.value)}
                              placeholder="2024"
                            />
                          </label>
                        </div>

                        <p className="text-[11px] text-gray-600 dark:text-[#8c8c8c]">
                          {t('cultivoBoard.inaseInlineHint')}
                        </p>
                      </div>
                    ) : null}

                    {createSeedComplianceType === 'propia' ? (
                      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/40 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/25">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 dark:bg-emerald-500/15">
                          <Shield
                            className="h-4 w-4 text-emerald-700 dark:text-emerald-300"
                            strokeWidth={2}
                            aria-hidden
                          />
                        </span>
                        <p className="text-xs leading-snug text-emerald-900/90 dark:text-emerald-100/90">
                          {t('cultivoBoard.complianceNotice', {
                            strain: createStrain.trim() || '—',
                          })}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {createSeedType === 'Semilla' && createSeedComplianceType === 'certificada' ? null : (
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                      {t('cultivoBoard.strainLabel')}
                      <span className="text-red-500"> *</span>
                    </label>
                    <StrainAutocomplete
                      tenantId={tenantId}
                      value={createStrain}
                      onChange={setCreateStrain}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:placeholder:text-[#8c8c8c]"
                      placeholder={t('cultivoBoard.strainPh')}
                      onSelectRow={() => {
                        if (createKind === 'planta') setCreateQty('1')
                      }}
                    />
                    <div className="min-w-0">
                      <label className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                        {t('cultivoBoard.quantity')}
                        <span className="text-red-500"> *</span>
                      </label>
                      <input
                        type="number"
                        min={createKind === 'lote' ? 2 : 1}
                        max={99999}
                        step={1}
                        inputMode="numeric"
                        className={cn(
                          'mt-1 box-border min-h-[42px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]',
                          INPUT_NO_NUMBER_SPINNER,
                          createKind === 'planta' &&
                            'cursor-not-allowed opacity-60',
                        )}
                        value={createQty}
                        onChange={(e) => setCreateQty(e.target.value)}
                        placeholder={t('cultivoBoard.qtyPh')}
                        disabled={createKind === 'planta'}
                        aria-label={t('cultivoBoard.quantity')}
                      />
                    </div>
                  </div>
                )}
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                    {t('cultivoBoard.geneticsType')}
                    <span className="text-red-500"> *</span>
                  </span>
                  <div className="mt-1">
                    <SoftSelect
                      value={createGeneticsType}
                      onChange={(v) => setCreateGeneticsType(v as GeneticsType)}
                      options={createGeneticsOptions}
                      chipText={t(
                        `geneticsTypeOption.${createGeneticsType}` as 'geneticsTypeOption.fotoperiodica',
                      )}
                      ariaLabel={t('cultivoBoard.geneticsType')}
                      variant="field"
                    />
                  </div>
                </label>
                {createSeedType === 'Semilla' && createSeedComplianceType === 'certificada' ? (
                  <div className="rounded-xl border border-gray-200/70 bg-white/40 px-3 py-2.5 dark:border-[#3d3d3d] dark:bg-white/[0.03]">
                    <input
                      ref={createInaseLabelPhotoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => {
                        const input = e.target
                        const file = input.files?.[0]
                        if (!file) return
                        if (!file.type.startsWith('image/')) {
                          input.value = ''
                          return
                        }
                        void (async () => {
                          const url = await compressImageFileToDataUrl(file)
                          if (!url) {
                            window.alert(t('cultivoBoard.inaseLabelPhotoTooLarge'))
                            input.value = ''
                            return
                          }
                          setCreateInaseLabelPhotoDataUrl(url)
                        })().catch(() => {
                          window.alert(t('cultivoBoard.inaseLabelPhotoReadError'))
                          input.value = ''
                        })
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => createInaseLabelPhotoInputRef.current?.click()}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-800 hover:bg-gray-50 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#e8e8e8] dark:hover:bg-white/[0.06]"
                      >
                        {t('cultivoBoard.inaseLabelPhotoAttach')}
                      </button>
                      {createInaseLabelPhotoDataUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCreateInaseLabelPhotoDataUrl(null)
                            if (createInaseLabelPhotoInputRef.current)
                              createInaseLabelPhotoInputRef.current.value = ''
                          }}
                          className="text-[11px] font-medium text-gray-600 underline-offset-2 hover:underline dark:text-[#a3a3a3]"
                        >
                          {t('cultivoBoard.inaseLabelPhotoRemove')}
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[11px] leading-snug text-gray-600 dark:text-[#8c8c8c]">
                      {t('cultivoBoard.inaseLabelPhotoHint')}
                    </p>
                    {createInaseLabelPhotoDataUrl ? (
                      <div className="mt-2 flex items-center gap-2">
                        <img
                          src={createInaseLabelPhotoDataUrl}
                          alt=""
                          className="h-14 w-14 rounded-lg border border-gray-200 object-cover dark:border-[#3d3d3d]"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                    {t('cultivoBoard.growModeLabel')}
                    <span className="text-red-500"> *</span>
                  </span>
                  <div className="mt-1">
                    <SoftSelect
                      value={createGrowMode}
                      onChange={(v) => setCreateGrowMode(v as 'indoor' | 'outdoor')}
                      options={[
                        { value: 'indoor', label: t('cultivoBoard.growIndoor') },
                        { value: 'outdoor', label: t('cultivoBoard.growOutdoor') },
                      ]}
                      chipText={
                        createGrowMode === 'outdoor'
                          ? t('cultivoBoard.growOutdoor')
                          : t('cultivoBoard.growIndoor')
                      }
                      ariaLabel={t('cultivoBoard.growModeLabel')}
                      variant="field"
                    />
                  </div>
                </label>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-[#a3a3a3]">
                    {t('cultivoBoard.createStartDateLabel')}
                    <span className="text-red-500"> *</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="date"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-3 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-0 dark:[&::-webkit-calendar-picker-indicator]:invert"
                      value={createDate}
                      onChange={(e) => setCreateDate(e.target.value)}
                      aria-label={t('cultivoBoard.createStartDateLabel')}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                  <p className="text-xs font-semibold text-emerald-900">
                    {t('cultivoBoard.createTopologyTitle')}
                  </p>
                  <p className="mt-0.5 text-[11px] text-emerald-800/80">
                    {t('cultivoBoard.createTopologyHint')}
                  </p>
                  <div className="mt-2">
                    <LocationSelector
                      companyId={tenantId}
                      value={createTopology}
                      onChange={(v) => {
                        setCreateTopology(v)
                        if (v?.roomId) setCreateTopologyError(false)
                      }}
                      labels={createFormTopologyLabels}
                      excludeRoomPurposes={CREATE_LOT_EXCLUDED_ROOM_TYPES}
                      hideRoomPlaceholderOption
                      showEmptyRoomHighlight={false}
                      dimEmptyRoomChip
                    />
                  </div>
                </div>
                {createTopologyError ? (
                  <motion.div
                    key={createFillBannerShakeKey}
                    role="alert"
                    initial={{ x: 0 }}
                    animate={{ x: [0, -10, 10, -8, 8, -5, 5, 0] }}
                    transition={{ duration: 0.48, ease: 'easeInOut' }}
                    className="flex items-start gap-3 rounded-2xl border border-red-200/50 bg-red-50/75 px-4 py-3 text-sm leading-snug text-red-900/90 backdrop-blur-md dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-100/95"
                  >
                    <AlertCircle
                      className="mt-0.5 h-[18px] w-[18px] shrink-0 text-red-500/85 dark:text-red-400/90"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span>{t('cultivoBoard.createFillAllFields')}</span>
                  </motion.div>
                ) : null}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 dark:border-[#3d3d3d] dark:text-[#e8e8e8] dark:hover:bg-white/[0.06]"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={createLot}
                  className="rounded-xl bg-green-700 px-3 py-2 text-sm font-medium text-white"
                >
                  {t('cultivoBoard.create')}
                </button>
              </div>
              </div>
            </div>
          </div>
        ) : null}

        <TransplantModal
          open={Boolean(transferLotId && transferLot)}
          batch={transferLot}
          onClose={() => setTransferLotId(null)}
          onConfirm={handleTransplantConfirm}
          companyId={tenantId}
          topologySelection={transplantTopology}
          onTopologyChange={setTransplantTopology}
        />

        <MoveToFlowerModal
          open={Boolean(moveFlowerAnchorId && moveFlowerPeers.length > 0)}
          peerGroup={moveFlowerPeers}
          companyId={tenantId}
          onClose={() => setMoveFlowerAnchorId(null)}
          onConfirm={handleMoveToFlowerConfirm}
        />

        <EditCultivoItemModal
          open={Boolean(editItemId && editItem)}
          tab={activeTab}
          item={editItem}
          companyId={tenantId}
          stageTitles={stageTitleMap}
          onClose={() => setEditItemId(null)}
          onSave={saveEditedCultivoItem}
        />

        <HarvestModal
          open={Boolean(harvestItemId && harvestItem)}
          item={harvestItem}
          batchPlantTotal={
            harvestBatchPlantIds && harvestBatchPlantIds.length > 1
              ? harvestBatchPlantIds.length
              : undefined
          }
          onClose={() => {
            setHarvestItemId(null)
            setHarvestBatchPlantIds(null)
          }}
          onConfirm={confirmHarvest}
        />

        <DividirLoteModal
          open={Boolean(dividirLoteCtx)}
          plants={dividirLoteCtx?.batch ?? []}
          companyId={tenantId}
          onClose={() => setDividirLoteCtx(null)}
          onConfirm={confirmDividirLote}
        />
    </div>
  )
}

