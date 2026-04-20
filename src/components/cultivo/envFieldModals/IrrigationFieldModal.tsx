import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { IrrigationMethodCode, PlantCardItem } from '../../../store/cultivationTypes'
import { IRRIGATION_MODAL_ORDER, inferIrrigationModalDraft } from '../../../lib/environmentFieldPresets'
import { SoftSelect } from '../../ui/SoftSelect'
import { EnvModalFrame } from './EnvModalFrame'

type TFn = (k: string) => string

function irrigLabel(code: IrrigationMethodCode, t: TFn): string {
  const keys: Record<IrrigationMethodCode, string> = {
    manual: 'germinacionDetail.irrigManual',
    drip: 'germinacionDetail.irrigDrip',
    ebb_flow: 'germinacionDetail.irrigEbbFlow',
    nft: 'germinacionDetail.irrigNft',
    dwc: 'germinacionDetail.irrigDwc',
    autopot: 'germinacionDetail.irrigAutopot',
    wick: 'germinacionDetail.irrigWick',
    aeroponic: 'germinacionDetail.irrigAeroponic',
    sprinkler: 'germinacionDetail.irrigSprinkler',
    other: 'germinacionDetail.irrigOther',
  }
  return t(keys[code])
}

export function IrrigationFieldModal({
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
  const [code, setCode] = useState<IrrigationMethodCode | ''>('')
  const [custom, setCustom] = useState('')

  useEffect(() => {
    if (!open) return
    const d = inferIrrigationModalDraft(item)
    setCode(d.code)
    setCustom(d.custom)
  }, [open, item])

  const options: { value: IrrigationMethodCode | ''; label: string }[] = useMemo(
    () => [
      { value: '', label: t('germinacionDetail.irrigPick') },
      ...IRRIGATION_MODAL_ORDER.map((c) => ({ value: c, label: irrigLabel(c, t) })),
    ],
    [t],
  )

  const chipText =
    code && code !== 'other'
      ? irrigLabel(code, t)
      : code === 'other'
        ? custom.trim() || t('germinacionDetail.irrigOther')
        : t('germinacionDetail.irrigPick')

  if (!open) return null

  const handleSave = () => {
    if (code === 'other') {
      const text = custom.trim()
      if (!text) return
      onSave({
        irrigationMethodCode: 'other',
        irrigationMethodCustom: text,
      })
      onClose()
      return
    }
    if (code) {
      onSave({
        irrigationMethodCode: code,
        irrigationMethodCustom: undefined,
      })
      onClose()
    }
  }

  return (
    <EnvModalFrame
      title={t('germinacionDetail.modalIrrigationTitle')}
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
              const nv = v as IrrigationMethodCode | ''
              setCode(nv)
              if (nv !== 'other') setCustom('')
            }}
            options={options}
            chipText={chipText}
            ariaLabel={t('germinacionDetail.modalIrrigationTitle')}
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
              placeholder={t('germinacionDetail.irrigMethodCustomPh')}
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
