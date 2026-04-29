import { useState, type ReactNode } from 'react'
import { CheckCircle2, ExternalLink, Send } from 'lucide-react'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import { telegramGetMe, telegramSendMessage } from '../../lib/integrations/telegram'
import { useAuthStore } from '../../store/useAuthStore'

const ROLE_LABEL: Record<string, string> = {
  owner:    'Propietario',
  manager:  'Master Grower',
  operator: 'Operador',
  legal:    'Legal',
  medical:  'Médico',
}

const ROLE_BADGE: Record<string, string> = {
  owner:    'border border-purple-100 bg-purple-50 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300',
  manager:  'border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300',
  operator: 'border border-slate-200 bg-slate-100 text-slate-700 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#d4d4d4]',
  legal:    'border border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300',
  medical:  'border border-teal-100 bg-teal-50 text-teal-700 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-300',
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={cn('border-b border-gray-200/70 pb-10 dark:border-[#2e2e2e]/80', 'last:border-b-0 last:pb-0')}>
      <h3 className={cn('text-base font-semibold tracking-tight', C.heading)}>{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function ProfileSettingsPanel() {
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const updateTelegramChatId = useAuthStore((s) => s.updateTelegramChatId)

  const [linking, setLinking] = useState(false)
  const [chatIdInput, setChatIdInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justLinked, setJustLinked] = useState(false)

  if (!profile) return null

  const initials = profile.full_name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const botToken = tenant?.telegram_bot_token ?? null
  const isLinked = justLinked || !!profile.telegram_chat_id

  async function getBotUsername(): Promise<string | null> {
    if (!botToken) return null
    try {
      const info = await telegramGetMe(botToken)
      return info.username ?? null
    } catch {
      return null
    }
  }

  async function saveAndVerify() {
    const chatId = chatIdInput.trim()
    if (!chatId || !profile || !botToken) return

    if (!/^-?\d+$/.test(chatId)) {
      setError('El Chat ID debe ser solo números. Ej: 1504808624')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Mensaje de bienvenida al chat personal del empleado
      await telegramSendMessage(
        botToken,
        chatId,
        `✅ Hola ${profile.full_name}! Tu Telegram quedó vinculado a Canspace. A partir de ahora recibirás las notificaciones del cultivo aquí.`,
      )
      // Notificación al grupo
      const groupChatId = tenant?.telegram_group_chat_id ?? ''
      if (groupChatId && groupChatId !== chatId) {
        telegramSendMessage(
          botToken,
          groupChatId,
          `🔗 ${profile.full_name} vinculó su Telegram personal al sistema.`,
        ).catch(() => {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje. Verificá el Chat ID.')
      setSaving(false)
      return
    }

    await updateTelegramChatId(profile.id, chatId)
    setSaving(false)
    setLinking(false)
    setChatIdInput('')
    setJustLinked(true)
  }

  return (
    <div className="space-y-8">
      {/* ── Cuenta ── */}
      <ProfileSection title="Cuenta">
        <div className="flex items-center gap-4">
          <div className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold', C.iconBox)}>
            {initials}
          </div>
          <div>
            <p className={cn('text-lg font-semibold', C.heading)}>{profile.full_name}</p>
            <p className={cn('text-sm', C.muted)}>{user?.email}</p>
            <span className={cn('mt-1.5 inline-flex rounded-md px-2.5 py-1 text-xs font-semibold', ROLE_BADGE[profile.role] ?? ROLE_BADGE.operator)}>
              {ROLE_LABEL[profile.role] ?? profile.role}
            </span>
          </div>
        </div>
      </ProfileSection>

      {/* ── Telegram personal ── */}
      <ProfileSection title="Telegram personal">
        <p className={cn('mb-4 text-sm', C.muted)}>
          Vinculá tu Telegram para recibir alertas del cultivo directamente en tu chat personal.
        </p>

        {/* Ya vinculado */}
        {isLinked && !linking ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Telegram vinculado</span>
              {profile.telegram_chat_id && (
                <span className={cn('text-xs', C.muted)}>· ID {profile.telegram_chat_id}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setJustLinked(false); setLinking(true); setChatIdInput(profile.telegram_chat_id ?? ''); setError(null) }}
              className={cn('text-xs underline underline-offset-2', C.muted)}
            >
              Cambiar
            </button>
          </div>

        /* Bot no configurado */
        ) : !botToken && !linking ? (
          <div className="rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400">
            ⚠️ El bot de Telegram no está configurado. Pedile al administrador que lo active en{' '}
            <span className="font-semibold">Integraciones → Telegram Bot</span>.
          </div>

        /* Botón inicial */
        ) : !linking ? (
          <button
            type="button"
            onClick={() => { setLinking(true); setChatIdInput(''); setError(null) }}
            className={cn('inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition', C.btnSecondary)}
          >
            <Send className="h-4 w-4" strokeWidth={1.75} />
            Vincular Telegram
          </button>

        /* Panel de vinculación */
        ) : (
          <div className={cn('rounded-xl border p-4', C.cardMuted)}>
            <p className={cn('mb-4 text-sm font-semibold', C.heading)}>Seguí estos pasos:</p>
            <ol className={cn('mb-5 space-y-3 text-sm', C.muted)}>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 min-w-[1.25rem] font-bold text-sky-500">1.</span>
                <span>
                  Abrí{' '}
                  <BotLink username="CanspaceclubBot" fetchUsername={getBotUsername} />
                  {' '}en Telegram y presioná{' '}
                  <span className="font-semibold">Iniciar</span>.{' '}
                  <span className="text-amber-600 dark:text-amber-400 font-medium">(Obligatorio)</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 min-w-[1.25rem] font-bold text-sky-500">2.</span>
                <span>
                  Abrí{' '}
                  <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer"
                    className="font-semibold text-sky-500 underline underline-offset-2 inline-flex items-center gap-0.5">
                    @userinfobot <ExternalLink className="h-3 w-3" />
                  </a>
                  {' '}y mandá cualquier mensaje. Copiá el número que aparece como <span className="font-mono font-semibold">Id:</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 min-w-[1.25rem] font-bold text-sky-500">3.</span>
                <span>Pegá ese número acá abajo y tocá <span className="font-semibold">Guardar</span>.</span>
              </li>
            </ol>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className={cn('h-9 w-44 rounded-xl border px-3 text-sm', C.input)}
                placeholder="Ej: 1504808624"
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void saveAndVerify() }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => void saveAndVerify()}
                disabled={saving || !chatIdInput.trim()}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
                  C.btnPrimary,
                  (saving || !chatIdInput.trim()) && 'cursor-not-allowed opacity-50',
                )}
              >
                {saving ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Guardando…
                  </>
                ) : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => { setLinking(false); setChatIdInput(''); setError(null) }}
                className={cn('rounded-xl px-4 py-2 text-sm font-medium', C.btnSecondary)}
              >
                Cancelar
              </button>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                ❌ {error}
              </p>
            )}
            <p className={cn('mt-3 text-xs', C.muted)}>
              Al guardar se envía un mensaje de prueba al chat. Si falla, asegurate de haber hecho el paso 1.
            </p>
          </div>
        )}
      </ProfileSection>
    </div>
  )
}

function BotLink({ username, fetchUsername }: { username: string; fetchUsername: () => Promise<string | null> }) {
  const [resolvedName, setResolvedName] = useState(username)

  return (
    <a
      href={`https://t.me/${resolvedName}`}
      target="_blank"
      rel="noreferrer"
      onClick={async () => {
        const name = await fetchUsername()
        if (name) setResolvedName(name)
      }}
      className="font-semibold text-sky-500 underline underline-offset-2 inline-flex items-center gap-0.5"
    >
      @{resolvedName} <ExternalLink className="h-3 w-3" />
    </a>
  )
}
