import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { PlantCardItem, PotVolumePresetCode } from '../../../store/cultivationTypes'
import { POT_PRESET_LITERS, POT_VOLUME_PRESET_ORDER, inferPotVolumeDraft } from '../../../lib/environmentFieldPresets'
import { SoftSelect } from '../../ui/SoftSelect'
import { EnvModalFrame } from './EnvModalFrame'

type TFn = (k: string) => string

function potPresetLabel(code: Exclude<PotVolumePresetCode, 'other'>, t: TFn): string {
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

export function PotVolumeFieldModal({
  open,
  item,
  onClose,
  onSave,
  t,
}: {
  open: boolean
  item: PlantCardItem
  onClose: () => void
  onSave: (patch: Partial<PlantCardItem>) => void
  t: TFn
}) {
  const [code, setCode] = useState<PotVolumePresetCode | ''>('')
  const [customVal, setCustomVal] = useState('')
  const [unit, setUnit] = useState<'L' | 'gal'>('L')

  useEffect(() => {
    if (!open) return
    const d = inferPotVolumeDraft(item)
    setCode(d.code)
    setCustomVal(d.customVal)
    setUnit(d.unit)
  }, [open, item])

  const options: { value: PotVolumePresetCode | ''; label: string }[] = useMemo(
    () => [
      { value: '', label: t('germinacionDetail.presetPick') },
      ...POT_VOLUME_PRESET_ORDER.map((c) => ({
        value: c,
        label: c === 'other' ? t('germinacionDetail.irrigOther') : potPresetLabel(c, t),
      })),
    ],
    [t],
  )

  const unitOptions = useMemo(
    () => [
      { value: 'L' as const, label: t('germinacionDetail.potUnitL') },
      { value: 'gal' as const, label: t('germinacionDetail.potUnitGal') },
    ],
    [t],
  )

  if (!open) return null

  const handleSave = () => {
    if (code === 'other') {
      const n = customVal.trim() === '' ? NaN : Number(customVal.replace(',', '.'))
      if (!Number.isFinite(n) || n <= 0) return
      onSave({
        potVolumePresetCode: 'other',
        potSizeValue: n,
        potSizeUnit: unit,
      })
      onClose()
      return
    }
    if (code && code in POT_PRESET_LITERS) {
      const liters = POT_PRESET_LITERS[code as Exclude<PotVolumePresetCode, 'other'>]
      onSave({
        potVolumePresetCode: code as Exclude<PotVolumePresetCode, 'other'>,
        potSizeValue: liters,
        potSizeUnit: 'L',
      })
      onClose()
    }
  }

  return (
    <EnvModalFrame
      title={t('germinacionDetail.modalPotVolumeTitle')}
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
              !code ||
              (code === 'other' &&
                (customVal.trim() === '' ||
                  !Number.isFinite(Number(customVal.replace(',', '.'))) ||
                  Number(customVal.replace(',', '.')) <= 0))
            }
          >
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="mt-4 space-y-3">
        {code !== 'other' ? (
          <SoftSelect
            value={code}
            onChange={(v) => {
              const nv = v as PotVolumePresetCode | ''
              setCode(nv)
              if (nv !== 'other') setCustomVal('')
            }}
            options={options}
            chipText={code === '' ? t('germinacionDetail.presetPick') : potPresetLabel(code, t)}
            ariaLabel={t('germinacionDetail.modalPotVolumeTitle')}
            variant="field"
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {t('germinacionDetail.potVolCustomLabel')}
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={customVal}
                  onChange={(e) => setCustomVal(e.target.value)}
                  placeholder={t('germinacionDetail.potVolCustomPh')}
                  inputMode="decimal"
                  min={0}
                  step="any"
                />
              </div>
              <div className="w-[140px]">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {t('germinacionDetail.potUnitLabel')}
                </label>
                <SoftSelect
                  value={unit}
                  onChange={(v) => setUnit(v as 'L' | 'gal')}
                  options={unitOptions}
                  chipText={unitOptions.find((o) => o.value === unit)?.label ?? unitOptions[0].label}
                  ariaLabel={t('germinacionDetail.potUnitLabel')}
                  variant="field"
                />
              </div>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-sky-700 underline underline-offset-2"
              onClick={() => {
                setCode('')
                setCustomVal('')
              }}
            >
              {t('germinacionDetail.backToPresetList')}
            </button>
          </motion.div>
        )}
      </div>
    </EnvModalFrame>
  )
}
