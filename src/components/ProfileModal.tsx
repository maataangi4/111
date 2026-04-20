import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CreditCard, Pencil as PencilIcon, Plus as PlusIcon, Shield, User, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, AvatarBadge, AvatarCircle, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTranslation } from '../i18n/useTranslation'
import { fileToAvatarDataUrl } from '../lib/avatarImage'
import { cn } from '../lib/cn'
import { useSettingsStore } from '../store/useSettingsStore'

type ProfileSection = 'general' | 'profile' | 'security' | 'notifications' | 'subscription'

export type ProfileModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenSubscription?: () => void
}

export function ProfileModal({ open, onOpenChange, onOpenSubscription }: ProfileModalProps) {
  const { t } = useTranslation()
  const profileAvatarDataUrl = useSettingsStore((s) => s.profileAvatarDataUrl ?? null)
  const setProfileAvatarDataUrl = useSettingsStore((s) => s.setProfileAvatarDataUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [section, setSection] = useState<ProfileSection>('profile')
  const [privateProfile, setPrivateProfile] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setSection('profile')
    setAvatarError(null)
  }, [open])

  const onAvatarFile = async (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) return
    setAvatarError(null)
    try {
      const dataUrl = await fileToAvatarDataUrl(file, 400, 0.88)
      setProfileAvatarDataUrl(dataUrl)
    } catch {
      setAvatarError(t('profileModal.photoReadError'))
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const nav = useMemo(
    () =>
      [
        { id: 'general' as const, label: t('nav.settingsSubGeneral'), icon: User },
        { id: 'profile' as const, label: t('nav.settingsSubProfile'), icon: User },
        { id: 'security' as const, label: 'Security', icon: Shield },
        { id: 'notifications' as const, label: t('topBar.notifications'), icon: Bell },
        { id: 'subscription' as const, label: t('nav.settingsSubSubscription'), icon: CreditCard },
      ] as const,
    [t],
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="profile-modal-root"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[3px] dark:bg-black/50"
            aria-label={t('common.close')}
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative z-10 w-full max-w-[min(980px,95vw)] overflow-hidden rounded-[2.25rem] border border-slate-200/90 bg-white shadow-[0_26px_90px_-14px_rgba(15,23,42,0.28)]',
              'dark:border-[#3d3d3d] dark:bg-[#1c1c1c] dark:shadow-[0_26px_90px_-14px_rgba(0,0,0,0.55)]',
            )}
            initial={{ opacity: 0, scale: 0.98, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a] dark:hover:text-[#f1f1f1]"
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>

            <div className="grid min-h-[520px] grid-cols-1 md:grid-cols-[260px_1fr]">
              <aside className="border-b border-slate-200/80 bg-slate-50/70 p-4 md:border-b-0 md:border-r md:p-5 dark:border-[#2f2f2f] dark:bg-[#161616]">
                <div className="px-2 pb-3 pt-2 text-sm font-semibold text-slate-900 dark:text-[#f1f1f1]">
                  {t('nav.settings')}
                </div>
                <nav className="space-y-1">
                  {nav.map((item) => {
                    const active = item.id === section
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSection(item.id)}
                        aria-pressed={active}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition',
                          active
                            ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1f1f1f] dark:text-[#f1f1f1]'
                            : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-[#b8b8b8] dark:hover:bg-white/[0.04] dark:hover:text-[#f1f1f1]',
                        )}
                      >
                        <Icon className="h-4 w-4 opacity-80" strokeWidth={2} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </aside>

              <section className="p-6 md:p-8">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-[#f1f1f1]">
                  {nav.find((x) => x.id === section)?.label ?? t('nav.settingsSubProfile')}
                </h2>

                {section === 'profile' ? (
                  <div className="mt-6 divide-y divide-slate-200/80 overflow-hidden rounded-2xl border border-slate-200/90 bg-white dark:divide-[#2f2f2f] dark:border-[#2f2f2f] dark:bg-[#1a1a1a]">
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-[#f1f1f1]">Private profile</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrivateProfile((v) => !v)}
                        aria-pressed={privateProfile}
                        className={cn(
                          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition',
                          privateProfile ? 'bg-emerald-500' : 'bg-slate-300',
                          'dark:bg-[#3a3a3a]',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-6 w-6 translate-x-0.5 rounded-full bg-white shadow transition',
                            privateProfile && 'translate-x-[1.35rem]',
                          )}
                        />
                      </button>
                    </div>

                    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-[#f1f1f1]">
                          {t('profileModal.avatar')}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-[#8c8c8c]">
                          {t('profileModal.avatarHint')}
                        </p>
                        {avatarError ? (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{avatarError}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(e) => void onAvatarFile(e.target.files)}
                        />
                        <Avatar className="h-12 w-12">
                          <AvatarCircle>
                            {profileAvatarDataUrl ? (
                              <AvatarImage src={profileAvatarDataUrl} alt={t('topBar.profile')} />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-rose-500 text-sm font-bold text-white">
                                ED
                              </AvatarFallback>
                            )}
                          </AvatarCircle>
                          <AvatarBadge
                            title={t('profileModal.choosePhoto')}
                            aria-label={t('profileModal.choosePhoto')}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {profileAvatarDataUrl ? (
                              <PencilIcon className="h-3 w-3" strokeWidth={2.25} />
                            ) : (
                              <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                            )}
                          </AvatarBadge>
                        </Avatar>
                        {profileAvatarDataUrl ? (
                          <button
                            type="button"
                            onClick={() => setProfileAvatarDataUrl(null)}
                            className="rounded-xl border border-transparent px-3 py-1.5 text-xs font-medium text-slate-600 underline-offset-2 hover:underline dark:text-[#a3a3a3]"
                          >
                            {t('profileModal.removePhoto')}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-[#f1f1f1]">Portfolio link</p>
                      <p className="text-sm text-slate-600 dark:text-[#c4c4c4]">greenluck.app/@username</p>
                    </div>

                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-[#f1f1f1]">Display name</p>
                      <p className="text-sm text-slate-600 dark:text-[#c4c4c4]">Green Luck</p>
                    </div>
                  </div>
                ) : section === 'subscription' ? (
                  <div className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-6 dark:border-[#2f2f2f] dark:bg-[#1a1a1a]">
                    <p className="text-sm text-slate-600 dark:text-[#c4c4c4]">{t('subscriptionOverview.subtitle')}</p>
                    <button
                      type="button"
                      onClick={() => onOpenSubscription?.()}
                      className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-[#4a4a4a] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:hover:bg-[#333]"
                    >
                      {t('subscriptionOverview.comparePlans')}
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-6 text-sm text-slate-600 dark:border-[#2f2f2f] dark:bg-[#1a1a1a] dark:text-[#c4c4c4]">
                    Próximamente.
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

