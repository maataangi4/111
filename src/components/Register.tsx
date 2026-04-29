import { motion } from 'framer-motion'
import { CheckCircle2, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { C } from '../lib/crmUi'
import { cn } from '../lib/cn'
import { useAuthStore, type InvitationInfo } from '../store/useAuthStore'

export function Register({ token }: { token: string }) {
  const getInvitationByToken = useAuthStore((s) => s.getInvitationByToken)
  const acceptInvitation = useAuthStore((s) => s.acceptInvitation)

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [invalidToken, setInvalidToken] = useState(false)

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    getInvitationByToken(token).then((inv) => {
      if (!inv) setInvalidToken(true)
      else setInvitation(inv)
      setLoadingInvite(false)
    })
  }, [token, getInvitationByToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== password2) { setError('Las contraseñas no coinciden.'); return }
    if (!invitation) return
    setSubmitting(true)
    setError(null)
    const err = await acceptInvitation(token, password, invitation)
    if (err) { setError(err); setSubmitting(false); return }
    setDone(true)
  }

  const inputClass = cn(
    'w-full rounded-2xl border px-4 py-3 text-[15px] shadow-sm outline-none transition',
    C.input, 'bg-white/80 dark:bg-zinc-900/90',
  )

  return (
    <div className={cn('flex min-h-svh items-center justify-center px-4', C.gradientBg)}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={cn('w-full max-w-[400px] rounded-2xl border p-8 shadow-[var(--shadow-soft-lg)]', C.loginCard)}
      >
        {loadingInvite ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : invalidToken ? (
          <div className="py-6 text-center">
            <p className="text-lg font-semibold text-red-600 dark:text-red-400">Invitación inválida</p>
            <p className={cn('mt-2 text-sm', C.muted)}>Este link ya fue usado o expiró. Pedile al administrador que genere uno nuevo.</p>
            <button
              type="button"
              onClick={() => { window.location.hash = '' }}
              className={cn('mt-4 rounded-2xl px-6 py-2.5 text-sm font-medium', C.btnPrimary)}
            >
              Volver al inicio
            </button>
          </div>
        ) : done ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" strokeWidth={1.5} />
            <p className="text-lg font-semibold text-gray-900 dark:text-[#f1f1f1]">¡Cuenta creada!</p>
            <p className={cn('mt-2 text-sm', C.muted)}>Ya podés iniciar sesión con tu email y la contraseña que elegiste.</p>
            <button
              type="button"
              onClick={() => { window.location.hash = '' }}
              className={cn('mt-4 rounded-2xl px-6 py-2.5 text-sm font-medium', C.btnPrimary)}
            >
              Ir al login
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg">
                <Lock className="h-6 w-6 opacity-90" strokeWidth={1.75} />
              </div>
              <h1 className={cn('text-xl font-semibold tracking-tight', C.loginTitle)}>
                Bienvenido, {invitation?.full_name}
              </h1>
              <p className={cn('mt-1.5 text-sm', C.muted)}>
                Elegí tu contraseña para entrar a Canspace
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>Email</label>
                <input
                  className={cn(inputClass, 'opacity-60')}
                  value={invitation?.email ?? ''}
                  disabled
                />
              </div>
              <div>
                <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>Contraseña</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-green-700" />
                  <input
                    type="password"
                    className={cn(inputClass, 'pl-11')}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null) }}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              <div>
                <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>Repetir contraseña</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-green-700" />
                  <input
                    type="password"
                    className={cn(inputClass, 'pl-11')}
                    placeholder="••••••"
                    value={password2}
                    onChange={(e) => { setPassword2(e.target.value); setError(null) }}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-center text-sm text-red-600 dark:text-red-400">
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                disabled={submitting}
                whileTap={{ scale: 0.99 }}
                className={cn('mt-2 w-full rounded-2xl py-3.5 text-[15px] font-medium transition', C.btnPrimary, submitting && 'opacity-60 cursor-not-allowed')}
              >
                {submitting ? 'Creando cuenta...' : 'Crear mi cuenta'}
              </motion.button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
