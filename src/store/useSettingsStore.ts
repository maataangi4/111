import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ShellWallpaperId } from '../lib/shellWallpapers'
import {
  type AppLandingTabId,
  type DateFormatSetting,
  DEFAULT_TIMEZONE,
  type DefaultPaymentMethodId,
  type WeightDecimalsSetting,
} from '../lib/settingsGeneralTypes'

export type AppLocale = 'es' | 'ru'
export type AppTheme = 'light' | 'dark' | 'system'

interface SettingsState {
  locale: AppLocale
  theme: AppTheme
  /** null — стандартный серый фон за панелями */
  shellWallpaperId: ShellWallpaperId | null
  /** Data URL (JPEG) аватара пользователя для топбара; null — инициалы по умолчанию */
  profileAvatarDataUrl: string | null

  timezone: string
  dateFormat: DateFormatSetting
  weightDecimals: WeightDecimalsSetting
  discreteMode: boolean
  defaultLandingTab: AppLandingTabId
  dailyReportEmail: boolean
  lowStockThresholdGrams: number
  interfaceSounds: boolean
  defaultPaymentMethod: DefaultPaymentMethodId
  /** Lote de post‑cosecha / inventario sugerido al dispensar; vacío = sin default */
  defaultPrimaryHarvestBatchId: string | null

  setLocale: (l: AppLocale) => void
  setTheme: (t: AppTheme) => void
  setShellWallpaperId: (id: ShellWallpaperId | null) => void
  setProfileAvatarDataUrl: (dataUrl: string | null) => void
  setTimezone: (tz: string) => void
  setDateFormat: (f: DateFormatSetting) => void
  setWeightDecimals: (n: WeightDecimalsSetting) => void
  setDiscreteMode: (v: boolean) => void
  setDefaultLandingTab: (tab: AppLandingTabId) => void
  setDailyReportEmail: (v: boolean) => void
  setLowStockThresholdGrams: (n: number) => void
  setInterfaceSounds: (v: boolean) => void
  setDefaultPaymentMethod: (m: DefaultPaymentMethodId) => void
  setDefaultPrimaryHarvestBatchId: (id: string | null) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: 'es',
      theme: 'light',
      shellWallpaperId: null,
      profileAvatarDataUrl: null,

      timezone: DEFAULT_TIMEZONE,
      dateFormat: 'ddmmyyyy',
      weightDecimals: 2,
      discreteMode: false,
      defaultLandingTab: 'dashboard',
      dailyReportEmail: false,
      lowStockThresholdGrams: 100,
      interfaceSounds: true,
      defaultPaymentMethod: 'efectivo',
      defaultPrimaryHarvestBatchId: null,

      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setShellWallpaperId: (shellWallpaperId) => set({ shellWallpaperId }),
      setProfileAvatarDataUrl: (profileAvatarDataUrl) => set({ profileAvatarDataUrl }),
      setTimezone: (timezone) => set({ timezone }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setWeightDecimals: (weightDecimals) => set({ weightDecimals }),
      setDiscreteMode: (discreteMode) => set({ discreteMode }),
      setDefaultLandingTab: (defaultLandingTab) => set({ defaultLandingTab }),
      setDailyReportEmail: (dailyReportEmail) => set({ dailyReportEmail }),
      setLowStockThresholdGrams: (lowStockThresholdGrams) =>
        set({
          lowStockThresholdGrams: Number.isFinite(lowStockThresholdGrams)
            ? Math.max(0, Math.min(1_000_000, Math.round(lowStockThresholdGrams)))
            : 100,
        }),
      setInterfaceSounds: (interfaceSounds) => set({ interfaceSounds }),
      setDefaultPaymentMethod: (defaultPaymentMethod) => set({ defaultPaymentMethod }),
      setDefaultPrimaryHarvestBatchId: (defaultPrimaryHarvestBatchId) =>
        set({ defaultPrimaryHarvestBatchId }),
    }),
    {
      name: 'green-luck-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
