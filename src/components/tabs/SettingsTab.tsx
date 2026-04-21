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

      <LayoutGroup id="settings-tabs-layout">
        <nav
          className="-mx-1 mb-8 flex gap-0.5 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-modern md:mx-0"
          role="tablist"
          aria-label={t('settings.title')}
        >
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                id={`settings-tab-${id}`}
                onClick={() => onSectionChange(id)}
                className={cn(
                  'relative flex shrink-0 items-center gap-2 px-3 py-2.5 text-sm font-medium transition sm:px-4',
                  active
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-[#a3a3a3] dark:hover:text-[#f1f1f1]',
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="settings-tab-underline"
                    className="pointer-events-none absolute inset-x-2 bottom-0 z-0 h-[2px] rounded-full bg-emerald-500 dark:bg-emerald-400"
                    transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                    aria-hidden
                  />
                ) : null}
                <Icon
                  className={cn('relative z-[1] h-4 w-4 shrink-0', active ? 'opacity-100' : 'opacity-70')}
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="relative z-[1] whitespace-nowrap">{label}</span>
              </button>
            )
          })}
        </nav>
      </LayoutGroup>

      <div
        role="tabpanel"
        id={`settings-panel-${activeSection}`}
        aria-labelledby={`settings-tab-${activeSection}`}
        className="min-h-[min(52vh,520px)]"
      >
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
  )
}
