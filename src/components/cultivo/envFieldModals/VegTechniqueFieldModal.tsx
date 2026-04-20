import { useEffect, useMemo, useState } from 'react'
import {
  VEG_CULTIVATION_TECHNIQUE_ORDER,
  type PlantCardItem,
  type VegCultivationTechniqueCode,
} from '../../../store/cultivationTypes'
import { SoftSelect } from '../../ui/SoftSelect'
import { EnvModalFrame } from './EnvModalFrame'

type TFn = (k: string) => string

function techniqueLabel(code: VegCultivationTechniqueCode, t: TFn): string {
  const keys: Record<VegCultivationTechniqueCode, string> = {
    tradicional: 'vegetacionDetail.techniqueTradicional',
    scrog: 'vegetacionDetail.techniqueScrog',
    sog: 'vegetacionDetail.techniqueSog',
    lst: 'vegetacionDetail.techniqueLst',
    mainlining: 'vegetacionDetail.techniqueMainlining',
    supercropping: 'vegetacionDetail.techniqueSupercropping',
    other: 'vegetacionDetail.techniqueOther',
  }
  return t(keys[code])
}

export function VegTechniqueFieldModal({
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
  const [code, setCode] = useState<VegCultivationTechniqueCode | ''>('')
  const [custom, setCustom] = useState('')

  useEffect(() => {
    if (!open) return
    const c = item.vegCultivationTechniqueCode
    if (c) {
      setCode(c)
      setCustom(c === 'other' ? (item.vegCultivationTechniqueCustom?.trim() ?? '') : '')
    } else {
      setCode('')
      setCustom('')
    }
  }, [open, item])

  const options: { value: VegCultivationTechniqueCode | ''; label: string }[] = useMemo(
    () => [
      { value: '', label: t('vegetacionDetail.techniquePick') },
      ...VEG_CULTIVATION_TECHNIQUE_ORDER.map((c) => ({ value: c, label: techniqueLabel(c, t) })),
    ],
    [t],
  )

  const chipText =
    code && code !== 'other'
      ? techniqueLabel(code, t)
      : code === 'other'
        ? custom.trim() || techniqueLabel('other', t)
        : t('vegetacionDetail.techniquePick')

  if (!open) return null

  const handleSave = () => {
    if (!code) return
    if (code === 'other') {
      const text = custom.trim()
      if (!text) return
      onSave({
        vegCultivationTechniqueCode: 'other',
        vegCultivationTechniqueCustom: text,
      })
      onClose()
      return
    }
    onSave({
      vegCultivationTechniqueCode: code,
      vegCultivationTechniqueCustom: undefined,
    })
    onClose()
  }

  return (
    <EnvModalFrame
      title={t('vegetacionDetail.modalTechniqueTitle')}
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
        <label className="block text-xs font-medium text-gray-600">
          {t('vegetacionDetail.fieldTechnique')}
        </label>
        <SoftSelect
          value={code}
          onChange={(v) => setCode((v || '') as VegCultivationTechniqueCode | '')}
          options={options}
          chipText={chipText}
          ariaLabel={t('vegetacionDetail.fieldTechnique')}
          variant="field"
        />
        {code === 'other' ? (
          <label className="block">
            <span className="text-xs font-medium text-gray-600">
              {t('vegetacionDetail.techniqueCustomLabel')}
            </span>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={t('vegetacionDetail.techniqueCustomPh')}
            />
          </label>
        ) : null}
      </div>
    </EnvModalFrame>
  )
}
