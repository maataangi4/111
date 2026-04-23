import { LayoutGroup, motion } from 'framer-motion'
import { Building2, CreditCard, SlidersHorizontal, User } from 'lucide-react'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import type { SettingsNavSection } from '../../lib/settingsNavSection'
import { useTranslation } from '../../i18n/useTranslation'
import { LocationTopologySettings } from '../settings/LocationTopologySettings'
import { TeamRolesSettings } from '../settings/TeamRolesSettings'
import { SettingsGeneralPanel } from '../settings/SettingsGeneralPanel'

type SettingsTabProps = {
  activeSection: SettingsNavSection
  onSectionChange: (section: SettingsNavSection) => void
}

/** Зелёный как в левом сайдбаре Dashboard. */
const BRAND_GREEN = '#06663F'

export function SettingsTab({ activeSection, onSectionChange }: SettingsTabProps) {
  const { t } = useTranslation()

  const tabs = [
    {
      id: 'general' as const,
      label: t('settings.generalSectionTitle'),
      icon: SlidersHorizontal,
    },
    {
      id: 'profile' as const,
      label: t('settings.profileSectionTitle'),
      icon: User,
    },
    {
      id: 'company' as const,
      label: t('nav.settingsSubCompany'),
      icon: Building2,
    },
    {
      id: 'subscription' as const,
      label: t('settings.subscriptionSectionTitle'),
      icon: CreditCard,
    },
  ] satisfies { id: SettingsNavSection; label: string; icon: typeof User }[]

  return (
    <div className="min-h-0 w-full overflow-x-hidden px-6 pb-8 pt-6 md:px-8 md:pb-10 md:pt-8">
      <header className="mb-6">
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-[#f1f1f1]">
          {t('settings.title')}
        </h1>
      </header>

      <LayoutGroup id="settings-sidebar-layout">
        <div className="flex min-h-0 flex-col md:flex-row">
          <aside className="md:w-[260px] md:shrink-0 md:border-r md:border-slate-200 md:dark:border-white/10">
              <nav aria-label={t('settings.title')} className="space-y-1 px-2 pb-4 pt-3 md:pt-4">
                {tabs.map(({ id, label, icon: Icon }) => {
                  const active = activeSection === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSectionChange(id)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-left text-sm font-medium transition',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-emerald-400/50 dark:focus-visible:ring-offset-[#222222]',
                        active
                          ? 'text-slate-900 dark:text-[#f1f1f1]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-[#a3a3a3] dark:hover:bg-white/5 dark:hover:text-[#f1f1f1]',
                      )}
                      style={active ? { color: BRAND_GREEN } : undefined}
                    >
                      {active ? (
                        <motion.span
                          layoutId="settings-sidebar-active"
                          className="pointer-events-none absolute inset-0 rounded-full bg-emerald-50 dark:bg-emerald-500/10"
                          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                          aria-hidden
                        />
                      ) : null}
                      <Icon
                        className={cn(
                          'relative z-[1] h-4 w-4 shrink-0',
                          active ? 'opacity-100' : 'opacity-70',
                        )}
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span className="relative z-[1]">{label}</span>
                    </button>
                  )
                })}
              </nav>
          </aside>

          <div id={`settings-panel-${activeSection}`} className="min-h-0 min-w-0 flex-1 px-6 py-6 md:px-8 md:py-7">
            {activeSection === 'general' ? (
              <div key="panel-general">
                <section aria-labelledby="settings-heading-general" className="sr-only">
                  <h2 id="settings-heading-general">{t('settings.generalSectionTitle')}</h2>
                </section>
                <SettingsGeneralPanel />
              </div>
            ) : null}

            {activeSection === 'profile' ? (
              <div key="panel-profile">
                <section aria-labelledby="settings-heading-profile">
                  <h3 id="settings-heading-profile" className={cn('text-lg font-semibold', C.heading)}>
                    {t('settings.profileSectionTitle')}
                  </h3>
                  <p className={cn('mt-2 text-sm', C.muted)}>{t('settings.profileSectionHint')}</p>
                </section>
              </div>
            ) : null}

            {activeSection === 'company' ? (
              <div key="panel-company">
                <section className="space-y-6" aria-labelledby="settings-heading-company">
                  <h3 id="settings-heading-company" className="sr-only">
                    {t('nav.settingsSubCompany')}
                  </h3>
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
                  <TeamRolesSettings />
                </section>
              </div>
            ) : null}

            {activeSection === 'subscription' ? (
              <div key="panel-subscription">
                <section aria-labelledby="settings-heading-subscription">
                  <h3 id="settings-heading-subscription" className={cn('text-lg font-semibold', C.heading)}>
                    {t('settings.subscriptionSectionTitle')}
                  </h3>
                  <p className={cn('mt-2 text-sm', C.muted)}>{t('settings.subscriptionSectionHint')}</p>
                </section>
              </div>
            ) : null}
          </div>
        </div>
      </LayoutGroup>
    </div>
  )
}
