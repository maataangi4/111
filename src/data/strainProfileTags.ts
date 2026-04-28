import type { AppLocale } from '../store/useSettingsStore'

/** Perfil tipo Leafly: ids estables para persistencia; etiquetas ES/RU. */
export interface StrainProfileTag {
  id: string
  es: string
  ru: string
}

export const STRAIN_TAGS_AROMAS: StrainProfileTag[] = [
  { id: 'citrico', es: 'Cítrico', ru: 'Цитрус' },
  { id: 'tierra', es: 'Tierra', ru: 'Земля / почва' },
  { id: 'dulce', es: 'Dulce', ru: 'Сладость' },
  { id: 'pino', es: 'Pino', ru: 'Хвоя / сосна' },
  { id: 'diesel', es: 'Diésel', ru: 'Дизель' },
  { id: 'baya', es: 'Baya', ru: 'Ягода' },
  { id: 'madera', es: 'Madera', ru: 'Древесина' },
  { id: 'skunk', es: 'Skunk', ru: 'Сканк' },
  { id: 'queso', es: 'Queso', ru: 'Сыр' },
  { id: 'picante_herbal', es: 'Picante/Herbal', ru: 'Пряности / травы' },
  { id: 'fruta_tropical', es: 'Fruta Tropical', ru: 'Тропические фрукты' },
  { id: 'floral', es: 'Floral', ru: 'Цветочный' },
  { id: 'pimienta', es: 'Pimienta', ru: 'Перец' },
  { id: 'menta', es: 'Menta', ru: 'Мята' },
  { id: 'manzana', es: 'Manzana', ru: 'Яблоко' },
  { id: 'albaricoque', es: 'Albaricoque', ru: 'Абрикос' },
  { id: 'queso_azul', es: 'Queso Azul', ru: 'Голубой сыр' },
  { id: 'arandano', es: 'Arándano', ru: 'Черника / брусника' },
  { id: 'mantequilla', es: 'Mantequilla', ru: 'Сливочное / масло' },
  { id: 'castana', es: 'Castaña', ru: 'Каштан' },
  { id: 'cafe', es: 'Café', ru: 'Кофе' },
  { id: 'uva', es: 'Uva', ru: 'Виноград' },
  { id: 'pomelo', es: 'Pomelo', ru: 'Грейпфрут' },
  { id: 'miel', es: 'Miel', ru: 'Мёд' },
  { id: 'lavanda', es: 'Lavanda', ru: 'Лаванда' },
  { id: 'limon', es: 'Limón', ru: 'Лимон' },
  { id: 'mango', es: 'Mango', ru: 'Манго' },
  { id: 'nuez', es: 'Nuez', ru: 'Орех' },
  { id: 'naranja', es: 'Naranja', ru: 'Апельсин' },
  { id: 'melocoton', es: 'Melocotón', ru: 'Персик' },
  { id: 'pera', es: 'Pera', ru: 'Груша' },
  { id: 'pina', es: 'Piña', ru: 'Ананас' },
  { id: 'ciruela', es: 'Ciruela', ru: 'Слива' },
  { id: 'rosa', es: 'Rosa', ru: 'Роза' },
  { id: 'salvia', es: 'Salvia', ru: 'Шалфей' },
  { id: 'fresa', es: 'Fresa', ru: 'Клубника' },
  { id: 'alquitran', es: 'Alquitrán', ru: 'Смола / гудрон' },
  { id: 'te', es: 'Té', ru: 'Чай' },
  { id: 'tabaco', es: 'Tabaco', ru: 'Табак' },
  { id: 'vainilla', es: 'Vainilla', ru: 'Ваниль' },
  { id: 'violeta', es: 'Violeta', ru: 'Фиалка' },
  { id: 'amoniaco', es: 'Amoníaco', ru: 'Аммиак' },
  { id: 'quimico', es: 'Químico', ru: 'Химический' },
  { id: 'mofeta', es: 'Mofeta', ru: 'Скунс' },
]

export const STRAIN_TAGS_EFECTOS: StrainProfileTag[] = [
  { id: 'relajacion', es: 'Relajación', ru: 'Расслабление' },
  { id: 'felicidad', es: 'Bienestar', ru: 'Благополучие' },
  { id: 'energia', es: 'Energía', ru: 'Энергия' },
  { id: 'creatividad', es: 'Claridad mental', ru: 'Ясность мышления' },
  { id: 'concentracion', es: 'Concentración', ru: 'Концентрация' },
  { id: 'risas', es: 'Elevación del estado de ánimo', ru: 'Улучшение настроения' },
  { id: 'sociabilidad', es: 'Sociabilidad', ru: 'Общительность' },
  { id: 'hormigueo', es: 'Parestesias leves', ru: 'Лёгкие парестезии' },
  { id: 'sueno', es: 'Sueño', ru: 'Сонливость' },
  { id: 'hambre', es: 'Estimulación del apetito', ru: 'Стимуляция аппетита' },
  { id: 'inspiracion', es: 'Motivación', ru: 'Мотивация' },
  { id: 'calma', es: 'Calma', ru: 'Спокойствие' },
]

export const STRAIN_TAGS_MEDICINAL: StrainProfileTag[] = [
  { id: 'estres', es: 'Estrés', ru: 'Стресс' },
  { id: 'dolor_cronico', es: 'Dolor Crónico', ru: 'Хроническая боль' },
  { id: 'ansiedad_med', es: 'Ansiedad', ru: 'Тревога' },
  { id: 'depresion', es: 'Depresión', ru: 'Депрессия' },
  { id: 'insomnio', es: 'Insomnio', ru: 'Бессонница' },
  { id: 'falta_apetito', es: 'Falta de Apetito', ru: 'Снижение аппетита' },
  { id: 'espasmos', es: 'Espasmos Musculares', ru: 'Мышечные спазмы' },
  { id: 'nauseas', es: 'Náuseas', ru: 'Тошнота' },
  { id: 'fatiga', es: 'Fatiga', ru: 'Усталость' },
  { id: 'migranas', es: 'Dolores de Cabeza / Migrañas', ru: 'Головная боль / мигрень' },
  { id: 'presion_ocular', es: 'Presión Ocular', ru: 'Глазное давление' },
  { id: 'inflamacion', es: 'Inflamación', ru: 'Воспаление' },
  { id: 'convulsiones', es: 'Convulsiones', ru: 'Судороги' },
  { id: 'tept', es: 'TEPT (PTSD)', ru: 'ПТСР' },
  { id: 'artritis', es: 'Artritis', ru: 'Артрит' },
  { id: 'calambres', es: 'Calambres', ru: 'Судороги / спазмы' },
]

export const STRAIN_TAGS_TERPENOS: StrainProfileTag[] = [
  { id: 'mirceno', es: 'Mirceno', ru: 'Мирцен' },
  { id: 'cariofileno', es: 'Cariofileno', ru: 'Кариофиллен' },
  { id: 'limoneno', es: 'Limoneno', ru: 'Лимонен' },
  { id: 'pineno', es: 'Pineno', ru: 'Пинен' },
  { id: 'linalool', es: 'Linalool', ru: 'Линалол' },
  { id: 'humuleno', es: 'Humuleno', ru: 'Хумулен' },
  { id: 'terpinoleno', es: 'Terpinoleno', ru: 'Терпинолен' },
  { id: 'ocimeno', es: 'Ocimeno', ru: 'Оцимен' },
  { id: 'bisabolol', es: 'Bisabolol', ru: 'Бисаболол' },
  { id: 'eucaliptol', es: 'Eucaliptol', ru: 'Эвкалиптол' },
  { id: 'geraniol', es: 'Geraniol', ru: 'Гераниол' },
  { id: 'canfeno', es: 'Canfeno', ru: 'Камфен' },
]

export const STRAIN_TAGS_NEGATIVOS: StrainProfileTag[] = [
  { id: 'boca_seca', es: 'Sequedad bucal', ru: 'Сухость во рту' },
  { id: 'ojos_secos', es: 'Sequedad ocular', ru: 'Сухость глаз' },
  { id: 'mareo', es: 'Mareos', ru: 'Головокружение' },
  { id: 'paranoia', es: 'Nerviosismo', ru: 'Нервозность' },
  { id: 'ansiedad_neg', es: 'Ansiedad', ru: 'Тревожность (побочный)' },
  { id: 'dolor_cabeza_neg', es: 'Cefalea', ru: 'Головная боль' },
]

export const STRAIN_TAGS_BY_LIST = {
  aromas: STRAIN_TAGS_AROMAS,
  efectos: STRAIN_TAGS_EFECTOS,
  medicinal: STRAIN_TAGS_MEDICINAL,
  terpenos: STRAIN_TAGS_TERPENOS,
  efectosNegativos: STRAIN_TAGS_NEGATIVOS,
} as const

export type StrainTagListKey = keyof typeof STRAIN_TAGS_BY_LIST

/** Conjunto de ids permitidos por categoría (lista). */
export const ALLOWED_IDS_BY_LIST: Record<StrainTagListKey, Set<string>> = {
  aromas: new Set(STRAIN_TAGS_AROMAS.map((t) => t.id)),
  efectos: new Set(STRAIN_TAGS_EFECTOS.map((t) => t.id)),
  medicinal: new Set(STRAIN_TAGS_MEDICINAL.map((t) => t.id)),
  terpenos: new Set(STRAIN_TAGS_TERPENOS.map((t) => t.id)),
  efectosNegativos: new Set(STRAIN_TAGS_NEGATIVOS.map((t) => t.id)),
}

export function strainTagLabel(tag: StrainProfileTag, locale: AppLocale): string {
  return locale === 'ru' ? tag.ru : tag.es
}

export function sanitizeStrainTagIds(
  raw: unknown,
  listKey: StrainTagListKey,
): string[] {
  if (!Array.isArray(raw)) return []
  const allowed = ALLOWED_IDS_BY_LIST[listKey]
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of raw) {
    if (typeof x !== 'string') continue
    const id = x.trim()
    if (!id || !allowed.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}
