export const STRAIN_ORIGIN_PRESET_IDS = ['inase', 'germoplasma', 'institucional', 'cruza'] as const
export type StrainOriginPresetId = (typeof STRAIN_ORIGIN_PRESET_IDS)[number]
export type StrainOriginSelectValue = StrainOriginPresetId | 'unset'

export function strainOriginPresetMsgKey(id: StrainOriginPresetId): string {
  switch (id) {
    case 'inase':
      return 'cultivation.strainOriginOptInase'
    case 'germoplasma':
      return 'cultivation.strainOriginOptGermoplasma'
    case 'institucional':
      return 'cultivation.strainOriginOptInstitucional'
    case 'cruza':
      return 'cultivation.strainOriginOptCruza'
  }
}

/** Valores guardados antes del renombre «Genética Independiente». */
export const LEGACY_GERM_BREEDER = [
  'Germoplasma a Identificar (I+D)',
  'Гермоплазма на идентификацию (И+И)',
]

export function breederToOriginSelectValue(
  breeder: string | undefined,
  translate: (k: string) => string,
): StrainOriginSelectValue {
  if (!breeder?.trim()) return 'unset'
  if (LEGACY_GERM_BREEDER.includes(breeder.trim())) return 'germoplasma'
  for (const id of STRAIN_ORIGIN_PRESET_IDS) {
    if (translate(strainOriginPresetMsgKey(id)) === breeder) return id
  }
  return 'unset'
}

export function materialOriginLegalNoteKey(
  id: StrainOriginPresetId | 'unset',
): string | null {
  if (id === 'unset') return null
  switch (id) {
    case 'inase':
      return 'cultivation.strainOriginInaseLegalNote'
    case 'germoplasma':
      return 'cultivation.strainOriginGermoplasmaLegalNote'
    case 'institucional':
      return 'cultivation.strainOriginInstitucionalLegalNote'
    case 'cruza':
      return 'cultivation.strainOriginCruzaLegalNote'
  }
}
