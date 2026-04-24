import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { AlertCircle, Shield } from 'lucide-react'
import { INASE_VARIETIES } from '../../data/inaseVarieties'
import { useTranslation } from '../../i18n/useTranslation'
import {
  buildInaseLotBaseKey,
  formatInaseLegalLotLabel,
  nextInaseLegalLotSequence,
} from '../../lib/cultivo/inaseLegalLotStrain'
import { formatTopologyLabel } from '../../lib/locationTopologyFormat'
import { useCultivationStore } from '../../store/useCultivationStore'
import { useLocationTopologyStore } from '../../store/useLocationTopologyStore'
import type { RoomPurpose, TopologySelection } from '../../store/locationTopologyTypes'
import {
  GENETICS_TYPE_OPTIONS,
  type CloneOriginKind,
  type CultivoKanbanTab,
  type GeneticsType,
} from '../../store/cultivationTypes'
import { type PlantCardItem } from './PlantCard'
import { InaseVarietySearchSelect } from './InaseVarietySearchSelect'
import { LocationSelector } from '../location/LocationSelector'
import { MotherPlantSearchSelect } from './MotherPlantSearchSelect'
import { SoftSelect } from '../ui/SoftSelect'
import { StrainAutocomplete } from '../ui/StrainAutocomplete'
import { cn } from '../../lib/cn'

const CREATE_LOT_EXCLUDED_ROOM_TYPES: RoomPurpose[] = ['quarantine', 'drying']

type CreateKind = 'lote' | 'planta'

const INPUT_NO_NUMBER_SPINNER =
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

function localIsoDate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nowIsoDateTime(): string {
  return new Date().toISOString()
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

export type CreateCultivoPlantModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeTab: CultivoKanbanTab
  /** Kind chosen by FAB (lote) or by `cultivo:open-create` event. */
  entryKind: CreateKind
  tenantId: string
}

function CreateCultivoPlantModalInner({
  open,
  onOpenChange,
  activeTab,
  entryKind,
  tenantId,
}: CreateCultivoPlantModalProps) {
  const { t } = useTranslation()
  const setCultivoBoard = useCultivationStore((s) => s.setCultivoBoard)
  const geneticsBank = useCultivationStore((s) => (Array.isArray(s.geneticsBank) ? s.geneticsBank : []))
  const plantsRegistry = useCultivationStore((s) => (Array.isArray(s.plants) ? s.plants : []))
  const cultivationRooms = useCultivationStore((s) => (Array.isArray(s.rooms) ? s.rooms : []))

  const topoRooms = useLocationTopologyStore((s) => (Array.isArray(s.rooms) ? s.rooms : []))
  const topoFixtures = useLocationTopologyStore((s) => (Array.isArray(s.fixtures) ? s.fixtures : []))
  const topoLevels = useLocationTopologyStore((s) => (Array.isArray(s.levels) ? s.levels : []))

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
  const [createTopology, setCreateTopology] = useState<TopologySelection | null>(null)
  const [createTopologyError, setCreateTopologyError] = useState(false)
  const [createFillBannerShakeKey, setCreateFillBannerShakeKey] = useState(0)

  const resetCreateFormToDefaults = useCallback(() => {
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
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    resetCreateFormToDefaults()
    setCreateKind(entryKind)
    setCreateQty(entryKind === 'planta' ? '1' : '50')
  }, [open, entryKind, resetCreateFormToDefaults])

  useEffect(() => {
    if (!open) return
    const prevBody = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

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


  const submitCreate = () => {
    if (!createTopology?.roomId) {
      setCreateTopologyError(true)
      setCreateFillBannerShakeKey((k) => k + 1)
      return
    }
    setCreateTopologyError(false)
  
    let inaseVarietyForLot: (typeof INASE_VARIETIES)[number] | null = null
    let inaseHarvestYearForLot: number | null = null
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
      inaseVarietyForLot = inaseVariety
      inaseHarvestYearForLot = Math.round(harvestYear)
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
  
    let strainName: string
    let inaseLegalLotLabel: string | undefined
    if (createSeedType === 'Semilla' && createSeedComplianceType === 'certificada' && inaseVarietyForLot && inaseHarvestYearForLot != null) {
      strainName = inaseVarietyForLot.name.trim()
      if (!strainName) {
        window.alert(t('cultivoBoard.errStrainRequired'))
        return
      }
      const baseKey = buildInaseLotBaseKey({
        varietyName: inaseVarietyForLot.name,
        harvestYear: inaseHarvestYearForLot,
        providerRncyfs: createInaseProviderRncyfs.trim(),
      })
      const b0 = useCultivationStore.getState().cultivoBoard
      const board = {
        propagacion: Array.isArray(b0?.propagacion) ? b0.propagacion : [],
        vegetacion: Array.isArray(b0?.vegetacion) ? b0.vegetacion : [],
        floracion: Array.isArray(b0?.floracion) ? b0.floracion : [],
        cosecha: Array.isArray(b0?.cosecha) ? b0.cosecha : [],
      }
      const allBoardRows = [...board.propagacion, ...board.vegetacion, ...board.floracion, ...board.cosecha]
      const seq = nextInaseLegalLotSequence(allBoardRows, baseKey)
      inaseLegalLotLabel = formatInaseLegalLotLabel(baseKey, seq)
    } else {
      strainName = createStrain.trim()
      if (!strainName) {
        window.alert(t('cultivoBoard.errStrainRequired'))
        return
      }
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
      inaseLegalLotLabel,
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
    onOpenChange(false)
    setCultivoBoard((prev) => ({ ...prev, [activeTab]: [newRow, ...prev[activeTab]] }))
  }

  return (
    <>
    {typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {open ? (
        <motion.div
          key="cultivo-create-modal"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] dark:bg-black/55"
            aria-label={t('common.close')}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cultivo-create-modal-title"
            className={cn(
              'relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-3xl border',
              'max-h-[min(90dvh,calc(100vh-2rem))]',
              'border-white/70 bg-white/95',
              'shadow-[0_24px_80px_-12px_rgba(15,23,42,0.25)]',
              'dark:border-white/[0.10] dark:bg-[#1c1c1c] dark:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.5)]',
            )}
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
          <div className="scrollbar-modern scrollbar-modern-dark flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-5">
          <p
            id="cultivo-create-modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-[#f1f1f1]"
          >
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
                        if (next === 'certificada') {
                        } else {
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
                        <InaseVarietySearchSelect
                          varieties={INASE_VARIETIES}
                          value={createInaseVarietyId}
                          onChange={(id) => {
                            setCreateInaseVarietyId(id)
                            const row = INASE_VARIETIES.find((x) => x.id === id)
                            setCreateStrain(row?.name ?? '')
                          }}
                          placeholder={t('cultivoBoard.inaseVarietySearchPh')}
                          noResultsText={t('cultivoBoard.inaseVarietyNoResults')}
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
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 dark:border-[#3d3d3d] dark:text-[#e8e8e8] dark:hover:bg-white/[0.06]"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={submitCreate}
              className="rounded-xl bg-green-700 px-3 py-2 text-sm font-medium text-white"
            >
              {t('cultivoBoard.create')}
            </button>
          </div>
          </div>
          </motion.div>
        </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null}
    </>
  )

}

export const CreateCultivoPlantModal = memo(CreateCultivoPlantModalInner)
