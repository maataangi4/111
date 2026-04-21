/** Pestaña inicial al abrir la app (sin Configuración). */
export const APP_LANDING_TAB_IDS = [
  'dashboard',
  'genetics',
  'cultivo',
  'postharvest',
  'inventory',
  'socios',
  'movimientos',
  'tools',
] as const

export type AppLandingTabId = (typeof APP_LANDING_TAB_IDS)[number]

export type DateFormatSetting = 'ddmmyyyy' | 'yyyymmdd'

export type WeightDecimalsSetting = 1 | 2

export type DefaultPaymentMethodId = 'efectivo' | 'transferencia' | 'tarjeta' | 'mixto'

export const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires'
