import { motion } from 'framer-motion'
import { Lock, User } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '../i18n/useTranslation'
import { C } from '../lib/crmUi'
import { cn } from '../lib/cn'
import { useCrmStore } from '../store/useCrmStore'

export function Login() {
  const { t } = useTranslation()
  const login = useCrmStore((s) => s.login)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const ok = login(username, password)
    setError(!ok)
  }

  const inputClass = cn(
    'w-full rounded-2xl border px-4 py-3 text-[15px] shadow-sm outline-none transition',
    C.input,
    'bg-white/80 dark:bg-zinc-900/90',
  )

  return (
    <div
      className={cn(
        'flex min-h-svh items-center justify-center px-4',
        C.gradientBg,
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'w-full max-w-[400px] rounded-2xl border p-8 shadow-[var(--shadow-soft-lg)]',
          C.loginCard,
        )}
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-lg shadow-gray-900/15 dark:bg-lime-400 dark:text-zinc-950">
            <Lock className="h-6 w-6 opacity-90" strokeWidth={1.75} />
          </div>
          <h1 className={cn('text-xl font-semibold tracking-tight', C.loginTitle)}>
            {t('login.title')}
          </h1>
          <p className={cn('mt-1.5 text-sm', C.muted)}>{t('login.subtitle')}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>
              {t('login.user')}
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-green-700" />
              <input
                className={cn(inputClass, 'pl-11')}
                placeholder="admin"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError(false)
                }}
                autoComplete="username"
              />
            </div>
          </div>
          <div>
            <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>
              {t('login.password')}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-green-700" />
              <input
                type="password"
                className={cn(inputClass, 'pl-11')}
                placeholder="••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(false)
                }}
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm text-red-600 dark:text-red-400"
            >
              {t('login.error')}
            </motion.p>
          )}

          <motion.button
            type="submit"
            whileTap={{ scale: 0.99 }}
            className={cn(
              'mt-2 w-full rounded-2xl py-3.5 text-[15px] font-medium transition',
              C.btnPrimary,
            )}
          >
            {t('login.submit')}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
