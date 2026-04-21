import { formatInClubTimeZone } from '../clubTime'
import type { AppLocale } from '../../store/useSettingsStore'

export function formatDiarioTimestamp(iso: string, locale: AppLocale, timeZone: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const date = formatInClubTimeZone(d, timeZone, locale, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
  const time = formatInClubTimeZone(d, timeZone, locale, { hour: '2-digit', minute: '2-digit' })
  return `${date} | ${time}`
}
