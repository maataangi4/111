import { MoreVertical, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'

type TeamRowId = 'owner' | 'eddie' | 'elian'

type TeamRow = {
  id: TeamRowId
  name: string
  email: string
  initials: string
  roleBadgeClass: string
  roleLabelKey:
    | 'settings.teamRoleOwner'
    | 'settings.teamRoleManager'
    | 'settings.teamRoleOperator'
  lastAccessKey:
    | 'settings.teamAccessActiveNow'
    | 'settings.teamAccess2h'
    | 'settings.teamAccess1d'
  showActions: boolean
}

export function TeamRolesSettings() {
  const { t } = useTranslation()
  const [openMenu, setOpenMenu] = useState<TeamRowId | null>(null)

  const rows = useMemo<TeamRow[]>(
    () => [
      {
        id: 'owner',
        name: 'Natalia Sakharova',
        email: 'natalia@gls.com',
        initials: 'NS',
        roleBadgeClass:
          'border border-purple-100 bg-purple-50 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300',
        roleLabelKey: 'settings.teamRoleOwner',
        lastAccessKey: 'settings.teamAccessActiveNow',
        showActions: false,
      },
      {
        id: 'eddie',
        name: 'Eddie',
        email: 'eddie@gls.com',
        initials: 'ED',
        roleBadgeClass:
          'border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300',
        roleLabelKey: 'settings.teamRoleManager',
        lastAccessKey: 'settings.teamAccess2h',
        showActions: true,
      },
      {
        id: 'elian',
        name: 'Elian',
        email: 'elian@gls.com',
        initials: 'EL',
        roleBadgeClass:
          'border border-slate-200 bg-slate-100 text-slate-700 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#d4d4d4]',
        roleLabelKey: 'settings.teamRoleOperator',
        lastAccessKey: 'settings.teamAccess1d',
        showActions: true,
      },
    ],
    [],
  )

  useEffect(() => {
    if (openMenu == null) return
    const onDoc = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (!el.closest('[data-team-menu-anchor]')) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [openMenu])

  return (
    <section className="border-0 border-b border-gray-200/70 bg-transparent pb-10 shadow-none dark:border-[#2e2e2e]/80 last:border-b-0 last:pb-0">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className={cn('text-lg font-semibold tracking-tight', C.heading)}>
            {t('settings.teamTitle')}
          </h3>
          <p className={cn('mt-1 max-w-xl text-sm', C.muted)}>{t('settings.teamSubtitle')}</p>
        </div>
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
            C.btnPrimary,
          )}
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          {t('settings.teamInvite')}
        </button>
      </div>

      <div className="overflow-x-auto border-t border-gray-200/80 dark:border-[#2e2e2e]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className={cn('border-b border-gray-200/90 dark:border-[#2e2e2e]', C.tableHead)}>
              <th className="px-5 py-3 font-semibold">{t('settings.teamColUser')}</th>
              <th className="px-5 py-3 font-semibold">{t('settings.teamColRole')}</th>
              <th className="px-5 py-3 font-semibold">{t('settings.teamColLastAccess')}</th>
              <th className="w-14 px-3 py-3 font-semibold" aria-label={t('settings.teamColActions')}>
                <span className="sr-only">{t('settings.teamColActions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-gray-100 transition-colors last:border-b-0 dark:border-[#2e2e2e]',
                  C.tableRow,
                  C.rowHover,
                )}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                        C.iconBox,
                      )}
                      aria-hidden
                    >
                      {row.initials}
                    </div>
                    <div className="min-w-0">
                      <p className={cn('truncate font-medium', C.heading)}>{row.name}</p>
                      <p className={cn('truncate text-xs', C.muted)}>{row.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={cn(
                      'inline-flex rounded-md px-2.5 py-1 text-xs font-semibold',
                      row.roleBadgeClass,
                    )}
                  >
                    {t(row.roleLabelKey)}
                  </span>
                </td>
                <td className={cn('px-5 py-4', C.muted)}>{t(row.lastAccessKey)}</td>
                <td className="px-3 py-4 text-right">
                  {row.showActions ? (
                    <div className="relative flex justify-end" data-team-menu-anchor>
                      <button
                        type="button"
                        onClick={() => setOpenMenu((v) => (v === row.id ? null : row.id))}
                        className={cn(
                          'rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-[#8c8c8c] dark:hover:bg-[#2a2a2a] dark:hover:text-[#f1f1f1]',
                          C.ringFocusMenu,
                        )}
                        aria-expanded={openMenu === row.id}
                        aria-haspopup="menu"
                        aria-label={t('settings.teamRowMenuAria', { name: row.name })}
                      >
                        <MoreVertical className="h-5 w-5" strokeWidth={1.75} />
                      </button>
                      {openMenu === row.id ? (
                        <div
                          role="menu"
                          className={cn(
                            'absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border py-1 shadow-lg',
                            'border-gray-200/90 bg-white dark:border-[#3d3d3d] dark:bg-[#252525]',
                          )}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-[#f1f1f1] dark:hover:bg-[#2a2a2a]"
                            onClick={() => setOpenMenu(null)}
                          >
                            {t('settings.teamMenuChangeRole')}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-[#f1f1f1] dark:hover:bg-[#2a2a2a]"
                            onClick={() => setOpenMenu(null)}
                          >
                            {t('settings.teamMenuViewActivity')}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                            onClick={() => setOpenMenu(null)}
                          >
                            {t('settings.teamMenuRevoke')}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="inline-block w-9" aria-hidden />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
