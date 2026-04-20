import { useEffect } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'

/** Sincroniza `dark` en <html> y lang según Zustand persistido. */
export function ThemeSync() {
  const theme = useSettingsStore((s) => s.theme)
  const locale = useSettingsStore((s) => s.locale)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.lang = locale === 'ru' ? 'ru' : 'es'
  }, [theme, locale])

  return null
}
