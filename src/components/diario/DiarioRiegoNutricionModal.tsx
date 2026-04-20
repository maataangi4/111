import { useEffect, useMemo, useState } from 'react'
import type { DiarioRiegoNutricionData, PropagacionLogEntry } from '../../store/cultivationTypes'
import { useToolsStore } from '../../store/useToolsStore'
import { SoftSelect } from '../ui/SoftSelect'
import { ToolsInventorySearchSelect } from '../ui/ToolsInventorySearchSelect'
import { EnvModalFrame } from '../cultivo/envFieldModals/EnvModalFrame'

type TFn = (k: string, vars?: Record<string, string | number>) => string

export function DiarioRiegoNutricionModal({
  open,
  onClose,
  onCommit,
  batchIds,
  author,
  t,
  floracionMode,
}: {
  open: boolean
  onClose: () => void
  onCommit: (entry: Omit<PropagacionLogEntry, 'id'>) => void
  batchIds: string[]
  author?: string
  t: TFn
  /** Lavado de raíces / flush (10–14 días antes de cosecha). */
  floracionMode?: boolean
}) {
  const toolItems = useToolsStore((s) => s.items)
  const [pureWater, setPureWater] = useState(true)
  const [recipeToolId, setRecipeToolId] = useState<string | null>(null)
  const [vol, setVol] = useState('')
  const [volUnit, setVolUnit] = useState<'L' | 'gal'>('L')
  const [inPh, setInPh] = useState('')
  const [inEc, setInEc] = useState('')
  const [drPh, setDrPh] = useState('')
  const [drEc, setDrEc] = useState('')
  const [flushStarted, setFlushStarted] = useState(false)

  useEffect(() => {
    if (!open) return
    setPureWater(true)
    setRecipeToolId(null)
    setVol('')
    setVolUnit('L')
    setInPh('')
    setInEc('')
    setDrPh('')
    setDrEc('')
    setFlushStarted(false)
  }, [open])

  const unitOpts = useMemo(
    () => [
      { value: 'L' as const, label: t('germinacionDetail.potUnitL') },
      { value: 'gal' as const, label: t('germinacionDetail.potUnitGal') },
    ],
    [t],
  )

  if (!open) return null

  const parseOpt = (s: string) => {
    const n = s.trim() === '' ? NaN : Number(s.replace(',', '.'))
    return Number.isFinite(n) ? n : undefined
  }

  const handleSave = () => {
    const v = vol.trim() === '' ? NaN : Number(vol.replace(',', '.'))
    if (!Number.isFinite(v) || v <= 0 || batchIds.length === 0) return
    let recipeLabel = t('diario.recipePureWater')
    let recipeToolIdVal: string | null | undefined = null
    if (!pureWater) {
      if (!recipeToolId) return
      const nm = toolItems.find((i) => i.id === recipeToolId)?.name?.trim()
      if (!nm) return
      recipeLabel = nm
      recipeToolIdVal = recipeToolId
    }
    const data: DiarioRiegoNutricionData = {
      recipeToolId: recipeToolIdVal ?? null,
      recipeLabel,
      volumeValue: v,
      volumeUnit: volUnit,
      inletPh: parseOpt(inPh),
      inletEc: parseOpt(inEc),
      drainPh: parseOpt(drPh),
      drainEc: parseOpt(drEc),
      flushStarted: floracionMode && flushStarted ? true : undefined,
    }
    onCommit({
      kind: 'diario_riego_nutricion',
      at: new Date().toISOString(),
      author: author?.trim() || undefined,
      diarioRiegoNutricion: data,
    })
    onClose()
  }

  return (
    <EnvModalFrame
      title={t('diario.modalRiegoTitle')}
      onClose={onClose}
      footer={
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="rounded-full bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-green-800 disabled:opacity-50"
            onClick={handleSave}
            disabled={
              batchIds.length === 0 ||
              !vol.trim() ||
              (!pureWater && !recipeToolId)
            }
          >
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="mt-4 space-y-4">
        {floracionMode ? (
          <p className="rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2 text-[11px] text-purple-950">
            {t('diario.riegoFlorHint')}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setPureWater(true)
              setRecipeToolId(null)
            }}
            className={`rounded-xl border px-3 py-2 text-sm ${pureWater ? 'border-green-600 bg-green-50 font-medium' : 'border-gray-200'}`}
          >
            {t('diario.recipePureWater')}
          </button>
          <button
            type="button"
            onClick={() => setPureWater(false)}
            className={`rounded-xl border px-3 py-2 text-sm ${!pureWater ? 'border-green-600 bg-green-50 font-medium' : 'border-gray-200'}`}
          >
            {t('diario.recipePickInventory')}
          </button>
        </div>
        {!pureWater ? (
          <ToolsInventorySearchSelect
            category="fertilizer"
            valueId={recipeToolId}
            onChangeId={setRecipeToolId}
            placeholderPick={t('tools.pickFromInventory')}
            ariaLabel={t('diario.recipeLabel')}
          />
        ) : null}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">{t('diario.volumeTotal')}</label>
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={vol}
              onChange={(e) => setVol(e.target.value)}
              inputMode="decimal"
              min={0}
              step="any"
            />
            <div className="w-[140px]">
              <SoftSelect
                value={volUnit}
                onChange={(u) => setVolUnit(u as 'L' | 'gal')}
                options={unitOpts}
                chipText={unitOpts.find((o) => o.value === volUnit)?.label ?? unitOpts[0].label}
                ariaLabel={t('germinacionDetail.potUnitLabel')}
                variant="field"
              />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t('diario.blockEntrada')}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500">{t('diario.ph')}</label>
              <input
                className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                value={inPh}
                onChange={(e) => setInPh(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500">{t('diario.ec')}</label>
              <input
                className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                value={inEc}
                onChange={(e) => setInEc(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </div>
        </div>
        {floracionMode ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-amber-700 focus:ring-amber-500"
              checked={flushStarted}
              onChange={(e) => {
                const on = e.target.checked
                setFlushStarted(on)
                if (on) {
                  setPureWater(true)
                  setRecipeToolId(null)
                }
              }}
            />
            <span>
              <span className="text-sm font-semibold text-amber-950">{t('diario.flushCheckboxTitle')}</span>
              <span className="mt-0.5 block text-[11px] text-amber-900/85">{t('diario.flushCheckboxHint')}</span>
            </span>
          </label>
        ) : null}
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">{t('diario.blockDrenaje')}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500">{t('diario.ph')} drenaje</label>
              <input
                className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                value={drPh}
                onChange={(e) => setDrPh(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500">{t('diario.ec')} drenaje</label>
              <input
                className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                value={drEc}
                onChange={(e) => setDrEc(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </div>
        </div>
      </div>
    </EnvModalFrame>
  )
}
