import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface StrainBaseRow {
  id: string
  name: string
  type: string
  rating: number
  effects: string[]
  flavors: string[]
  description?: string
}

export interface LocalStrainRow extends StrainBaseRow {
  tenantId: string
  createdAt: string
}

export type UnifiedStrainRow = (StrainBaseRow | LocalStrainRow) & {
  source: 'global' | 'local'
  verified: boolean
}

const GLOBAL_STRAINS_SEED: StrainBaseRow[] = [
  {
    id: 'g-blue-dream',
    name: 'Blue Dream',
    type: 'Hybrid',
    rating: 4.6,
    effects: ['Creative', 'Happy', 'Relaxed'],
    flavors: ['Berry', 'Sweet', 'Earthy'],
  },
  {
    id: 'g-og-kush',
    name: 'OG Kush',
    type: 'Hybrid',
    rating: 4.7,
    effects: ['Relaxed', 'Sleepy', 'Euphoric'],
    flavors: ['Pine', 'Citrus', 'Diesel'],
  },
  {
    id: 'g-sour-diesel',
    name: 'Sour Diesel',
    type: 'Sativa',
    rating: 4.5,
    effects: ['Energetic', 'Uplifted', 'Focused'],
    flavors: ['Diesel', 'Citrus', 'Skunk'],
  },
  {
    id: 'g-girl-scout-cookies',
    name: 'Girl Scout Cookies',
    type: 'Hybrid',
    rating: 4.8,
    effects: ['Happy', 'Euphoric', 'Hungry'],
    flavors: ['Sweet', 'Mint', 'Earthy'],
  },
  {
    id: 'g-pineapple-express',
    name: 'Pineapple Express',
    type: 'Hybrid',
    rating: 4.4,
    effects: ['Energetic', 'Creative', 'Happy'],
    flavors: ['Pineapple', 'Tropical', 'Citrus'],
  },
  {
    id: 'g-granddaddy-purple',
    name: 'Granddaddy Purple',
    type: 'Indica',
    rating: 4.6,
    effects: ['Relaxed', 'Sleepy', 'Hungry'],
    flavors: ['Grape', 'Berry', 'Sweet'],
  },
  {
    id: 'g-white-widow',
    name: 'White Widow',
    type: 'Hybrid',
    rating: 4.3,
    effects: ['Talkative', 'Euphoric', 'Focused'],
    flavors: ['Woody', 'Earthy', 'Spicy'],
  },
  {
    id: 'g-tropicana-banana',
    name: 'Tropicana Banana',
    type: 'Hybrid',
    rating: 4.5,
    effects: ['Creative', 'Relaxed', 'Uplifted'],
    flavors: ['Tropical', 'Banana', 'Citrus'],
  },
]

const norm = (s: string) => s.trim().toLowerCase()

interface StrainsState {
  globalStrains: StrainBaseRow[]
  localStrains: LocalStrainRow[]
  hydratingGlobal: boolean
  globalHydratedAt?: string
  addLocalStrain: (
    tenantId: string,
    input: Pick<StrainBaseRow, 'name'> & Partial<StrainBaseRow>,
  ) => { ok: true; strain: LocalStrainRow } | { ok: false; reason: 'empty' | 'duplicate' }
  getAllStrains: (tenantId: string) => UnifiedStrainRow[]
  hydrateGlobalStrains: () => Promise<{ ok: boolean; count: number }>
}

const CANNABIS_GITHUB_JSON =
  'https://raw.githubusercontent.com/Piyush-Bhor/The_Cannabis_API/v2/cannabis.json'

type GithubRawRow = {
  Strain?: string | number
  Type?: string
  Rating?: number | string
  Effects?: string
  Flavor?: string
  Description?: string
}

const splitCSV = (v: unknown) =>
  String(v ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x && x.toLowerCase() !== 'none')

function mapGithubRow(row: GithubRawRow, index: number): StrainBaseRow | null {
  const name = String(row.Strain ?? '').trim()
  if (!name) return null
  const type = String(row.Type ?? 'Hybrid').trim()
  const ratingNum = Number(row.Rating)
  return {
    id: `gh-${index + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    type: type || 'Hybrid',
    rating: Number.isFinite(ratingNum) ? ratingNum : 0,
    effects: splitCSV(row.Effects),
    flavors: splitCSV(row.Flavor),
    description: String(row.Description ?? '').trim() || undefined,
  }
}

export const useStrainsStore = create<StrainsState>()(
  persist(
    (set, get) => ({
      globalStrains: GLOBAL_STRAINS_SEED,
      localStrains: [],
      hydratingGlobal: false,
      globalHydratedAt: undefined,

      addLocalStrain: (tenantId, input) => {
        const tId = tenantId.trim() || 'tenant-default'
        const name = String(input.name ?? '').trim()
        if (!name) return { ok: false, reason: 'empty' }

        const lower = norm(name)
        const existsGlobal = get().globalStrains.some((s) => norm(s.name) === lower)
        const existsLocal = get().localStrains.some(
          (s) => s.tenantId === tId && norm(s.name) === lower,
        )
        if (existsGlobal || existsLocal) return { ok: false, reason: 'duplicate' }

        const strain: LocalStrainRow = {
          id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          tenantId: tId,
          name,
          type: input.type?.trim() || 'Hybrid',
          rating: Number.isFinite(input.rating) ? Number(input.rating) : 0,
          effects: Array.isArray(input.effects) ? input.effects : [],
          flavors: Array.isArray(input.flavors) ? input.flavors : [],
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ localStrains: [...s.localStrains, strain] }))
        return { ok: true, strain }
      },

      getAllStrains: (tenantId) => {
        const tId = tenantId.trim() || 'tenant-default'
        const global = get().globalStrains.map(
          (s): UnifiedStrainRow => ({ ...s, source: 'global', verified: true }),
        )
        const local = get()
          .localStrains.filter((s) => s.tenantId === tId)
          .map((s): UnifiedStrainRow => ({ ...s, source: 'local', verified: false }))
        return [...global, ...local].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        )
      },

      hydrateGlobalStrains: async () => {
        const cur = get()
        if (cur.hydratingGlobal) {
          return { ok: true, count: cur.globalStrains.length }
        }
        if (cur.globalStrains.length > 500) {
          return { ok: true, count: cur.globalStrains.length }
        }

        set({ hydratingGlobal: true })
        try {
          const res = await fetch(CANNABIS_GITHUB_JSON)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const raw = (await res.json()) as unknown
          const rows = Array.isArray(raw) ? raw : []
          const mapped = rows
            .map((r, i) => mapGithubRow(r as GithubRawRow, i))
            .filter((x): x is StrainBaseRow => x != null)
          if (mapped.length > 0) {
            set({
              globalStrains: mapped,
              globalHydratedAt: new Date().toISOString(),
              hydratingGlobal: false,
            })
            return { ok: true, count: mapped.length }
          }
          set({ hydratingGlobal: false })
          return { ok: false, count: cur.globalStrains.length }
        } catch {
          set({ hydratingGlobal: false })
          return { ok: false, count: get().globalStrains.length }
        }
      },
    }),
    {
      name: 'green-luck-strains',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        globalStrains: s.globalStrains,
        localStrains: s.localStrains,
        globalHydratedAt: s.globalHydratedAt,
      }),
    },
  ),
)

