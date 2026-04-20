import { useEffect, useMemo, useState } from 'react'
import type {
  CultivoDestruccionMethodCode,
  CultivoLateBajaReasonCode,
} from '../../store/cultivationTypes'
import { CULTIVO_DESTRUCCION_METHODS, CULTIVO_LATE_BAJA_REASONS } from '../../store/cultivationTypes'
import type { PlantCardItem } from '../cultivo/PlantCard'
import { EnvModalFrame } from '../cultivo/envFieldModals/EnvModalFrame'
import { SoftSelect } from '../ui/SoftSelect'
import { cn } from '../../lib/cn'

type TFn = (k: string, vars?: Record<string, string | number>) => string

function looksLikeUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())
}

function braceletLine(p: PlantCardItem, t: TFn): string {
  const br = p.braceletId?.trim()
  if (br) {
    return br.startsWith('#') ? t('diario.bajaBracelet', { id: br }) : t('diario.bajaBraceletHash', { id: br.replace(/^#/, '') })
  }
  const id = p.id.trim()
  if (looksLikeUuid(id)) return t('diario.bajaBraceletUuid', { tail: id.slice(-8) })
  return t('diario.bajaBraceletHash', { id })
}

export function DiarioRegistrarBajaModal({
  open,
  onClose,
  floracionMode,
  peerPlants,
  onConfirm,
  t,
}: {
  open: boolean
  onClose: () => void
  floracionMode: boolean
  peerPlants: PlantCardItem[]
  onConfirm: (payload: {
    plantIds: string[]
    reasonCode: CultivoLateBajaReasonCode
    weightGrams?: number
    destructionMethodCode: CultivoDestruccionMethodCode
    destructionMethodNotes?: string
    notes?: string
  }) => void
  t: TFn
}) {
  const selectable = useMemo(
    () => peerPlants.filter((p) => p.cultivoUnitStatus !== 'baja'),
    [peerPlants],
  )

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [reasonCode, setReasonCode] = useState<CultivoLateBajaReasonCode | ''>('')
  const [weightStr, setWeightStr] = useState('')
  const [methodCode, setMethodCode] = useState<CultivoDestruccionMethodCode | ''>('')
  const [methodNotes, setMethodNotes] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setReasonCode('')
    setWeightStr('')
    setMethodCode('')
    setMethodNotes('')
    setNotes('')
  }, [open])

  const reasonOptions = useMemo(
    () =>
      CULTIVO_LATE_BAJA_REASONS.map((r) => ({
        value: r.code,
        label: t(r.labelKey as 'diario.lateBaja.plagas'),
      })),
    [t],
  )

  const methodOptions = useMemo(
    () =>
      CULTIVO_DESTRUCCION_METHODS.map((r) => ({
        value: r.code,
        label: t(r.labelKey as 'diario.destruccion.compost'),
      })),
    [t],
  )

  const weightNum = (() => {
    const n = Number(weightStr.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : null
  })()

  const weightOk = !floracionMode || (weightNum != null && weightNum > 0)

  const valid =
    selected.size >= 1 &&
    reasonCode !== '' &&
    methodCode !== '' &&
    weightOk &&
    (methodCode !== 'otro' || methodNotes.trim().length > 0)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = () => {
    if (!valid) return
    onConfirm({
      plantIds: [...selected],
      reasonCode: reasonCode as CultivoLateBajaReasonCode,
      weightGrams: weightNum != null && weightNum > 0 ? Math.round(weightNum) : undefined,
      destructionMethodCode: methodCode as CultivoDestruccionMethodCode,
      destructionMethodNotes: methodCode === 'otro' ? methodNotes.trim() : methodNotes.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    onClose()
  }

  if (!open) return null

  return (
    <EnvModalFrame
      title={t('diario.modalBajaPlantaTitle')}
      onClose={onClose}
      footer={
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="rounded-full bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-red-800 disabled:opacity-50"
            onClick={handleSave}
            disabled={!valid}
          >
            {t('diario.modalBajaPlantaSubmit')}
          </button>
        </div>
      }
    >
      <p className="mt-1 text-xs text-gray-600">{t('diario.modalBajaPlantaHint')}</p>

      <div className="mt-4 max-h-[min(40vh,280px)] space-y-2 overflow-y-auto rounded-xl border border-gray-100 p-2">
        {selectable.length === 0 ? (
          <p className="text-sm text-amber-800">{t('diario.modalBajaPlantaEmpty')}</p>
        ) : (
          selectable.map((p) => {
            const q = p.cultivoUnitStatus === 'quarantine'
            return (
              <label
                key={p.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-gray-50',
                  q && 'bg-amber-50/50',
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-red-700"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                />
                <span className="min-w-0 text-sm">
                  <span className="font-medium text-gray-900">{braceletLine(p, t)}</span>
                  {q ? (
                    <span className="ml-2 text-[11px] font-semibold text-amber-800">{t('diario.badgeCuarentena')}</span>
                  ) : null}
                </span>
              </label>
            )
          })
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {t('diario.bajaMotivo')} <span className="text-red-500">*</span>
          </label>
          <SoftSelect
            value={reasonCode}
            onChange={(v) => setReasonCode((v || '') as CultivoLateBajaReasonCode | '')}
            options={[{ value: '', label: t('diario.bajaPickMotivo') }, ...reasonOptions]}
            chipText={reasonOptions.find((o) => o.value === reasonCode)?.label ?? t('diario.bajaPickMotivo')}
            ariaLabel={t('diario.bajaMotivo')}
            variant="field"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {t('diario.bajaPeso')}
            {floracionMode ? (
              <span className="text-red-500"> *</span>
            ) : (
              <span className="font-normal text-gray-400"> ({t('diario.optional')})</span>
            )}
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm tabular-nums"
            value={weightStr}
            onChange={(e) => setWeightStr(e.target.value)}
            placeholder={t('diario.bajaPesoPh')}
          />
          {floracionMode ? <p className="mt-1 text-[10px] text-amber-800">{t('diario.bajaPesoFlorHint')}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {t('diario.bajaMetodo')} <span className="text-red-500">*</span>
          </label>
          <SoftSelect
            value={methodCode}
            onChange={(v) => setMethodCode((v || '') as CultivoDestruccionMethodCode | '')}
            options={[{ value: '', label: t('diario.bajaPickMetodo') }, ...methodOptions]}
            chipText={methodOptions.find((o) => o.value === methodCode)?.label ?? t('diario.bajaPickMetodo')}
            ariaLabel={t('diario.bajaMetodo')}
            variant="field"
          />
        </div>

        {methodCode === 'otro' ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">{t('diario.bajaMetodoOtro')}</label>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={methodNotes}
              onChange={(e) => setMethodNotes(e.target.value)}
              placeholder={t('diario.bajaMetodoOtroPh')}
            />
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">{t('diario.notes')}</label>
          <textarea
            className="min-h-[72px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('diario.bajaNotesPh')}
          />
        </div>
      </div>
    </EnvModalFrame>
  )
}
