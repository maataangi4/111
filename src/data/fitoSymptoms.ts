import type { AppLocale } from '../store/useSettingsStore'

export interface FitoSymptomTag {
  id: string
  es: string
  ru: string
}

/** Tags rápidos para la ficha fitosanitaria (multi-select). */
export const FITO_SYMPTOM_TAGS: FitoSymptomTag[] = [
  { id: 'yellow_leaves', es: 'Hojas amarillas', ru: 'Пожелтение листьев' },
  { id: 'yellow_spots', es: 'Manchas amarillas', ru: 'Жёлтые пятна' },
  { id: 'brown_spots', es: 'Puntos / manchas marrones', ru: 'Коричневые пятна' },
  { id: 'curling', es: 'Hojas enrolladas / taco', ru: 'Скручивание листьев' },
  { id: 'drooping', es: 'Hojas caídas (limpias)', ru: 'Опадение / вялость' },
  { id: 'insects', es: 'Presencia de insectos', ru: 'Насекомые / вредители' },
  { id: 'webbing', es: 'Telarañas / polvo', ru: 'Паутина / налёт' },
  { id: 'weak_stem', es: 'Tallo débil', ru: 'Слабый стебель' },
  { id: 'stunted', es: 'Crecimiento atrofiado', ru: 'Задержка роста' },
  { id: 'necrosis', es: 'Bordes / tejido necrótico', ru: 'Некроз краёв' },
  { id: 'mold', es: 'Moho / oidio visible', ru: 'Плесень / мучнистая роса' },
  { id: 'root_smell', es: 'Olor / raíces sospechosas', ru: 'Запах корней / подозрение на гниль' },
]

export function fitoSymptomLabel(tag: FitoSymptomTag, locale: AppLocale): string {
  return locale === 'ru' ? tag.ru : tag.es
}

export const FITO_SYMPTOM_IDS = new Set(FITO_SYMPTOM_TAGS.map((t) => t.id))
