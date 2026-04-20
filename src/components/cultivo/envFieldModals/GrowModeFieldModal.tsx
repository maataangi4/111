import { useEffect, useMemo, useState } from 'react'
import type { PlantCardItem } from '../../../store/cultivationTypes'
import { SoftSelect } from '../../ui/SoftSelect'
import { EnvModalFrame } from './EnvModalFrame'

type TFn = (k: string) => string

export function GrowModeFieldModal({
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
  const [mode, setMode] = useState<'indoor' | 'outdoor'>('indoor')

  useEffect(() => {
    if (!open) return
    setMode(item.growMode === 'outdoor' ? 'outdoor' : 'indoor')
  }, [open, item])

  const options = useMemo(
    () => [
      { value: 'indoor' as const, label: t('germinacionDetail.growIndoor') },
      { value: 'outdoor' as const, label: t('germinacionDetail.growOutdoor') },
    ],
    [t],
  )

  if (!open) return null

  return (
    <EnvModalFrame
      title={t('germinacionDetail.modalGrowModeTitle')}
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
            className="rounded-full bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-green-800"
            onClick={() => {
              onSave({ growMode: mode })
              onClose()
            }}
          >
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="mt-4">
        <label className="block text-xs font-medium text-gray-600">
          {t('germinacionDetail.fieldGrowMode')}
        </label>
        <SoftSelect
          value={mode}
          onChange={(v) => setMode(v as 'indoor' | 'outdoor')}
          options={options}
          chipText={mode === 'outdoor' ? t('germinacionDetail.growOutdoor') : t('germinacionDetail.growIndoor')}
          ariaLabel={t('germinacionDetail.fieldGrowMode')}
          variant="field"
        />
      </div>
    </EnvModalFrame>
  )
}
