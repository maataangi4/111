import { useMemo } from 'react'
import {
  breederToOriginSelectValue,
  materialOriginLegalNoteKey,
  STRAIN_ORIGIN_PRESET_IDS,
  strainOriginPresetMsgKey,
  type StrainOriginSelectValue,
} from '../../lib/materialOrigin'
import { SoftSelect } from '../ui/SoftSelect'

type TFn = (k: string) => string

export function MaterialOriginSelect({
  value,
  onChange,
  t,
  inputClass,
  labelClass,
  label,
  ariaLabel,
}: {
  value: string | undefined
  onChange: (next: string | undefined) => void
  t: TFn
  inputClass: string
  labelClass: string
  label: string
  ariaLabel: string
}) {
  const originSelectValue = breederToOriginSelectValue(value, t)
  const hasSelection = Boolean(value?.trim())

  const originOptions = useMemo(() => {
    const presets = STRAIN_ORIGIN_PRESET_IDS.map((id) => ({
      value: id as StrainOriginSelectValue,
      label: t(strainOriginPresetMsgKey(id)),
    }))
    if (!hasSelection) {
      return [
        { value: 'unset' as StrainOriginSelectValue, label: t('cultivation.strainOriginUnset') },
        ...presets,
      ]
    }
    return presets
  }, [t, hasSelection])

  const originChipText =
    originSelectValue === 'unset'
      ? t('cultivation.strainOriginUnset')
      : t(strainOriginPresetMsgKey(originSelectValue))

  const noteKey = materialOriginLegalNoteKey(originSelectValue)

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <SoftSelect<StrainOriginSelectValue>
        value={originSelectValue}
        onChange={(v) => {
          if (v === 'unset') {
            onChange(undefined)
          } else {
            onChange(t(strainOriginPresetMsgKey(v)))
          }
        }}
        options={originOptions}
        chipText={originChipText}
        chipClassName={
          originSelectValue === 'unset' ? 'text-gray-400 dark:text-[#8c8c8c]' : undefined
        }
        ariaLabel={ariaLabel}
        variant="field"
        triggerClassName={inputClass}
        warning={!hasSelection}
      />
      {noteKey ? (
        <p
          className="mt-2 text-[12px] leading-snug text-gray-500 dark:text-[#a3a3a3]"
          role="note"
        >
          {t(noteKey)}
        </p>
      ) : null}
    </div>
  )
}
