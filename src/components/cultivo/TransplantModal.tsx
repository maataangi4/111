import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Info, Palette, ScanLine, X } from 'lucide-react'
import { BraceletCameraModal } from './BraceletCameraModal'
import { formatTopologyLabel } from '../../lib/locationTopologyFormat'
import { LocationSelector } from '../location/LocationSelector'
import {
  BRACELET_COLOR_TRACKING_OPTIONS,
  TRANSPLANT_LOSS_REASONS,
  type BraceletColorTagKey,
  type PlantCardItem,
  type TransplantLossReasonCode,
  type TransplantTrackingMode,
} from '../../store/cultivationTypes'
import type { TopologySelection } from '../../store/locationTopologyTypes'
import { useLocationTopologyStore } from '../../store/useLocationTopologyStore'
import { cn } from '../../lib/cn'
import { propagacionAliveCount } from '../../lib/cultivo/propagacionCounts'
import { useTranslation } from '../../i18n/useTranslation'
import { SoftSelect } from '../ui/SoftSelect'

/** Как `tabActiveTone` в CultivoTab: активная «пилюля» для режима маркировки. */
const TRACKING_TAB_ACTIVE: Record<TransplantTrackingMode, string> = {
  id: 'bg-white text-green-700 shadow-[0_4px_12px_-2px_rgba(34,197,94,0.2)] dark:bg-[#2a2a2a] dark:text-green-300 dark:shadow-[0_4px_12px_-2px_rgba(34,197,94,0.12)]',
  color:
    'bg-white text-purple-700 shadow-[0_4px_12px_-2px_rgba(168,85,247,0.2)] dark:bg-[#2a2a2a] dark:text-purple-300 dark:shadow-[0_4px_12px_-2px_rgba(168,85,247,0.12)]',
}

/** Устарело: ID теперь только из сканирования. Оставлено для совместимости при необходимости. */
export function buildVegetacionBraceletIds(batchId: string, count: number): string[] {
  const slug = batchId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'BATCH'
  return Array.from(
    { length: count },
    (_, i) => `${slug}-V-${String(i + 1).padStart(3, '0')}`,
  )
}

function normalizeBraceletKey(raw: string): string {
  return raw.trim().replace(/^#/, '').toLowerCase()
}

function formatBraceletDisplay(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  return t.startsWith('#') ? t : `#${t}`
}

export type TransplantPlantLocation = {
  braceletId: string
  topologyRoomId: string
  topologyFixtureId?: string
  topologyLevelId?: string
  locationLabel: string
}

export type TransplantModalConfirmPayload =
  | {
      trackingMode: 'id'
      /** ID браслетов в порядке сканирования. */
      scannedBraceletIds: string[]
      /** Локация по каждому отсканированному ID (шаг 2). */
      plantLocations: TransplantPlantLocation[]
      lossCount: number
      lossReasonCode?: TransplantLossReasonCode
      lossReasonLabel?: string
      sessionNotes?: string
    }
  | {
      trackingMode: 'color'
      healthyCount: number
      colorKey: BraceletColorTagKey
      /** Локация по каждой метке группы (шаг 2), порядок = порядок plantas. */
      plantLocations: TransplantPlantLocation[]
      lossCount: number
      lossReasonCode?: TransplantLossReasonCode
      lossReasonLabel?: string
      sessionNotes?: string
    }

type ModalPhase = 'scan' | 'loss' | 'assign'
type ColorFormPhase = 'form' | 'assign'

type AssignedTopology = {
  topologyRoomId: string
  topologyFixtureId?: string
  topologyLevelId?: string
  locationLabel: string
}

type ScannedAssignRow = {
  displayId: string
  key: string
  assigned: AssignedTopology | null
}

function isAssignRowLocked(r: ScannedAssignRow): boolean {
  return Boolean(r.assigned?.topologyRoomId?.trim())
}

type TransplantModalProps = {
  open: boolean
  batch: PlantCardItem | null
  onClose: () => void
  onConfirm: (payload: TransplantModalConfirmPayload) => void
  companyId: string
  topologySelection: TopologySelection | null
  onTopologyChange: (next: TopologySelection | null) => void
}

const COLOR_SWATCH: Record<BraceletColorTagKey, string> = {
  red: 'bg-red-600',
  blue: 'bg-blue-700',
  green: 'bg-emerald-700',
  yellow: 'bg-amber-400',
  white: 'border-2 border-neutral-300 bg-white dark:border-neutral-500 dark:bg-[#3a3a3a]',
  black: 'bg-neutral-900',
}

export function TransplantModal({
  open,
  batch,
  onClose,
  onConfirm,
  companyId,
  topologySelection: _topologySelection,
  onTopologyChange: _onTopologyChange,
}: TransplantModalProps) {
  const { t } = useTranslation()
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

  const lossReasonOptions = useMemo(
    () => [
      { value: '' as string, label: t('transplant.pickReason') },
      ...TRANSPLANT_LOSS_REASONS.map((r) => ({
        value: r.code as string,
        label: t(`transplantLoss.${r.code}` as 'transplantLoss.rejection'),
      })),
    ],
    [t],
  )
  const topoRooms = useLocationTopologyStore((s) => s.rooms)
  const topoFixtures = useLocationTopologyStore((s) => s.fixtures)
  const topoLevels = useLocationTopologyStore((s) => s.levels)
  /** Vivos en germinación (tras descartes en Diario); en otras etapas coincide con la tarjeta. */
  const available = useMemo(() => {
    if (!batch) return 0
    return Math.max(0, propagacionAliveCount(batch))
  }, [batch])

  const [trackingMode, setTrackingMode] = useState<TransplantTrackingMode>('id')
  const [phase, setPhase] = useState<ModalPhase>('scan')
  const [scannedIds, setScannedIds] = useState<string[]>([])
  const scannedIdsRef = useRef<string[]>([])
  scannedIdsRef.current = scannedIds
  const [inputValue, setInputValue] = useState('')
  const [lossReasonCode, setLossReasonCode] = useState<'' | TransplantLossReasonCode>('')
  const lossReasonChipText =
    lossReasonCode === ''
      ? t('transplant.pickReason')
      : t(`transplantLoss.${lossReasonCode}` as 'transplantLoss.rejection')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [sessionComment, setSessionComment] = useState('')
  const [colorHealthyStr, setColorHealthyStr] = useState('')
  const [colorKey, setColorKey] = useState<BraceletColorTagKey | null>(null)
  const [colorPhase, setColorPhase] = useState<ColorFormPhase>('form')

  const [assignRows, setAssignRows] = useState<ScannedAssignRow[]>([])
  const [assignSelectedKeys, setAssignSelectedKeys] = useState<Set<string>>(() => new Set())
  const [bulkTopology, setBulkTopology] = useState<TopologySelection | null>(null)
  const [quantityPickStr, setQuantityPickStr] = useState('')
  const assignSelectAllRef = useRef<HTMLInputElement>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const resetWizard = useCallback(() => {
    setTrackingMode('id')
    setPhase('scan')
    setScannedIds([])
    setInputValue('')
    setLossReasonCode('')
    setCameraOpen(false)
    setSessionComment('')
    setColorHealthyStr('')
    setColorKey(null)
    setColorPhase('form')
    setAssignRows([])
    setAssignSelectedKeys(new Set())
    setBulkTopology(null)
    setQuantityPickStr('')
  }, [])

  const handleTrackingModeChange = (mode: TransplantTrackingMode) => {
    setTrackingMode(mode)
    setLossReasonCode('')
    if (mode === 'id') {
      setColorHealthyStr('')
      setColorKey(null)
      setColorPhase('form')
      setPhase('scan')
      setAssignRows([])
      setAssignSelectedKeys(new Set())
      setBulkTopology(null)
    } else {
      setPhase('scan')
      setScannedIds([])
      setInputValue('')
      setCameraOpen(false)
      setColorPhase('form')
      setAssignRows([])
      setAssignSelectedKeys(new Set())
      setBulkTopology(null)
    }
  }

  useEffect(() => {
    if (open && batch) {
      resetWizard()
    }
  }, [open, batch?.id, resetWizard])

  useEffect(() => {
    if (open && trackingMode === 'id' && phase === 'scan') {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50)
      return () => window.clearTimeout(t)
    }
  }, [open, trackingMode, phase, scannedIds.length])

  const addScanFromRaw = useCallback((rawInput: string) => {
    const raw = rawInput.trim()
    if (!raw) return false
    const key = normalizeBraceletKey(raw)
    if (!key) return false

    const prev = scannedIdsRef.current
    if (prev.length >= available) return false
    const existingKeys = new Set(prev.map((p) => normalizeBraceletKey(p)))
    if (existingKeys.has(key)) return false

    const display = formatBraceletDisplay(raw)
    setScannedIds((p) => {
      if (p.length >= available) return p
      const ks = new Set(p.map((x) => normalizeBraceletKey(x)))
      if (ks.has(key)) return p
      return [...p, display]
    })
    scannedIdsRef.current = [...prev, display]
    return true
  }, [available])

  const addScan = useCallback(() => {
    if (!addScanFromRaw(inputValue)) return
    setInputValue('')
  }, [addScanFromRaw, inputValue])

  const removeScannedAt = useCallback((index: number) => {
    setScannedIds((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const scannedCount = scannedIds.length
  const lossCount = Math.max(0, available - scannedCount)
  const isPerfectReconcile = scannedCount === available

  const sessionNotesPayload = sessionComment.trim() || undefined

  const colorHealthyParsed = useMemo(() => {
    const n = Number.parseInt(colorHealthyStr.replace(/\s/g, ''), 10)
    if (!Number.isFinite(n)) return null
    return n
  }, [colorHealthyStr])

  const colorLossCount =
    colorHealthyParsed != null
      ? Math.max(0, available - colorHealthyParsed)
      : null

  const colorHealthyValid =
    colorHealthyParsed != null &&
    colorHealthyParsed >= 1 &&
    colorHealthyParsed <= available

  const canSubmitColor =
    colorHealthyValid &&
    colorKey != null &&
    (colorLossCount === 0 || lossReasonCode !== '')

  const selectedColorMeta = useMemo(
    () => (colorKey ? BRACELET_COLOR_TRACKING_OPTIONS.find((o) => o.key === colorKey) : undefined),
    [colorKey],
  )

  const showAssignStep =
    (trackingMode === 'id' && phase === 'assign') ||
    (trackingMode === 'color' && colorPhase === 'assign')

  const initAssignRows = useCallback(() => {
    setQuantityPickStr('')
    setAssignRows(
      scannedIds.map((id) => ({
        displayId: id,
        key: normalizeBraceletKey(id),
        assigned: null,
      })),
    )
    setAssignSelectedKeys(new Set())
    setBulkTopology(null)
  }, [scannedIds])

  const leaveAssignPhase = useCallback(() => {
    setAssignRows([])
    setAssignSelectedKeys(new Set())
    setBulkTopology(null)
    setQuantityPickStr('')
    if (trackingMode === 'color') {
      setColorPhase('form')
    } else {
      setPhase(lossCount > 0 ? 'loss' : 'scan')
    }
  }, [lossCount, trackingMode])

  const continueColorToAssign = useCallback(() => {
    if (!canSubmitColor || colorHealthyParsed == null || !colorKey) return
    const opt = BRACELET_COLOR_TRACKING_OPTIONS.find((o) => o.key === colorKey)
    if (!opt) return
    const n = colorHealthyParsed
    setQuantityPickStr('')
    setAssignRows(
      Array.from({ length: n }, (_, i) => {
        const displayNum = String(i + 1).padStart(2, '0')
        const tag = `${opt.code}-${displayNum}`
        return {
          displayId: tag,
          key: `color-${i}-${normalizeBraceletKey(tag)}`,
          assigned: null,
        }
      }),
    )
    setAssignSelectedKeys(new Set())
    setBulkTopology(null)
    setColorPhase('assign')
  }, [canSubmitColor, colorHealthyParsed, colorKey])

  const handleFinishRegistration = useCallback(() => {
    if (scannedCount === 0) return
    setLossReasonCode('')
    if (lossCount > 0) {
      setPhase('loss')
    } else {
      initAssignRows()
      setPhase('assign')
    }
  }, [scannedCount, lossCount, initAssignRows])

  const continueFromLossToAssign = useCallback(() => {
    if (lossCount > 0 && lossReasonCode === '') return
    initAssignRows()
    setPhase('assign')
  }, [lossCount, lossReasonCode, initAssignRows])

  const assignAllPlaced = useMemo(
    () =>
      assignRows.length > 0 &&
      assignRows.every((r) => Boolean(r.assigned?.topologyRoomId)),
    [assignRows],
  )

  const unassignedRows = useMemo(
    () => assignRows.filter((r) => !isAssignRowLocked(r)),
    [assignRows],
  )

  const assignedCount = assignRows.length - unassignedRows.length

  const assignedRowsList = useMemo(
    () => assignRows.filter((r) => isAssignRowLocked(r)),
    [assignRows],
  )

  const assignedByLocation = useMemo(() => {
    const m = new Map<string, ScannedAssignRow[]>()
    for (const r of assignedRowsList) {
      const lab = r.assigned!.locationLabel
      const arr = m.get(lab) ?? []
      arr.push(r)
      m.set(lab, arr)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [assignedRowsList])

  const selectionSig = useMemo(
    () => [...assignSelectedKeys].sort().join('|'),
    [assignSelectedKeys],
  )

  const assignSelectionPrevSigRef = useRef<string | null>(null)
  useEffect(() => {
    if (!showAssignStep) {
      assignSelectionPrevSigRef.current = null
      return
    }
    const prev = assignSelectionPrevSigRef.current
    assignSelectionPrevSigRef.current = selectionSig
    if (prev !== null && prev !== selectionSig) {
      setBulkTopology(null)
    }
  }, [showAssignStep, selectionSig])

  const allRemainingSelected = useMemo(
    () =>
      unassignedRows.length > 0 &&
      unassignedRows.every((r) => assignSelectedKeys.has(r.key)),
    [unassignedRows, assignSelectedKeys],
  )

  const bulkHasSelection = useMemo(
    () => assignRows.some((r) => assignSelectedKeys.has(r.key) && !isAssignRowLocked(r)),
    [assignRows, assignSelectedKeys],
  )

  useEffect(() => {
    const el = assignSelectAllRef.current
    if (!el) return
    const un = assignRows.filter((r) => !isAssignRowLocked(r))
    const sel = un.filter((r) => assignSelectedKeys.has(r.key)).length
    el.indeterminate = sel > 0 && sel < un.length
  }, [assignRows, assignSelectedKeys])

  const toggleAssignSelectAll = () => {
    if (unassignedRows.length === 0) return
    if (allRemainingSelected) {
      setAssignSelectedKeys((prev) => {
        const next = new Set(prev)
        for (const r of unassignedRows) next.delete(r.key)
        return next
      })
    } else {
      setAssignSelectedKeys((prev) => {
        const next = new Set(prev)
        for (const r of unassignedRows) next.add(r.key)
        return next
      })
    }
  }

  const toggleAssignRowKey = (key: string, locked: boolean) => {
    if (locked) return
    setAssignSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectFirstNUnassigned = () => {
    const n = Math.floor(Number(quantityPickStr.replace(',', '.').trim()) || 0)
    if (!Number.isFinite(n) || n < 1) return
    const un = assignRows.filter((r) => !isAssignRowLocked(r))
    const take = Math.min(n, un.length)
    setAssignSelectedKeys(new Set(un.slice(0, take).map((r) => r.key)))
  }

  const applyBulkAssign = () => {
    if (!bulkTopology?.roomId) return
    const hasTarget = assignRows.some(
      (r) => assignSelectedKeys.has(r.key) && !isAssignRowLocked(r),
    )
    if (!hasTarget) return
    const locationLabel = formatTopologyLabel(
      bulkTopology,
      topoRooms,
      topoFixtures,
      topoLevels,
    )
    const assigned: AssignedTopology = {
      topologyRoomId: bulkTopology.roomId,
      topologyFixtureId: bulkTopology.fixtureId,
      topologyLevelId: bulkTopology.levelId,
      locationLabel,
    }
    setAssignRows((rows) =>
      rows.map((r) =>
        assignSelectedKeys.has(r.key) && !isAssignRowLocked(r) ? { ...r, assigned } : r,
      ),
    )
    setAssignSelectedKeys(new Set())
  }

  const handleFinalConfirm = () => {
    if (!batch) return
    if (trackingMode === 'color') {
      if (colorPhase !== 'assign' || !assignAllPlaced) return
      if (!canSubmitColor || colorHealthyParsed == null || !colorKey) return
      if (colorLossCount != null && colorLossCount > 0 && lossReasonCode === '') return
      const reasonLabel = lossReasonCode
        ? t(`transplantLoss.${lossReasonCode}` as 'transplantLoss.rejection')
        : undefined
      const plantLocations: TransplantPlantLocation[] = assignRows.map((r) => ({
        braceletId: r.displayId.trim(),
        topologyRoomId: r.assigned!.topologyRoomId,
        topologyFixtureId: r.assigned!.topologyFixtureId,
        topologyLevelId: r.assigned!.topologyLevelId,
        locationLabel: r.assigned!.locationLabel,
      }))
      onConfirm({
        trackingMode: 'color',
        healthyCount: colorHealthyParsed,
        colorKey,
        plantLocations,
        lossCount: colorLossCount ?? 0,
        lossReasonCode:
          colorLossCount != null && colorLossCount > 0 ? lossReasonCode || undefined : undefined,
        lossReasonLabel:
          colorLossCount != null && colorLossCount > 0 ? reasonLabel : undefined,
        sessionNotes: sessionNotesPayload,
      })
      return
    }

    if (phase !== 'assign' || !assignAllPlaced) return
    if (lossCount > 0 && lossReasonCode === '') return
    const reasonLabel = lossReasonCode
      ? t(`transplantLoss.${lossReasonCode}` as 'transplantLoss.rejection')
      : undefined
    const plantLocations: TransplantPlantLocation[] = assignRows.map((r) => ({
      braceletId: r.displayId.trim(),
      topologyRoomId: r.assigned!.topologyRoomId,
      topologyFixtureId: r.assigned!.topologyFixtureId,
      topologyLevelId: r.assigned!.topologyLevelId,
      locationLabel: r.assigned!.locationLabel,
    }))
    onConfirm({
      trackingMode: 'id',
      scannedBraceletIds: assignRows.map((r) => r.displayId.trim()),
      plantLocations,
      lossCount,
      lossReasonCode: lossCount > 0 ? lossReasonCode || undefined : undefined,
      lossReasonLabel: lossCount > 0 ? reasonLabel : undefined,
      sessionNotes: sessionNotesPayload,
    })
  }

  if (!open || !batch) return null

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-black/40 dark:bg-black/60"
      role="presentation"
    >
      <div
        className="flex min-h-full w-full items-center justify-center p-4 sm:p-6"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className={cn(
            'flex max-h-[min(85dvh,720px)] w-full min-h-0 flex-col overflow-hidden rounded-3xl border border-gray-200/90 bg-white/95 shadow-2xl backdrop-blur-md dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-black/40',
            showAssignStep ? 'max-w-4xl' : 'max-w-lg',
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="transplant-modal-title"
        >
          <div className="scrollbar-modern min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5 sm:px-6 sm:py-6">
        <h2 id="transplant-modal-title" className="text-lg font-semibold tracking-tight text-gray-900 dark:text-[#f1f1f1]">
          {showAssignStep ? t('transplant.titleAssign') : t('transplant.titleRegister')}
        </h2>
        {showAssignStep ? (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-[#a3a3a3]">{t('transplant.assignSubtitle')}</p>
        ) : null}

        <div
          className="mt-4 flex w-full rounded-full border border-green-900/5 bg-green-50/60 p-1.5 shadow-inner backdrop-blur-md dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-none dark:backdrop-blur-none"
          role="tablist"
          aria-label={t('transplant.tablistAria')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={trackingMode === 'id'}
            disabled={showAssignStep}
            onClick={() => {
              if (!showAssignStep) handleTrackingModeChange('id')
            }}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-300',
              showAssignStep && 'pointer-events-none opacity-50',
              trackingMode === 'id'
                ? cn('font-semibold', TRACKING_TAB_ACTIVE.id)
                : 'font-medium text-gray-500 hover:text-green-700 dark:text-[#a3a3a3] dark:hover:text-green-400',
            )}
          >
            <ScanLine className="h-4 w-4 shrink-0" aria-hidden />
            {t('transplant.modeId')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={trackingMode === 'color'}
            disabled={showAssignStep}
            onClick={() => {
              if (!showAssignStep) handleTrackingModeChange('color')
            }}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-300',
              showAssignStep && 'pointer-events-none opacity-50',
              trackingMode === 'color'
                ? cn('font-semibold', TRACKING_TAB_ACTIVE.color)
                : 'font-medium text-gray-500 hover:text-green-700 dark:text-[#a3a3a3] dark:hover:text-green-400',
            )}
          >
            <Palette className="h-4 w-4 shrink-0" aria-hidden />
            {t('transplant.modeColor')}
          </button>
        </div>

        <div className="mt-3 flex gap-3 rounded-2xl border border-sky-200/80 bg-sky-50/90 p-3.5 text-sm text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/35 dark:text-sky-100">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
          {trackingMode === 'id' ? <p>{t('transplant.hintId')}</p> : <p>{t('transplant.hintColor')}</p>}
        </div>

        <section className="mt-4 space-y-1.5 rounded-2xl border border-gray-100 bg-gray-50/80 p-3.5 text-sm dark:border-[#3d3d3d] dark:bg-[#222]">
          <p>
            <span className="font-medium text-gray-500 dark:text-[#a3a3a3]">{t('transplant.strain')}: </span>
            <span className="text-gray-900 dark:text-[#f1f1f1]">{batch.strain}</span>
          </p>
          <p>
            <span className="font-medium text-gray-500 dark:text-[#a3a3a3]">{t('transplant.batchLote')}: </span>
            <span className="font-mono text-gray-900 dark:text-[#f1f1f1]">{batch.id}</span>
          </p>
          <p>
            <span className="font-medium text-gray-500 dark:text-[#a3a3a3]">{t('transplant.inBatch')}: </span>
            <span className="tabular-nums text-gray-900 dark:text-[#f1f1f1]">
              {available} {t('transplant.units')}
            </span>
          </p>
        </section>

        {showAssignStep ? (
          <>
            <div className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-2.5 text-sm dark:border-emerald-900/45 dark:bg-emerald-950/30">
              <p className="font-semibold tabular-nums text-emerald-950 dark:text-emerald-100">
                {t('transplant.assignProgress', {
                  assigned: String(assignedCount),
                  total: String(assignRows.length),
                })}
              </p>
              {assignRows.length > 0 && assignedCount < assignRows.length ? (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-emerald-200/80 dark:bg-emerald-900/60">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, (assignedCount / assignRows.length) * 100)}%` }}
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
              <div className="rounded-xl border border-gray-200/90 bg-gradient-to-b from-white to-gray-50/90 p-4 shadow-sm dark:border-[#3d3d3d] dark:from-[#2a2a2a] dark:to-[#222] dark:shadow-none">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[#a3a3a3]">
                  {assignAllPlaced
                    ? t('transplant.assignCompleteTitle')
                    : unassignedRows.length > 0
                      ? t('transplant.plantsPendingTitle')
                      : trackingMode === 'color'
                        ? t('transplant.plantsGroup')
                        : t('transplant.plantsScanned')}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                  <label className="block min-w-[8rem] flex-1 text-xs font-medium text-gray-700 dark:text-[#d4d4d4]">
                    {t('transplant.quantityToMove')}
                    <input
                      type="text"
                      inputMode="numeric"
                      value={quantityPickStr}
                      onChange={(e) => setQuantityPickStr(e.target.value)}
                      placeholder={t('transplant.quantityPlaceholder')}
                      disabled={unassignedRows.length === 0}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm tabular-nums text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:bg-gray-100 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:disabled:bg-[#1a1a1a]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={selectFirstNUnassigned}
                    disabled={unassignedRows.length === 0}
                    className={cn(
                      'rounded-lg border border-emerald-600/40 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-600/50 dark:bg-[#2a2a2a] dark:text-emerald-200 dark:hover:bg-emerald-950/40',
                    )}
                  >
                    {t('transplant.selectByQuantity')}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-gray-500 dark:text-[#a3a3a3]">{t('transplant.quantityHint')}</p>
                <div className="mt-3 max-h-[min(40vh,320px)] overflow-y-auto rounded-lg border border-gray-100 bg-white/95 shadow-inner dark:border-[#3d3d3d] dark:bg-[#1f1f1f]">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 z-[1] border-b border-gray-100 bg-gray-50/95 backdrop-blur-sm dark:border-[#3d3d3d] dark:bg-[#2a2a2a]/95">
                      <tr>
                        <th className="w-10 px-3 py-2.5">
                          <input
                            ref={assignSelectAllRef}
                            type="checkbox"
                            checked={unassignedRows.length === 0 || allRemainingSelected}
                            disabled={unassignedRows.length === 0}
                            onChange={toggleAssignSelectAll}
                            aria-label={t('transplant.selectAllRemaining')}
                            className="rounded border-gray-300 disabled:opacity-40"
                          />
                        </th>
                        <th className="px-3 py-2.5 font-medium text-gray-700 dark:text-[#d4d4d4]">{t('transplant.colId')}</th>
                        <th className="px-3 py-2.5 font-medium text-gray-700 dark:text-[#d4d4d4]">
                          {t('transplant.colLocation')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassignedRows.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-[#a3a3a3]">
                            {t('transplant.allAssignedInTable')}
                          </td>
                        </tr>
                      ) : (
                        unassignedRows.map((row) => (
                          <tr
                            key={row.key}
                            className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-[#2e2e2e] dark:hover:bg-[#2a2a2a]/80"
                          >
                            <td className="px-3 py-2.5 align-middle">
                              <input
                                type="checkbox"
                                checked={assignSelectedKeys.has(row.key)}
                                onChange={() => toggleAssignRowKey(row.key, false)}
                                className="rounded border-gray-300"
                                aria-label={t('transplant.selectRowAria', { id: row.displayId })}
                              />
                            </td>
                            <td className="px-3 py-2.5 font-mono text-gray-900 dark:text-[#f1f1f1]">{row.displayId}</td>
                            <td className="px-3 py-2.5 text-xs text-gray-400 dark:text-[#8c8c8c]">{t('transplant.unassigned')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex min-h-0 flex-col gap-3">
                {assignedByLocation.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/75 dark:text-emerald-300/90">
                      {t('transplant.assignedBlocksSection', {
                        groups: String(assignedByLocation.length),
                        total: String(assignedRowsList.length),
                      })}
                    </p>
                    {assignedByLocation.map(([loc, rows]) => (
                      <details
                        key={loc}
                        className="rounded-xl border border-emerald-200/80 bg-white/95 shadow-sm ring-1 ring-emerald-900/5 dark:border-emerald-900/45 dark:bg-[#2a2a2a]/95 dark:ring-emerald-900/20"
                      >
                        <summary className="cursor-pointer list-none px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                          <span className="flex items-start justify-between gap-2">
                            <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-emerald-950 dark:text-emerald-100">
                              {loc}
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block text-[10px] font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
                                {t('transplant.assignedBlockCount', { n: String(rows.length) })}
                              </span>
                              <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-wide text-emerald-600/85 dark:text-emerald-400/90">
                                {t('transplant.assignedFoldAction')}
                              </span>
                            </span>
                          </span>
                        </summary>
                        <div className="border-t border-emerald-100/90 px-3 py-2 dark:border-emerald-900/40">
                          <p className="font-mono text-[10px] leading-relaxed text-gray-700 dark:text-[#d4d4d4]">
                            {rows.map((r) => r.displayId).join(', ')}
                          </p>
                        </div>
                      </details>
                    ))}
                  </div>
                ) : null}

                <div
                  className={cn(
                    'rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-4 shadow-sm transition dark:border-emerald-900/45 dark:bg-emerald-950/25',
                    !bulkHasSelection && 'pointer-events-none opacity-45',
                  )}
                >
                  <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">{t('transplant.bulkTitle')}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/85 dark:text-emerald-200/90">
                    {t('transplant.bulkHint')}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-emerald-900/90 dark:text-emerald-200/90">{t('transplant.bulkHintResets')}</p>
                  <div className="mt-3">
                    <LocationSelector
                      key={`bulk-topo-${selectionSig || 'none'}`}
                      companyId={companyId}
                      value={bulkTopology}
                      onChange={setBulkTopology}
                      labels={topologyLocLabels}
                    />
                  </div>
                <button
                  type="button"
                  onClick={applyBulkAssign}
                  disabled={!bulkHasSelection || !bulkTopology?.roomId}
                  className={cn(
                    'mt-4 w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow-sm',
                    !bulkHasSelection || !bulkTopology?.roomId
                      ? 'cursor-not-allowed bg-gray-300 dark:bg-[#3d3d3d]'
                      : 'bg-emerald-700 hover:bg-emerald-800',
                  )}
                >
                  {t('transplant.bulkApply')}
                </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-gray-200/80 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#3d3d3d]">
              <button
                type="button"
                onClick={leaveAssignPhase}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#e8e8e8] dark:hover:bg-[#333]"
              >
                {t('transplant.back')}
              </button>
              <button
                type="button"
                onClick={handleFinalConfirm}
                disabled={!assignAllPlaced}
                className={cn(
                  'rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition',
                  assignAllPlaced
                    ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/25'
                    : 'cursor-not-allowed bg-gray-300 text-gray-500 shadow-none dark:bg-[#3d3d3d] dark:text-[#a3a3a3]',
                )}
              >
                {t('transplant.confirmMoveVeg')}
              </button>
            </div>
          </>
        ) : trackingMode === 'color' ? (
          <>
            <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 dark:border-violet-900/40 dark:bg-violet-950/30">
              <p className="text-sm font-semibold text-violet-950 dark:text-violet-100">
                {t('transplant.colorLotLine', {
                  healthy: String(colorHealthyValid ? colorHealthyParsed : '—'),
                  available,
                })}
              </p>
              <p className="mt-2 text-sm text-violet-900/90 dark:text-violet-200/90">
                {!colorHealthyValid ? (
                  t('transplant.colorHintCount', { max: available })
                ) : colorLossCount != null && colorLossCount > 0 ? (
                  t('transplant.colorHintLoss', { n: colorLossCount })
                ) : (
                  t('transplant.colorHintOk')
                )}
              </p>
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-gray-600 dark:text-[#b0b0b0]" htmlFor="color-healthy-count">
                {t('transplant.healthyCountLabel')}{' '}
                <span className="text-gray-400 dark:text-[#8c8c8c]">(1–{available})</span>
              </label>
              <input
                id="color-healthy-count"
                type="number"
                inputMode="numeric"
                min={1}
                max={available}
                value={colorHealthyStr}
                onChange={(e) => setColorHealthyStr(e.target.value)}
                placeholder={`ej. ${available}`}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 tabular-nums text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
              />
            </div>

            <div className="mt-5">
              <p className="text-xs font-medium text-gray-700 dark:text-[#d4d4d4]">{t('transplant.physicalColor')}</p>
              <div className="mt-2.5 grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-2">
                {BRACELET_COLOR_TRACKING_OPTIONS.map((opt) => {
                  const colorLabel = t(`braceletColor.${opt.key}` as 'braceletColor.red')
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      title={colorLabel}
                      aria-label={colorLabel}
                      aria-pressed={colorKey === opt.key}
                      onClick={() => setColorKey(opt.key)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
                        colorKey === opt.key && 'bg-violet-50/80 dark:bg-violet-950/40',
                      )}
                    >
                      <span
                        className={cn(
                          'h-9 w-9 shrink-0 rounded-full',
                          COLOR_SWATCH[opt.key],
                          colorKey === opt.key
                            ? 'ring-2 ring-violet-600 ring-offset-2'
                            : 'ring-1 ring-black/15',
                        )}
                        aria-hidden
                      />
                      <span className="text-center text-[10px] font-medium leading-tight text-gray-600 dark:text-[#c4c4c4]">
                        {colorLabel}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {colorHealthyValid && colorLossCount != null && colorLossCount > 0 ? (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-[#3d3d3d] dark:bg-[#222]">
                <p className="text-sm font-medium text-gray-800 dark:text-[#e8e8e8]">
                  {t('transplant.lossReasonFor', { n: colorLossCount })}{' '}
                  <span className="text-red-600">*</span>
                </p>
                <label
                  className="mt-3 block text-xs font-medium text-gray-700 dark:text-[#d4d4d4]"
                  htmlFor="color-loss-reason"
                >
                  {t('transplant.reasonLabel')}
                </label>
                <div className="mt-1.5">
                  <SoftSelect
                    value={lossReasonCode}
                    onChange={(v) =>
                      setLossReasonCode((v || '') as '' | TransplantLossReasonCode)
                    }
                    options={lossReasonOptions}
                    chipText={lossReasonChipText}
                    ariaLabel={t('transplant.reasonLabel')}
                    variant="field"
                    warning={lossReasonCode === ''}
                    triggerClassName={cn(
                      'outline-none',
                      lossReasonCode === ''
                        ? 'border-amber-300/80 bg-white dark:border-amber-700/50 dark:bg-[#2a2a2a]'
                        : 'border-gray-200 bg-white dark:border-[#3d3d3d] dark:bg-[#2a2a2a]',
                    )}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              <label className="text-xs font-medium text-gray-600 dark:text-[#b0b0b0]" htmlFor="transplant-color-comment">
                {t('transplant.commentOptional')}
              </label>
              <textarea
                id="transplant-color-comment"
                rows={2}
                value={sessionComment}
                onChange={(e) => setSessionComment(e.target.value)}
                placeholder={t('transplant.commentPlaceholder')}
                className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:placeholder:text-[#6b6b6b]"
              />
            </div>

            <div className="mt-6 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-between dark:border-[#3d3d3d]">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#e8e8e8] dark:hover:bg-[#333]"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={continueColorToAssign}
                disabled={
                  !canSubmitColor || !colorHealthyParsed || !selectedColorMeta
                }
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm font-semibold text-white',
                  !canSubmitColor || !colorHealthyParsed || !selectedColorMeta
                    ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-[#3d3d3d] dark:text-[#a3a3a3]'
                    : 'bg-violet-700 hover:bg-violet-800',
                )}
              >
                {t('transplant.continueLocations', {
                  count: String(colorHealthyValid ? colorHealthyParsed : '—'),
                  color: selectedColorMeta
                    ? t(`braceletColor.${selectedColorMeta.key}` as 'braceletColor.red')
                    : '…',
                })}
              </button>
            </div>
          </>
        ) : phase === 'scan' ? (
          <>
            <div className="mt-5 rounded-2xl border border-green-100 bg-green-50/50 p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/30">
              <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                {t('transplant.registered')}:{' '}
                <span className="tabular-nums">
                  {scannedCount} {t('transplant.of')} {available}
                </span>
              </p>
              <p className="mt-2 text-sm text-green-800/90 dark:text-green-200/90">{t('transplant.scanHint')}</p>
            </div>

            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault()
                addScan()
              }}
            >
              <label className="text-xs font-medium text-gray-600 dark:text-[#b0b0b0]" htmlFor="bracelet-scan-input">
                {t('transplant.braceletId')}
              </label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <input
                  ref={inputRef}
                  id="bracelet-scan-input"
                  type="text"
                  autoComplete="off"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={scannedCount >= available}
                  placeholder={t('transplant.idPlaceholder')}
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 disabled:bg-gray-100 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:disabled:bg-[#1a1a1a]"
                />
                <button
                  type="submit"
                  disabled={scannedCount >= available || !inputValue.trim()}
                  className={cn(
                    'shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white',
                    scannedCount >= available || !inputValue.trim()
                      ? 'cursor-not-allowed bg-gray-300 dark:bg-[#3d3d3d]'
                      : 'bg-green-700 hover:bg-green-800',
                  )}
                >
                  {t('transplant.add')}
                </button>
                <button
                  type="button"
                  disabled={scannedCount >= available}
                  onClick={() => setCameraOpen(true)}
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-green-600/30 bg-white px-3 py-2.5 text-sm font-semibold text-green-800 shadow-sm transition hover:bg-green-50 dark:border-green-500/35 dark:bg-[#2a2a2a] dark:text-green-300 dark:hover:bg-green-950/40',
                    scannedCount >= available && 'cursor-not-allowed opacity-50',
                  )}
                  aria-label={t('transplant.scannerAria')}
                >
                  <Camera className="h-4 w-4" aria-hidden />
                  {t('transplant.scanner')}
                </button>
              </div>
              {scannedCount >= available ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t('transplant.batchFull')}</p>
              ) : null}
            </form>

            {scannedCount > 0 ? (
              <div className="mt-4 rounded-2xl border border-green-100/90 bg-green-50/40 p-3 shadow-sm ring-1 ring-green-900/[0.04] dark:border-green-900/40 dark:bg-green-950/25 dark:ring-green-900/20">
                <p className="text-xs font-semibold text-green-900/80 dark:text-green-200/90">{t('transplant.addedIds')}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {scannedIds.map((id, index) => (
                    <span
                      key={`${normalizeBraceletKey(id)}-${index}`}
                      className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-gray-300/90 bg-white py-0.5 pl-2.5 pr-0.5 text-sm font-mono text-gray-900 shadow-sm dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                    >
                      <span className="truncate">{id}</span>
                      <button
                        type="button"
                        onClick={() => removeScannedAt(index)}
                        className="inline-flex shrink-0 rounded-full p-1 text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:text-[#a3a3a3] dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        aria-label={t('transplant.removeIdAria', { id })}
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-center text-xs text-gray-400 dark:text-[#8c8c8c]">{t('transplant.noIdsYet')}</p>
            )}

            <div className="mt-4">
              <label className="text-xs font-medium text-gray-600 dark:text-[#b0b0b0]" htmlFor="transplant-session-comment">
                {t('transplant.sessionComment')}
              </label>
              <textarea
                id="transplant-session-comment"
                rows={2}
                value={sessionComment}
                onChange={(e) => setSessionComment(e.target.value)}
                placeholder={t('transplant.sessionCommentPh')}
                className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500/30 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:placeholder:text-[#6b6b6b]"
              />
            </div>

            <div className="mt-6 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-between dark:border-[#3d3d3d]">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#e8e8e8] dark:hover:bg-[#333]"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={scannedCount === 0}
                onClick={handleFinishRegistration}
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm',
                  scannedCount === 0
                    ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-[#3d3d3d] dark:text-[#a3a3a3]'
                    : 'bg-green-700 hover:bg-green-800',
                )}
              >
                {t('transplant.finishRegister')}
              </button>
            </div>
          </>
        ) : phase === 'loss' ? (
          <>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setPhase('scan')}
                className="text-xs font-medium text-green-700 underline hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
              >
                {t('transplant.backToScan')}
              </button>
            </div>

            {isPerfectReconcile ? (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50/80 p-4 text-sm text-green-950 shadow-sm dark:border-green-900/45 dark:bg-green-950/30 dark:text-green-100">
                <p className="font-semibold">{t('transplant.allMarked', { n: available })}</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-amber-300/80 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-semibold">{t('transplant.lossAttention')}</p>
                  <p className="mt-2">
                    {t('transplant.lossRegisteredLine', { scanned: scannedCount, loss: lossCount })}
                  </p>
                </div>
                {lossCount > 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-[#3d3d3d] dark:bg-[#2a2a2a]/95">
                    <p className="text-sm font-medium text-gray-800 dark:text-[#e8e8e8]">
                      {t('transplant.lossSpecify', { n: lossCount })}
                    </p>
                    <label className="mt-3 block text-xs font-medium text-gray-700 dark:text-[#d4d4d4]" htmlFor="reconcile-loss-reason">
                      {t('transplant.reasonRequired')}
                    </label>
                    <div className="mt-1.5">
                      <SoftSelect
                        value={lossReasonCode}
                        onChange={(v) =>
                          setLossReasonCode((v || '') as '' | TransplantLossReasonCode)
                        }
                        options={lossReasonOptions}
                        chipText={lossReasonChipText}
                        ariaLabel={t('transplant.reasonRequired')}
                        variant="field"
                        warning={lossReasonCode === ''}
                        triggerClassName={cn(
                          'outline-none',
                          lossReasonCode === ''
                            ? 'border-amber-300/80 bg-white dark:border-amber-700/50 dark:bg-[#2a2a2a]'
                            : 'border-gray-200 bg-white dark:border-[#3d3d3d] dark:bg-[#2a2a2a]',
                        )}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-[#3d3d3d]">
              <button
                type="button"
                onClick={() => setPhase('scan')}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#e8e8e8] dark:hover:bg-[#333]"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={continueFromLossToAssign}
                disabled={lossCount > 0 && lossReasonCode === ''}
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm',
                  lossCount > 0 && lossReasonCode === ''
                    ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-[#3d3d3d] dark:text-[#a3a3a3]'
                    : 'bg-green-700 hover:bg-green-800',
                )}
              >
                {t('transplant.continueLocationsShort')}
              </button>
            </div>
          </>
        ) : null}
          </div>
        </div>
      </div>

      <BraceletCameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDigits={(digits) => {
          if (addScanFromRaw(digits)) setInputValue('')
        }}
      />
    </div>
  )
}
