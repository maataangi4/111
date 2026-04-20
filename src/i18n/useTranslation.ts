import { useCallback } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'
import { t as translate } from './messages'

export function useTranslation() {
  const locale = useSettingsStore((s) => s.locale)
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  )
  return { t, locale }
}
