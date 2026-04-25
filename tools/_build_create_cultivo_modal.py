# One-off generator: reads CultivoTab.tsx, writes CreateCultivoPlantModal.tsx
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "components" / "tabs" / "CultivoTab.tsx"
OUT = ROOT / "src" / "components" / "cultivo" / "CreateCultivoPlantModal.tsx"

text = SRC.read_text(encoding="utf-8")
lines = text.splitlines()

def find_line(prefix: str) -> int:
    for i, ln in enumerate(lines):
        if ln.strip().startswith(prefix):
            return i
    raise SystemExit(f"not found: {prefix!r}")

i_create = find_line("const createLot = () => {")
i_transplant = find_line("const handleTransplantConfirm = (payload: TransplantModalConfirmPayload) => {")
create_body = "\n".join(lines[i_create : i_transplant]).rstrip()

i_portal = None
for i, ln in enumerate(lines):
    if "{typeof document !== 'undefined'" in ln:
        i_portal = i
        break
if i_portal is None:
    raise SystemExit("portal block not found")

i_transplant_jsx = None
for i in range(i_portal, len(lines)):
    if lines[i].strip().startswith("<TransplantModal"):
        i_transplant_jsx = i
        break
if i_transplant_jsx is None:
    raise SystemExit("TransplantModal jsx not found")

portal_block = "\n".join(lines[i_portal:i_transplant_jsx]).rstrip()

# createLot: replace board with getState snapshot
create_body = create_body.replace(
    "const allBoardRows = [...board.propagacion, ...board.vegetacion, ...board.floracion, ...board.cosecha]",
    "const b0 = useCultivationStore.getState().cultivoBoard\n"
    "    const board = {\n"
    "      propagacion: Array.isArray(b0?.propagacion) ? b0.propagacion : [],\n"
    "      vegetacion: Array.isArray(b0?.vegetacion) ? b0.vegetacion : [],\n"
    "      floracion: Array.isArray(b0?.floracion) ? b0.floracion : [],\n"
    "      cosecha: Array.isArray(b0?.cosecha) ? b0.cosecha : [],\n"
    "    }\n"
    "    const allBoardRows = [...board.propagacion, ...board.vegetacion, ...board.floracion, ...board.cosecha]",
)

create_body = create_body.replace(
    "flushSync(() => {\n      setCreateOpen(false)\n    })",
    "onOpenChange(false)",
)

create_body = re.sub(r"^  const createLot", "  const submitCreate", create_body, count=1, flags=re.MULTILINE)

portal_block = portal_block.replace("setCreateOpen(false)", "onOpenChange(false)")
portal_block = portal_block.replace("onClick={createLot}", "onClick={submitCreate}")

header = '''import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  BRACELET_COLOR_TRACKING_OPTIONS,
  GENETICS_TYPE_OPTIONS,
  type CloneOriginKind,
  type CultivoKanbanTab,
  type GeneticsType,
  type PropagacionLogEntry,
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

'''

footer = '''
}

export const CreateCultivoPlantModal = memo(CreateCultivoPlantModalInner)
'''

# Indent create_body: it was 2 spaces at start for methods inside CultivoTab — strip 2 spaces from each line
def deindent(s: str, n: int = 2) -> str:
    out = []
    for ln in s.splitlines():
        if ln.startswith(' ' * n):
            out.append(ln[n:])
        else:
            out.append(ln)
    return "\n".join(out)

create_fn = deindent(create_body, 2)
# rename function name already done to submitCreate

portal_inner = deindent(portal_block, 8)
# portal was indented 8 spaces inside return of CultivoTab — actually variable indent; use 8

# Fix portal: first line was `        {typeof` — deindent 8
portal_inner_lines = portal_block.splitlines()
if portal_inner_lines and portal_inner_lines[0].startswith('        '):
    portal_inner = "\n".join(ln[8:] if ln.startswith('        ') else ln for ln in portal_inner_lines)
else:
    portal_inner = portal_block

# Replace createOpen with open in portal condition
portal_inner = portal_inner.replace('{createOpen ? (', '{open ? (')
portal_inner = portal_inner.replace(') : null}', ') : null}')

out = header + "\n  " + create_fn.replace("\n", "\n  ") + "\n\n  return (\n    " + portal_inner.replace("\n", "\n    ") + "\n  )\n" + footer

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(out, encoding='utf-8')
print('written', OUT, 'chars', len(out))
