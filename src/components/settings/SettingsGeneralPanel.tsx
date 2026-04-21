import { useMemo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Languages } from 'lucide-react'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import {
  APP_LANDING_TAB_IDS,
  type AppLandingTabId,
  type DateFormatSetting,
  type DefaultPaymentMethodId,
  type WeightDecimalsSetting,
} from '../../lib/settingsGeneralTypes'
import { getAllIANATimeZoneIds, sortTimeZoneIdsByUtcOffset } from '../../lib/timeZones'
import { shellWallpaperSrc, SHELL_WALLPAPERS } from '../../lib/shellWallpapers'
import { TimeZoneSelect } from './TimeZoneSelect'
import { useTranslation } from '../../i18n/useTranslation'
import { useCultivationStore } from '../../store/useCultivationStore'
import {
  type AppLocale,
  type AppTheme,
  useSettingsStore,
} from '../../store/useSettingsStore'

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        'border-0 border-b border-gray-200/70 bg-transparent pb-10 shadow-none',
        'dark:border-[#2e2e2e]/80',
        'last:border-b-0 last:pb-0',
      )}
    >
      <h3 className={cn('text-base font-semibold tracking-tight', C.heading)}>{title}</h3>
      <div className="mt-4 divide-y divide-gray-200/70 dark:divide-[#2e2e2e]/80">{children}</div>
    </section>
  )
}

function RowSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
      <div className="min-w-0 pr-2">
        <p className={cn('text-sm font-medium', C.heading)}>{label}</p>
        {description ? <p className={cn('mt-1 text-xs leading-relaxed', C.muted)}>{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-slate-300 dark:bg-[#3a3a3a]',
        )}
      >
        <span
          className={cn(
            'inline-block h-6 w-6 translate-x-0.5 rounded-full bg-white shadow transition-transform duration-200 ease-out',
            checked && 'translate-x-[1.35rem]',
          )}
        />
      </button>
    </div>
  )
}

const LANDING_LABEL_KEYS: Record<AppLandingTabId, string> = {
  dashboard: 'nav.dashboardSummary',
  genetics: 'nav.geneticsBank',
  cultivo: 'nav.cultivo',
  postharvest: 'nav.postHarvest',
  inventory: 'nav.inventory',
  socios: 'nav.socios',
  movimientos: 'nav.movimientos',
  tools: 'nav.tools',
}

export function SettingsGeneralPanel() {
  const { t } = useTranslation()
  const locale = useSettingsStore((s) => s.locale)
  const setLocale = useSettingsStore((s) => s.setLocale)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const shellWallpaperId = useSettingsStore((s) => s.shellWallpaperId ?? null)
  const setShellWallpaperId = useSettingsStore((s) => s.setShellWallpaperId)

  const timezone = useSettingsStore((s) => s.timezone)
  const setTimezone = useSettingsStore((s) => s.setTimezone)
  const dateFormat = useSettingsStore((s) => s.dateFormat)
  const setDateFormat = useSettingsStore((s) => s.setDateFormat)
  const weightDecimals = useSettingsStore((s) => s.weightDecimals)
  const setWeightDecimals = useSettingsStore((s) => s.setWeightDecimals)
  const discreteMode = useSettingsStore((s) => s.discreteMode)
  const setDiscreteMode = useSettingsStore((s) => s.setDiscreteMode)
  const defaultLandingTab = useSettingsStore((s) => s.defaultLandingTab)
  const setDefaultLandingTab = useSettingsStore((s) => s.setDefaultLandingTab)
  const dailyReportEmail = useSettingsStore((s) => s.dailyReportEmail)
  const setDailyReportEmail = useSettingsStore((s) => s.setDailyReportEmail)
  const lowStockThresholdGrams = useSettingsStore((s) => s.lowStockThresholdGrams)
  const setLowStockThresholdGrams = useSettingsStore((s) => s.setLowStockThresholdGrams)
  const interfaceSounds = useSettingsStore((s) => s.interfaceSounds)
  const setInterfaceSounds = useSettingsStore((s) => s.setInterfaceSounds)
  const defaultPaymentMethod = useSettingsStore((s) => s.defaultPaymentMethod)
  const setDefaultPaymentMethod = useSettingsStore((s) => s.setDefaultPaymentMethod)
  const defaultPrimaryHarvestBatchId = useSettingsStore((s) => s.defaultPrimaryHarvestBatchId)
  const setDefaultPrimaryHarvestBatchId = useSettingsStore((s) => s.setDefaultPrimaryHarvestBatchId)

  const harvestBatches = useCultivationStore((s) => s.harvestBatches)

  const sortedTimeZoneIds = useMemo(() => {
    const ids = getAllIANATimeZoneIds()
    const merged = timezone && !ids.includes(timezone) ? [timezone, ...ids] : ids
    return sortTimeZoneIdsByUtcOffset(merged)
  }, [timezone])

  const pill = (active: boolean) =>
    cn(
      'rounded-2xl px-4 py-2.5 text-sm font-medium transition',
      active ? C.navActive : cn(C.btnSecondary, 'border bg-transparent'),
    )

  const selectClass = cn(
    'mt-2 w-full max-w-md rounded-xl border px-3 py-2.5 text-sm outline-none transition',
    C.input,
  )

  return (
    <div className="space-y-8">
      <SettingsCard title={t('settings.cardLocalTitle')}>
        <div className="py-4 first:pt-0">
          <label className={cn('block text-sm font-medium', C.heading)} htmlFor="settings-tz">
            {t('settings.tzLabel')}
          </label>
          <TimeZoneSelect
            id="settings-tz"
            value={timezone}
            onChange={setTimezone}
            optionIds={sortedTimeZoneIds}
            aria-label={t('settings.tzLabel')}
          />
        </div>

        <div className="py-4">
          <p className={cn('text-sm font-medium', C.heading)}>{t('settings.dateFormatLabel')}</p>
          <p className={cn('mt-1 text-xs', C.muted)}>{t('settings.dateFormatHint')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { id: 'ddmmyyyy' as const, label: t('settings.dateFormatDdmm') },
                { id: 'yyyymmdd' as const, label: t('settings.dateFormatIso') },
              ] satisfies { id: DateFormatSetting; label: string }[]
            ).map(({ id, label }) => (
              <motion.button
                key={id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setDateFormat(id)}
                className={pill(dateFormat === id)}
              >
                {label}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="py-4">
          <p className={cn('text-sm font-medium', C.heading)}>{t('settings.weightFormatLabel')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { id: 1 as const, label: t('settings.weightFormatTenth') },
                { id: 2 as const, label: t('settings.weightFormatHundredth') },
              ] satisfies { id: WeightDecimalsSetting; label: string }[]
            ).map(({ id, label }) => (
              <motion.button
                key={id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setWeightDecimals(id)}
                className={pill(weightDecimals === id)}
              >
                {label}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="py-4">
          <div className="mb-3 flex items-center gap-2">
            <Languages className="h-5 w-5 opacity-70" strokeWidth={1.75} aria-hidden />
            <p className={cn('text-sm font-medium', C.heading)}>{t('settings.language')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'es' as AppLocale, label: t('settings.spanish') },
                { id: 'ru' as AppLocale, label: t('settings.russian') },
              ] as const
            ).map(({ id, label }) => (
              <motion.button
                key={id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setLocale(id)}
                className={pill(locale === id)}
              >
                {label}
              </motion.button>
            ))}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title={t('settings.cardInterfazTitle')}>
        <div className="py-4 first:pt-0">
          <p className={cn('text-sm font-medium', C.heading)}>{t('settings.theme')}</p>
          <p className={cn('mt-1 text-xs', C.muted)}>{t('settings.themeHintExtended')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { id: 'light' as AppTheme, label: t('settings.themeLight') },
                { id: 'dark' as AppTheme, label: t('settings.themeDark') },
                { id: 'system' as AppTheme, label: t('settings.themeSystem') },
              ] as const
            ).map(({ id, label }) => (
              <motion.button
                key={id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setTheme(id)}
                className={pill(theme === id)}
              >
                {label}
              </motion.button>
            ))}
          </div>
        </div>

        <RowSwitch
          label={t('settings.discreteLabel')}
          description={t('settings.discreteHint')}
          checked={discreteMode}
          onChange={setDiscreteMode}
        />

        <div className="py-4">
          <label className={cn('text-sm font-medium', C.heading)} htmlFor="settings-landing">
            {t('settings.landingLabel')}
          </label>
          <p className={cn('mt-1 text-xs leading-relaxed', C.muted)}>{t('settings.landingHint')}</p>
          <select
            id="settings-landing"
            className={selectClass}
            value={defaultLandingTab}
            onChange={(e) => setDefaultLandingTab(e.target.value as AppLandingTabId)}
          >
            {APP_LANDING_TAB_IDS.map((id) => (
              <option key={id} value={id}>
                {t(LANDING_LABEL_KEYS[id])}
              </option>
            ))}
          </select>
        </div>

        <div className="py-4">
          <p className={cn('text-sm font-medium', C.heading)}>{t('settings.shellBackgroundTitle')}</p>
          <p className={cn('mt-1 text-xs leading-relaxed', C.muted)}>{t('settings.shellBackgroundHint')}</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setShellWallpaperId(null)}
              className={cn(
                'rounded-xl border px-3 py-2 text-xs font-medium transition',
                shellWallpaperId === null ? C.navActive : cn(C.btnSecondary, 'border bg-transparent'),
              )}
            >
              {t('settings.shellBackgroundNone')}
            </motion.button>
            {SHELL_WALLPAPERS.map((w) => {
              const active = shellWallpaperId === w.id
              return (
                <motion.button
                  key={w.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShellWallpaperId(w.id)}
                  aria-pressed={active}
                  title={w.id}
                  className={cn(
                    'relative h-14 w-[5.5rem] shrink-0 overflow-hidden rounded-xl border-2 bg-cover bg-center transition',
                    active
                      ? 'border-emerald-600 ring-2 ring-emerald-500/35 dark:border-emerald-500 dark:ring-emerald-400/25'
                      : 'border-transparent opacity-90 hover:opacity-100',
                  )}
                  style={{ backgroundImage: `url(${shellWallpaperSrc(w.id)})` }}
                >
                  <span className="sr-only">{w.id}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title={t('settings.cardNotifTitle')}>
        <RowSwitch
          label={t('settings.notifDailyLabel')}
          description={t('settings.notifDailyHint')}
          checked={dailyReportEmail}
          onChange={setDailyReportEmail}
        />
        <div className="py-4">
          <p className={cn('text-sm font-medium', C.heading)}>{t('settings.notifStockLabel')}</p>
          <p className={cn('mt-1 text-xs', C.muted)}>{t('settings.notifStockHint')}</p>
          <input
            type="number"
            min={0}
            step={1}
            className={cn(selectClass, 'mt-2 max-w-[12rem]')}
            value={lowStockThresholdGrams}
            onChange={(e) => setLowStockThresholdGrams(Number(e.target.value))}
            aria-label={t('settings.notifStockLabel')}
          />
        </div>
        <RowSwitch
          label={t('settings.notifSoundsLabel')}
          description={t('settings.notifSoundsHint')}
          checked={interfaceSounds}
          onChange={setInterfaceSounds}
        />
      </SettingsCard>

      <SettingsCard title={t('settings.cardDefaultsTitle')}>
        <div className="py-4 first:pt-0">
          <label className={cn('text-sm font-medium', C.heading)} htmlFor="settings-pay">
            {t('settings.defaultPayLabel')}
          </label>
          <p className={cn('mt-1 text-xs', C.muted)}>{t('settings.defaultPayHint')}</p>
          <select
            id="settings-pay"
            className={selectClass}
            value={defaultPaymentMethod}
            onChange={(e) => setDefaultPaymentMethod(e.target.value as DefaultPaymentMethodId)}
          >
            <option value="efectivo">{t('settings.paymentEfectivo')}</option>
            <option value="transferencia">{t('settings.paymentTransfer')}</option>
            <option value="tarjeta">{t('settings.paymentTarjeta')}</option>
            <option value="mixto">{t('settings.paymentMixto')}</option>
          </select>
        </div>
        <div className="py-4">
          <label className={cn('text-sm font-medium', C.heading)} htmlFor="settings-lot">
            {t('settings.defaultLotLabel')}
          </label>
          <p className={cn('mt-1 text-xs', C.muted)}>{t('settings.defaultLotHint')}</p>
          <select
            id="settings-lot"
            className={selectClass}
            value={defaultPrimaryHarvestBatchId ?? ''}
            onChange={(e) => setDefaultPrimaryHarvestBatchId(e.target.value || null)}
          >
            <option value="">{t('settings.defaultLotNone')}</option>
            {harvestBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id}
                {b.strain ? ` · ${b.strain}` : ''}
              </option>
            ))}
          </select>
        </div>
      </SettingsCard>
    </div>
  )
}
