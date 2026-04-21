/**
 * Fecha y hora en la zona del club (settings.timezone), no en la del navegador.
 */
import type { AppLocale } from '../store/useSettingsStore'

export function appLocaleToBcp47(locale: AppLocale): 'es-AR' | 'ru-RU' {
  return locale === 'es' ? 'es-AR' : 'ru-RU'
}

export function formatYmdInTz(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function getZonedYMD(d: Date, timeZone: string): { y: number; m0: number; day: number } {
  const s = formatYmdInTz(d, timeZone)
  const [ys, ms, ds] = s.split('-')
  return { y: Number(ys), m0: Number(ms) - 1, day: Number(ds) }
}

/** 0 = domingo … 6 = sábado (como Date#getDay en hora local del huso). */
export function weekdaySun0InTz(d: Date, timeZone: string): number {
  const w = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(d)
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[w] ?? 0
}

/**
 * Primer instante UTC cuya fecha civil en `timeZone` es exactamente y-(m0+1)-dom,
 * o null si ese día no existe (p. ej. 31 en febrero).
 */
export function firstInstantOfZonedCalendarDay(
  y: number,
  m0: number,
  dom: number,
  timeZone: string,
): Date | null {
  const target = `${y}-${String(m0 + 1).padStart(2, '0')}-${String(dom).padStart(2, '0')}`
  let lo = Date.UTC(y, m0, dom - 2, 0, 0, 0)
  let hi = Date.UTC(y, m0, dom + 2, 23, 59, 59)
  for (let k = 0; k < 48 && formatYmdInTz(new Date(lo), timeZone) > target; k++) lo -= 86400000
  for (let k = 0; k < 48 && formatYmdInTz(new Date(hi), timeZone) < target; k++) hi += 86400000
  let guard = 0
  while (lo < hi && guard++ < 64) {
    const mid = Math.floor((lo + hi) / 2)
    const cur = formatYmdInTz(new Date(mid), timeZone)
    if (cur < target) lo = mid + 1
    else hi = mid
  }
  const out = new Date(lo)
  return formatYmdInTz(out, timeZone) === target ? out : null
}

export function zonedDaysInMonth(y: number, m0: number, timeZone: string): number {
  for (let dom = 31; dom >= 1; dom--) {
    if (firstInstantOfZonedCalendarDay(y, m0, dom, timeZone)) return dom
  }
  return 28
}

export type CalendarCell =
  | { kind: 'blank' }
  | { kind: 'day'; n: number; isToday: boolean; isWeekend: boolean }

/** Calendario mensual (lun→dom) según fecha civil en `timeZone`. */
export function buildCalendarCellsInTimeZone(view: Date, now: Date, timeZone: string): CalendarCell[] {
  const { y, m0 } = getZonedYMD(view, timeZone)
  const first = firstInstantOfZonedCalendarDay(y, m0, 1, timeZone)
  if (!first) return []
  const sun0 = weekdaySun0InTz(first, timeZone)
  const monFirstCol = (sun0 + 6) % 7
  const lastDay = zonedDaysInMonth(y, m0, timeZone)
  const zn = getZonedYMD(now, timeZone)
  const out: CalendarCell[] = []
  for (let i = 0; i < monFirstCol; i++) out.push({ kind: 'blank' })
  for (let d = 1; d <= lastDay; d++) {
    const col = (monFirstCol + d - 1) % 7
    const isWeekend = col === 5 || col === 6
    const isToday = d === zn.day && m0 === zn.m0 && y === zn.y
    out.push({ kind: 'day', n: d, isToday, isWeekend })
  }
  while (out.length % 7 !== 0) out.push({ kind: 'blank' })
  return out
}

/** Texto del widget «Día» (dashboard) en el huso del club. */
export function getDayCardInClubZone(
  date: Date,
  timeZone: string,
  uiLocale: AppLocale,
): { weekdayLabel: string; monthLabel: string; dayOfMonth: number } {
  const loc = uiLocale === 'ru' ? 'ru-RU' : 'es-AR'
  const weekdayRaw = new Intl.DateTimeFormat(loc, { timeZone, weekday: 'short' })
    .format(date)
    .replace(/\./g, '')
  const weekdayLabel =
    weekdayRaw.length > 0
      ? weekdayRaw.charAt(0).toLocaleUpperCase(loc) + weekdayRaw.slice(1)
      : ''
  const monthRaw = new Intl.DateTimeFormat(loc, { timeZone, month: 'long' }).format(date).replace(/\./g, '')
  const month3 = monthRaw.slice(0, 3)
  const monthLabel = month3
    ? month3.charAt(0).toLocaleUpperCase(loc) + month3.slice(1).toLowerCase()
    : ''
  const dayOfMonth = getZonedYMD(date, timeZone).day
  return { weekdayLabel, monthLabel, dayOfMonth }
}

export function zonedISODate(date: Date, timeZone: string): string {
  const { y, m0, day } = getZonedYMD(date, timeZone)
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatInClubTimeZone(
  input: Date | string | number,
  timeZone: string,
  locale: AppLocale,
  options: Intl.DateTimeFormatOptions,
): string {
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return typeof input === 'string' ? input : ''
  const loc = appLocaleToBcp47(locale)
  return new Intl.DateTimeFormat(loc, { ...options, timeZone }).format(d)
}

/** Primer instante del día civil YYYY-MM-DD en el huso (para etiquetas de «día» agrupado). */
export function anchorForZonedYmd(ymd: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return null
  return firstInstantOfZonedCalendarDay(Number(m[1]), Number(m[2]) - 1, Number(m[3]), timeZone)
}
