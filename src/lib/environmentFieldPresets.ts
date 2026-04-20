import type {
  IrrigationMethodCode,
  LightingPresetCode,
  PlantCardItem,
  PotVolumePresetCode,
  SubstratePresetCode,
} from '../store/cultivationTypes'

export const LIGHTING_PRESET_ORDER: LightingPresetCode[] = [
  'led',
  'hps',
  'cmh',
  'fluorescent',
  'sun',
  'other',
]

export const SUBSTRATE_PRESET_ORDER: SubstratePresetCode[] = [
  'soil',
  'coco',
  'rockwool',
  'water_hydro',
  'leca',
  'other',
]

/** Riego — solo las opciones de esta pantalla (orden fijo). */
export const IRRIGATION_MODAL_ORDER: IrrigationMethodCode[] = [
  'manual',
  'drip',
  'ebb_flow',
  'nft',
  'dwc',
  'other',
]

export const POT_VOLUME_PRESET_ORDER: PotVolumePresetCode[] = [
  '1',
  '3',
  '5',
  '7',
  '11',
  '15',
  '20',
  '50_plus',
  'other',
]

export const POT_PRESET_LITERS: Record<Exclude<PotVolumePresetCode, 'other'>, number> = {
  '1': 1,
  '3': 3,
  '5': 5,
  '7': 7,
  '11': 11,
  '15': 15,
  '20': 20,
  '50_plus': 50,
}

/** Inicializa código de iluminación desde tarjeta (incl. legacy `lightingSpec`). */
export function inferLightingPresetDraft(item: PlantCardItem): {
  code: LightingPresetCode | ''
  custom: string
} {
  if (item.lightingPresetCode) {
    if (item.lightingPresetCode === 'other') {
      return { code: 'other', custom: item.lightingCustom?.trim() ?? '' }
    }
    return { code: item.lightingPresetCode, custom: '' }
  }
  const leg = item.lightingSpec?.trim()
  if (leg) return { code: 'other', custom: leg }
  return { code: '', custom: '' }
}

export function inferSubstratePresetDraft(item: PlantCardItem): {
  code: SubstratePresetCode | ''
  custom: string
} {
  if (item.substratePresetCode) {
    if (item.substratePresetCode === 'other') {
      return { code: 'other', custom: item.substrateType?.trim() ?? '' }
    }
    return { code: item.substratePresetCode, custom: '' }
  }
  const leg = item.substrateType?.trim()
  if (leg) return { code: 'other', custom: leg }
  return { code: '', custom: '' }
}

export function inferIrrigationModalDraft(item: PlantCardItem): {
  code: IrrigationMethodCode | ''
  custom: string
} {
  const allowed = new Set(IRRIGATION_MODAL_ORDER)
  const c = item.irrigationMethodCode
  if (c && allowed.has(c)) {
    if (c === 'other') {
      return { code: 'other', custom: item.irrigationMethodCustom?.trim() ?? '' }
    }
    return { code: c, custom: '' }
  }
  if (c === 'other' || item.irrigationMethodCustom?.trim()) {
    return { code: 'other', custom: item.irrigationMethodCustom?.trim() ?? '' }
  }
  if (c) {
    return { code: 'other', custom: item.irrigationMethodCustom?.trim() ?? '' }
  }
  return { code: '', custom: '' }
}

export function inferPotVolumeDraft(item: PlantCardItem): {
  code: PotVolumePresetCode | ''
  customVal: string
  unit: 'L' | 'gal'
} {
  const unit = item.potSizeUnit === 'gal' ? 'gal' : 'L'
  if (item.potVolumePresetCode) {
    if (item.potVolumePresetCode === 'other') {
      const v =
        item.potSizeValue != null && item.potSizeValue > 0 ? String(item.potSizeValue) : ''
      return { code: 'other', customVal: v, unit }
    }
    return { code: item.potVolumePresetCode, customVal: '', unit: 'L' }
  }
  if (item.potSizeValue != null && item.potSizeValue > 0 && unit === 'L') {
    const n = item.potSizeValue
    const match = (Object.entries(POT_PRESET_LITERS) as [Exclude<PotVolumePresetCode, 'other'>, number][]).find(
      ([, lit]) => Math.abs(lit - n) < 0.01,
    )
    if (match) return { code: match[0], customVal: '', unit: 'L' }
  }
  if (item.potSizeValue != null && item.potSizeValue > 0) {
    return {
      code: 'other',
      customVal: String(item.potSizeValue),
      unit,
    }
  }
  return { code: '', customVal: '', unit: 'L' }
}
