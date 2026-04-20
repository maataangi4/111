import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { LightingPresetCode, PlantCardItem } from '../../../store/cultivationTypes'
import { LIGHTING_PRESET_ORDER, inferLightingPresetDraft } from '../../../lib/environmentFieldPresets'
import { SoftSelect } from '../../ui/SoftSelect'
import { EnvModalFrame } from './EnvModalFrame'

type TFn = (k: string) => string

function lightingLabel(code: LightingPresetCode, t: TFn): string {
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

export function LightingFieldModal({
  open,
  item,
  onClose,
  onSave,
  t,
  propagadorMode = false,
}: {
  open: boolean
  item: PlantCardItem
  onClose: () => void
  onSave: (patch: Partial<PlantCardItem>) => void
  t: TFn
  /** Форма из 3 полей: Equipo, Fotoperiodo (24/0), Intensidad PPFD. */
  propagadorMode?: boolean
}) {
  const [code, setCode] = useState<LightingPresetCode | ''>('')
  const [custom, setCustom] = useState('')
  const [schedule, setSchedule] = useState('')
  const [ppfd, setPpfd] = useState('')

  useEffect(() => {
    if (!open) return
    const d = inferLightingPresetDraft(item)
    setCode(d.code)
    setCustom(d.custom)
    if (propagadorMode) {
      setSchedule(item.lightingSchedule?.trim() || '24/0')
      setPpfd(
        item.lightingPpfd != null && Number.isFinite(item.lightingPpfd)
          ? String(Math.round(item.lightingPpfd))
          : '',
      )
    } else {
      setSchedule('')
      setPpfd('')
    }
  }, [open, item, propagadorMode])

  const options: { value: LightingPresetCode | ''; label: string }[] = useMemo(
    () => [
      { value: '', label: t('germinacionDetail.presetPick') },
      ...LIGHTING_PRESET_ORDER.map((c) => ({ value: c, label: lightingLabel(c, t) })),
    ],
    [t],
  )

  const chipText =
    code && code !== 'other'
      ? lightingLabel(code, t)
      : code === 'other'
        ? custom.trim() || t('germinacionDetail.irrigOther')
        : t('germinacionDetail.presetPick')

  const ppfdTrim = ppfd.trim()
  const ppfdInvalid =
    propagadorMode && ppfdTrim.length > 0 && !Number.isFinite(Number.parseFloat(ppfdTrim.replace(',', '.')))

  if (!open) return null

  const basePatch = (): Partial<PlantCardItem> | null => {
    if (code === 'other') {
      const text = custom.trim()
      if (!text) return null
      return {
        lightingPresetCode: 'other',
        lightingCustom: text,
        lightingSpec: undefined,
      }
    }
    if (code) {
      return {
        lightingPresetCode: code,
        lightingCustom: undefined,
        lightingSpec: undefined,
      }
    }
    return null
  }

  const handleSave = () => {
    const base = basePatch()
    if (!base) return
    if (propagadorMode) {
      if (ppfdInvalid) return
      const n = ppfdTrim.length ? Math.round(Number.parseFloat(ppfdTrim.replace(',', '.'))) : NaN
      onSave({
        ...base,
        lightingSchedule: schedule.trim() || undefined,
        lightingPpfd: ppfdTrim.length && Number.isFinite(n) && n >= 0 ? n : undefined,
      })
    } else {
      onSave(base)
    }
    onClose()
  }

  const canSave = Boolean(code && (code !== 'other' || custom.trim()) && (!propagadorMode || !ppfdInvalid))

  return (
    <EnvModalFrame
      title={t('germinacionDetail.modalLightingTitle')}
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
            disabled={!canSave}
          >
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="mt-4 space-y-3">
        {propagadorMode ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">{t('germinacionDetail.lightFieldEquipo')}</label>
            {code !== 'other' ? (
              <SoftSelect
                value={code}
                onChange={(v) => {
                  const nv = v as LightingPresetCode | ''
                  setCode(nv)
                  if (nv === 'other') setCustom('')
                  if (nv !== 'other') setCustom('')
                }}
                options={options}
                chipText={chipText}
                ariaLabel={t('germinacionDetail.lightFieldEquipo')}
                variant="field"
              />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder={t('germinacionDetail.lightTypeCustomPh')}
                />
                <button
                  type="button"
                  className="text-xs font-medium text-sky-700 underline underline-offset-2"
                  onClick={() => {
                    setCode('')
                    setCustom('')
                  }}
                >
                  {t('germinacionDetail.backToPresetList')}
                </button>
              </motion.div>
            )}
          </div>
        ) : code !== 'other' ? (
          <SoftSelect
            value={code}
            onChange={(v) => {
              const nv = v as LightingPresetCode | ''
              setCode(nv)
              if (nv === 'other') setCustom('')
              if (nv !== 'other') setCustom('')
            }}
            options={options}
            chipText={chipText}
            ariaLabel={t('germinacionDetail.modalLightingTitle')}
            variant="field"
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <input
              type="text"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={t('germinacionDetail.lightTypeCustomPh')}
            />
            <button
              type="button"
              className="text-xs font-medium text-sky-700 underline underline-offset-2"
              onClick={() => {
                setCode('')
                setCustom('')
              }}
            >
              {t('germinacionDetail.backToPresetList')}
            </button>
          </motion.div>
        )}

        {propagadorMode ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {t('germinacionDetail.lightFieldFotoperiodo')}
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm tabular-nums"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder={t('germinacionDetail.lightFotoperiodoPh')}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {t('germinacionDetail.lightFieldIntensity')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-14 text-sm tabular-nums"
                  value={ppfd}
                  onChange={(e) => setPpfd(e.target.value)}
                  placeholder="PPFD"
                  aria-invalid={ppfdInvalid}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                  PPFD
                </span>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">{t('germinacionDetail.lightPropagadorPpfdHint')}</p>
            </div>
          </>
        ) : null}
      </div>
    </EnvModalFrame>
  )
}
