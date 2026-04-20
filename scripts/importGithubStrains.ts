/**
 * Template script: import strains from The_Cannabis_API-like endpoints
 * and transform into our internal store format.
 *
 * Usage (example):
 *   npx tsx scripts/importGithubStrains.ts
 */

type ApiStrain = {
  id?: string | number
  _id?: string
  name?: string
  strain?: string
  type?: string
  rating?: number | string
  effects?: string[] | string
  flavors?: string[] | string
}

type InternalStrain = {
  id: string
  name: string
  type: string
  rating: number
  effects: string[]
  flavors: string[]
}

function toArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  if (typeof v === 'string') {
    return v
      .split(/[|,;/]/g)
      .map((x) => x.trim())
      .filter(Boolean)
  }
  return []
}

function mapApiToInternal(row: ApiStrain, fallbackIndex: number): InternalStrain | null {
  const name = String(row.name ?? row.strain ?? '').trim()
  if (!name) return null
  const idRaw = row.id ?? row._id ?? `import-${fallbackIndex}`
  const ratingNum = Number(row.rating)
  return {
    id: String(idRaw),
    name,
    type: String(row.type ?? 'Hybrid').trim() || 'Hybrid',
    rating: Number.isFinite(ratingNum) ? ratingNum : 0,
    effects: toArray(row.effects),
    flavors: toArray(row.flavors),
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`)
  return (await res.json()) as T
}

async function main() {
  // Replace with real local/remote endpoint when ready.
  // Example from the referenced API concept:
  // const endpoint = 'http://localhost:5000/api/strains/getAllStrains'
  const endpoint = 'http://localhost:5000/api/strains/getAllStrains'

  // Some APIs return { data: [...] }, others return plain array.
  const payload = await fetchJson<unknown>(endpoint)
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown[] }).data)
      ? (payload as { data: unknown[] }).data
      : []

  const mapped: InternalStrain[] = rows
    .map((row, i) => mapApiToInternal(row as ApiStrain, i + 1))
    .filter((x): x is InternalStrain => x != null)

  // TODO: persist to Supabase/Firebase or write to a seed file.
  // For now, print compact JSON you can copy into seed arrays.
  console.log(JSON.stringify(mapped, null, 2))
}

main().catch((err) => {
  console.error('[importGithubStrains] failed:', err)
  process.exit(1)
})

