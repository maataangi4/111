import { motion } from 'framer-motion'
import { Moon, Sun, Languages } from 'lucide-react'
import { useEffect } from 'react'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import type { SettingsNavSection } from '../../lib/settingsNavSection'
import { useTranslation } from '../../i18n/useTranslation'
import { LocationTopologySettings } from '../settings/LocationTopologySettings'
import { TeamRolesSettings } from '../settings/TeamRolesSettings'
import { SHELL_WALLPAPERS, shellWallpaperSrc } from '../../lib/shellWallpapers'
import { useSettingsStore } from '../../store/useSettingsStore'
import type { AppLocale, AppTheme } from '../../store/useSettingsStore'

const SETTINGS_SCROLL_IDS: Record<SettingsNavSection, string> = {
  general: 'settings-general',
  profile: 'settings-profile',
  company: 'settings-company',
  subscription: 'settings-subscription',
}

export function SettingsTab({ scrollToSection }: { scrollToSection?: SettingsNavSection | null }) {
  const { t } = useTranslation()
  const locale = useSettingsStore((s) => s.locale)
  const theme = useSettingsStore((s) => s.theme)
  const shellWallpaperId = useSettingsStore((s) => s.shellWallpaperId ?? null)
  const setLocale = useSettingsStore((s) => s.setLocale)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const setShellWallpaperId = useSettingsStore((s) => s.setShellWallpaperId)

  const pill = (active: boolean) =>
    cn(
      'rounded-2xl px-4 py-2.5 text-sm font-medium transition',
      active ? C.navActive : cn(C.btnSecondary, 'border bg-transparent'),
    )

  useEffect(() => {
    if (scrollToSection == null) return
    const id = SETTINGS_SCROLL_IDS[scrollToSection]
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [scrollToSection])

  return (
    <div>
      <div className="mb-8">
        <h2 className={cn('text-2xl font-semibold tracking-tight', C.heading)}>
          {t('settings.title')}
        </h2>
        <p className={cn('mt-1 text-sm', C.muted)}>{t('settings.subtitle')}</p>
      </div>

      <div className="space-y-6">
        <section
          id="settings-general"
          className={cn('scroll-mt-4 rounded-2xl border p-5 shadow-sm', C.card)}
        >
          <h3 className={cn('font-semibold', C.heading)}>{t('settings.generalSectionTitle')}</h3>
          <p className={cn('mt-2 text-sm', C.muted)}>{t('settings.generalSectionHint')}</p>

          <div className="mt-8 border-t border-gray-200/80 pt-6 dark:border-[#3d3d3d]">
            <h4 className={cn('text-sm font-semibold', C.heading)}>{t('settings.shellBackgroundTitle')}</h4>
            <p className={cn('mt-1.5 text-xs leading-relaxed', C.muted)}>{t('settings.shellBackgroundHint')}</p>
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
        </section>

        <section
          id="settings-profile"
          className={cn('scroll-mt-4 rounded-2xl border p-5 shadow-sm', C.card)}
        >
          <h3 className={cn('font-semibold', C.heading)}>{t('settings.profileSectionTitle')}</h3>
          <p className={cn('mt-2 text-sm', C.muted)}>{t('settings.profileSectionHint')}</p>
        </section>

        <div
          id="settings-company"
          className="scroll-mt-4 rounded-2xl border-2 border-emerald-500/35 bg-emerald-50/30 p-1 dark:border-emerald-500/40 dark:bg-emerald-950/20"
        >
          <LocationTopologySettings
            title={t('settings.topologyTitle')}
            subtitle={t('settings.topologySubtitle')}
            labels={{
              addRoom: t('settings.topologyAddRoom'),
              addFixture: t('settings.topologyAddFixture'),
              addLevel: t('settings.topologyAddLevel'),
              roomNamePh: t('settings.topologyRoomPh'),
              fixtureNamePh: t('settings.topologyFixturePh'),
              levelNamePh: t('settings.topologyLevelPh'),
              deleteRoom: t('settings.topologyDeleteRoom'),
              deleteFixture: t('settings.topologyDeleteFixture'),
              deleteLevel: t('settings.topologyDeleteLevel'),
              type: t('settings.topologyType'),
              resetSample: t('settings.topologyResetSample'),
              confirmDeleteRoom: t('settings.topologyConfirmDeleteRoom'),
            }}
          />
          <div className="p-3 pt-0 sm:p-4 sm:pt-0">
            <TeamRolesSettings />
          </div>
        </div>

        <p className={cn('text-center text-xs', C.muted)}>
          — {t('settings.language')} · {t('settings.theme')} —
        </p>

        <section className={cn('rounded-2xl border p-5 shadow-sm', C.card)}>
          <div className="mb-4 flex items-center gap-2">
            <Languages className="h-5 w-5 opacity-70" strokeWidth={1.75} />
            <h3 className={cn('font-semibold', C.heading)}>{t('settings.language')}</h3>
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
        </section>

        <section className={cn('rounded-2xl border p-5 shadow-sm', C.card)}>
          <div className="mb-4 flex items-center gap-2">
            {theme === 'dark' ? (
              <Moon className="h-5 w-5 opacity-70" strokeWidth={1.75} />
            ) : (
              <Sun className="h-5 w-5 opacity-70" strokeWidth={1.75} />
            )}
            <h3 className={cn('font-semibold', C.heading)}>{t('settings.theme')}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'light' as AppTheme, label: t('settings.themeLight') },
                { id: 'dark' as AppTheme, label: t('settings.themeDark') },
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
          <p className={cn('mt-3 text-xs leading-relaxed', C.subheading)}>
            {t('settings.themeHint')}
          </p>
        </section>

        <section
          id="settings-subscription"
          className={cn('scroll-mt-4 rounded-2xl border p-5 shadow-sm', C.card)}
        >
          <h3 className={cn('font-semibold', C.heading)}>{t('settings.subscriptionSectionTitle')}</h3>
          <p className={cn('mt-2 text-sm', C.muted)}>{t('settings.subscriptionSectionHint')}</p>
        </section>
      </div>
    </div>
  )
}
