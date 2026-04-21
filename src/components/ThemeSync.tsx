import { useEffect } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'

function applyDarkClass(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
}

function resolveDark(theme: ReturnType<typeof useSettingsStore.getState>['theme']): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Sincroniza `dark` en <html>`, `lang`, modo discreto y tema «sistema». */
export function ThemeSync() {
  const theme = useSettingsStore((s) => s.theme)
  const locale = useSettingsStore((s) => s.locale)
  const discreteMode = useSettingsStore((s) => s.discreteMode)

  useEffect(() => {
    const root = document.documentElement
    root.lang = locale === 'ru' ? 'ru' : 'es'
  }, [locale])

  useEffect(() => {
    const apply = () => applyDarkClass(resolveDark(theme))
    apply()
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  useEffect(() => {
    document.documentElement.toggleAttribute('data-discrete-money', discreteMode)
  }, [discreteMode])

  return null
}
