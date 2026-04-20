import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ShellWallpaperId } from '../lib/shellWallpapers'

export type AppLocale = 'es' | 'ru'
export type AppTheme = 'light' | 'dark'

interface SettingsState {
  locale: AppLocale
  theme: AppTheme
  /** null — стандартный серый фон за панелями */
  shellWallpaperId: ShellWallpaperId | null
  /** Data URL (JPEG) аватара пользователя для топбара; null — инициалы по умолчанию */
  profileAvatarDataUrl: string | null
  setLocale: (l: AppLocale) => void
  setTheme: (t: AppTheme) => void
  setShellWallpaperId: (id: ShellWallpaperId | null) => void
  setProfileAvatarDataUrl: (dataUrl: string | null) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: 'es',
      theme: 'light',
      shellWallpaperId: null,
      profileAvatarDataUrl: null,
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setShellWallpaperId: (shellWallpaperId) => set({ shellWallpaperId }),
      setProfileAvatarDataUrl: (profileAvatarDataUrl) => set({ profileAvatarDataUrl }),
    }),
    {
      name: 'green-luck-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
