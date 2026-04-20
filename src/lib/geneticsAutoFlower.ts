import { AUTO_EXPECT_FLOWER_DAYS_FROM_SOWING } from '../store/cultivationTypes'

/** Fecha local YYYY-MM-DD → Date medianoche local o null. */
export function parseYmdLocal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(y, mo, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null
  return dt
}

/** Fecha ISO YYYY-MM-DD de floración esperada (siembra + días). */
export function expectedAutoFloweringDateIso(
  sowingYmd: string,
  offsetDays: number = AUTO_EXPECT_FLOWER_DAYS_FROM_SOWING,
): string | null {
  const d = parseYmdLocal(sowingYmd)
  if (!d) return null
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offsetDays)
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const day = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Días hasta la fecha objetivo (YYYY-MM-DD); negativo = ya pasó. */
export function daysUntilYmd(targetYmd: string, from: Date = new Date()): number | null {
  const t = parseYmdLocal(targetYmd)
  if (!t) return null
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const ms = t.getTime() - f.getTime()
  return Math.round(ms / 86400000)
}
