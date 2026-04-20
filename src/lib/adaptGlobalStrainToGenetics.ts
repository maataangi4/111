import {
  STRAIN_TAGS_AROMAS,
  STRAIN_TAGS_EFECTOS,
} from '../data/strainProfileTags'
import type { GeneticsBankEntry } from '../store/cultivationTypes'
import type { UnifiedStrainRow } from '../store/useStrainsStore'

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const AROMA_MAP: Record<string, string> = {
  citrus: 'citrico',
  earthy: 'tierra',
  sweet: 'dulce',
  pine: 'pino',
  diesel: 'diesel',
  berry: 'baya',
  woody: 'madera',
  skunk: 'skunk',
  mint: 'menta',
  tropical: 'fruta_tropical',
  grape: 'uva',
  pineapple: 'pina',
  orange: 'naranja',
  lemon: 'limon',
  spicy: 'picante_herbal',
  herbal: 'picante_herbal',
  mango: 'mango',
  banana: 'fruta_tropical',
}

const EFFECT_MAP: Record<string, string> = {
  relaxed: 'relajacion',
  happy: 'felicidad',
  euphoric: 'euforia',
  energetic: 'energia',
  creative: 'creatividad',
  focused: 'concentracion',
  sleepy: 'sueno',
  hungry: 'hambre',
  talkative: 'sociabilidad',
  uplifted: 'euforia',
  giggly: 'risas',
  tingly: 'hormigueo',
  aroused: 'excitacion',
  inspired: 'inspiracion',
  calm: 'calma',
}

function mapListToTagIds(
  list: string[],
  dict: Record<string, string>,
  allowedIds: Set<string>,
): string[] {
  const out = new Set<string>()
  for (const raw of list) {
    const key = norm(raw)
    const mapped = dict[key]
    if (mapped && allowedIds.has(mapped)) out.add(mapped)
  }
  return [...out]
}

export function adaptGlobalStrainToGeneticsDraft(
  row: UnifiedStrainRow,
  prev: Omit<GeneticsBankEntry, 'id'>,
): Omit<GeneticsBankEntry, 'id'> {
  if (row.source !== 'global') return prev

  const aromaAllowed = new Set(STRAIN_TAGS_AROMAS.map((t) => t.id))
  const effectAllowed = new Set(STRAIN_TAGS_EFECTOS.map((t) => t.id))
  const aromas = mapListToTagIds(row.flavors ?? [], AROMA_MAP, aromaAllowed)
  const efectosPositivos = mapListToTagIds(
    row.effects ?? [],
    EFFECT_MAP,
    effectAllowed,
  )

  const typeText = String(row.type ?? '').trim()

  return {
    ...prev,
    name: row.name,
    summary: typeText || prev.summary,
    lineage: typeText || prev.lineage,
    geneticRatio:
      norm(typeText) === 'indica'
        ? '80% Indica / 20% Sativa'
        : norm(typeText) === 'sativa'
          ? '20% Indica / 80% Sativa'
          : norm(typeText) === 'hybrid'
            ? '50% Indica / 50% Sativa'
            : prev.geneticRatio,
    notes:
      [
        'Source: Global Cannabis API',
        row.flavors?.length ? `Flavors: ${row.flavors.join(', ')}` : '',
        row.effects?.length ? `Effects: ${row.effects.join(', ')}` : '',
        row.description ? `Description: ${row.description}` : '',
      ]
        .filter(Boolean)
        .join('\n') || prev.notes,
    aromas: aromas.length ? aromas : prev.aromas,
    efectosPositivos: efectosPositivos.length ? efectosPositivos : prev.efectosPositivos,
  }
}

