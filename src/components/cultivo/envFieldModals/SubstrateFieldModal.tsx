import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { PlantCardItem, SubstratePresetCode } from '../../../store/cultivationTypes'
import { SUBSTRATE_PRESET_ORDER, inferSubstratePresetDraft } from '../../../lib/environmentFieldPresets'
import { SoftSelect } from '../../ui/SoftSelect'
import { EnvModalFrame } from './EnvModalFrame'

type TFn = (k: string) => string

function substrateLabel(code: SubstratePresetCode, t: TFn): string {
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

export function SubstrateFieldModal({
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
  const [code, setCode] = useState<SubstratePresetCode | ''>('')
  const [custom, setCustom] = useState('')

  useEffect(() => {
    if (!open) return
    const d = inferSubstratePresetDraft(item)
    setCode(d.code)
    setCustom(d.custom)
  }, [open, item])

  const options: { value: SubstratePresetCode | ''; label: string }[] = useMemo(
    () => [
      { value: '', label: t('germinacionDetail.presetPick') },
      ...SUBSTRATE_PRESET_ORDER.map((c) => ({ value: c, label: substrateLabel(c, t) })),
    ],
    [t],
  )

  const chipText =
    code && code !== 'other'
      ? substrateLabel(code, t)
      : code === 'other'
        ? custom.trim() || t('germinacionDetail.irrigOther')
        : t('germinacionDetail.presetPick')

  if (!open) return null

  const handleSave = () => {
    if (code === 'other') {
      const text = custom.trim()
      if (!text) return
      onSave({
        substratePresetCode: 'other',
        substrateType: text,
      })
      onClose()
      return
    }
    if (code) {
      onSave({
        substratePresetCode: code,
        substrateType: undefined,
      })
      onClose()
    }
  }

  return (
    <EnvModalFrame
      title={t('germinacionDetail.modalSubstrateTitle')}
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
            disabled={!code || (code === 'other' && !custom.trim())}
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
              const nv = v as SubstratePresetCode | ''
              setCode(nv)
              if (nv !== 'other') setCustom('')
            }}
            options={options}
            chipText={chipText}
            ariaLabel={t('germinacionDetail.modalSubstrateTitle')}
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
              placeholder={t('germinacionDetail.subTypeCustomPh')}
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
    </EnvModalFrame>
  )
}
