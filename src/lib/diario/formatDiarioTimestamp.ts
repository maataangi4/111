import type { AppLocale } from '../../store/useSettingsStore'

export function formatDiarioTimestamp(iso: string, locale: AppLocale): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const loc = locale === 'es' ? 'es-AR' : 'ru-RU'
  const date = d.toLocaleDateString(loc, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
  const time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
  return `${date} | ${time}`
}
