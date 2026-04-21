/**
 * Lista estándar de zonas IANA + etiqueta UTC (p. ej. UTC−03:00) para selects de configuración.
 */

const FALLBACK_IANA_TIMEZONES: readonly string[] = [
  'UTC',
  'Etc/GMT',
  'Etc/GMT+1',
  'Etc/GMT+2',
  'Etc/GMT+3',
  'Etc/GMT+4',
  'Etc/GMT+5',
  'Etc/GMT+6',
  'Etc/GMT+7',
  'Etc/GMT+8',
  'Etc/GMT+9',
  'Etc/GMT+10',
  'Etc/GMT+11',
  'Etc/GMT+12',
  'Etc/GMT-1',
  'Etc/GMT-2',
  'Etc/GMT-3',
  'Etc/GMT-4',
  'Etc/GMT-5',
  'Etc/GMT-6',
  'Etc/GMT-7',
  'Etc/GMT-8',
  'Etc/GMT-9',
  'Etc/GMT-10',
  'Etc/GMT-11',
  'Etc/GMT-12',
  'Europe/London',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Berlin',
  'Europe/Moscow',
  'Africa/Cairo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
  'America/Sao_Paulo',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Cordoba',
  'America/Montevideo',
  'America/Santiago',
]

/** Todos los IDs IANA que expone el motor (Chrome 93+, Firefox, Safari modernos). */
export function getAllIANATimeZoneIds(): string[] {
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    if (typeof intl.supportedValuesOf === 'function') {
      const list = intl.supportedValuesOf('timeZone')
      if (Array.isArray(list) && list.length > 0) return [...list].sort((a, b) => a.localeCompare(b))
    }
  } catch {
    // ignore
  }
  return [...FALLBACK_IANA_TIMEZONES]
}

/** Offset local − UTC en minutos (invierno/verano según `date`). */
export function getTimeZoneOffsetMinutes(timeZone: string, date = new Date()): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    })
    const raw = dtf.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? ''
    return parseLongOffsetToMinutes(raw)
  } catch {
    return 0
  }
}

function parseLongOffsetToMinutes(raw: string): number {
  const s = raw.replace(/\u2212/g, '-').trim()
  const m = s.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?/i)
  if (!m) return 0
  const sign = m[1] === '-' ? -1 : 1
  const h = Number.parseInt(m[2]!, 10)
  const min = m[3] ? Number.parseInt(m[3], 10) : 0
  return sign * (h * 60 + min)
}

/** Etiqueta tipo UTC−03:00 · America/Argentina/Buenos Aires */
export function formatTimeZoneSelectLabel(timeZone: string, date = new Date()): string {
  let offset = 'UTC+00:00'
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    })
    const raw = dtf.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00'
    offset = raw.replace(/^GMT/i, 'UTC').replace(/\u2212/g, '−')
  } catch {
    offset = 'UTC'
  }
  const readable = timeZone.replace(/_/g, ' ')
  return `${offset} · ${readable}`
}

export function sortTimeZoneIdsByUtcOffset(ids: string[], date = new Date()): string[] {
  return [...ids].sort((a, b) => {
    const da = getTimeZoneOffsetMinutes(a, date)
    const db = getTimeZoneOffsetMinutes(b, date)
    if (da !== db) return da - db
    return a.localeCompare(b)
  })
}
