import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Copy, Eye, EyeOff, Link2, Plus, RefreshCw, Send, Trash2, UserCog } from 'lucide-react'
import { Fragment, useState } from 'react'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import { telegramSendMessage } from '../../lib/integrations/telegram'
import { useCrmStore } from '../../store/useCrmStore'
import { useIntegrationsStore } from '../../store/useIntegrationsStore'
import { useAuthStore } from '../../store/useAuthStore'
import type { EmployeeRole } from '../../store/types'

const ROLE_BADGE: Record<EmployeeRole, string> = {
  manager:  'border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300',
  operator: 'border border-slate-200 bg-slate-100 text-slate-700 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#d4d4d4]',
  legal:    'border border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300',
  medical:  'border border-teal-100 bg-teal-50 text-teal-700 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-300',
}

const ROLE_LABEL: Record<EmployeeRole, string> = {
  manager:  'Manager',
  operator: 'Operador',
  legal:    'Legal',
  medical:  'Médico',
}

export function TeamRolesSettings() {
  const employees = useCrmStore((s) => s.employees)
  const addEmployee = useCrmStore((s) => s.addEmployee)
  const removeEmployee = useCrmStore((s) => s.removeEmployee)
  const setEmployeeTelegramChatId = useCrmStore((s) => s.setEmployeeTelegramChatId)
  const setEmployeeRole = useCrmStore((s) => s.setEmployeeRole)
  const regenerateAccessCode = useCrmStore((s) => s.regenerateAccessCode)
  const telegramEntry = useIntegrationsStore((s) => s.integrations.telegram)
  const botUsername = telegramEntry?.info?.username ?? ''
  const botConnected = telegramEntry?.connected ?? false

  const createInvitation = useAuthStore((s) => s.createInvitation)
  const authProfile = useAuthStore((s) => s.profile)
  const canInvite = authProfile?.role === 'owner'

  const [showForm, setShowForm] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [dniInput, setDniInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [roleInput, setRoleInput] = useState<EmployeeRole>('operator')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [visibleCode, setVisibleCode] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Telegram linking
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [chatIdInput, setChatIdInput] = useState('')
  const [linkError, setLinkError] = useState('')
  const [justLinked, setJustLinked] = useState<string | null>(null)

  async function handleInvite() {
    const n = nameInput.trim()
    const e = emailInput.trim()
    if (!n || !e) return
    setInviteLoading(true)
    setInviteError(null)
    setInviteLink(null)
    const token = await createInvitation(e, n, roleInput)
    if (!token) {
      setInviteError('No se pudo generar el link. Verificá que el email no esté registrado.')
    } else {
      const base = window.location.origin + window.location.pathname
      setInviteLink(`${base}#join=${token}`)
      addEmployee({ name: n, dni: '', photo: null, reprocan: null, role: roleInput })
      setNameInput('')
      setEmailInput('')
      setRoleInput('operator')
    }
    setInviteLoading(false)
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function saveLink(empId: string, empName: string) {
    const chatId = chatIdInput.trim()
    if (!chatId) return
    if (!/^-?\d+$/.test(chatId)) {
      setLinkError('El Chat ID debe ser solo números. Ej: 1504808624')
      return
    }
    setLinkError('')

    const token = useIntegrationsStore.getState().integrations.telegram?.config.botToken ?? ''
    if (!token) { setLinkError('Bot no configurado en Integraciones.'); return }

    try {
      await telegramSendMessage(
        token,
        chatId,
        `Hola ${empName}! Tu cuenta de Telegram esta vinculada a Canspace. Recibiras las notificaciones del cultivo directamente aqui.`,
      )
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Error de red desconocido')
      return
    }

    setEmployeeTelegramChatId(empId, chatId)
    setLinkingId(null)
    setChatIdInput('')
    setJustLinked(empId)
    setTimeout(() => setJustLinked(null), 3000)
  }

  return (
    <section className={cn('rounded-2xl border p-5 shadow-sm', C.card)}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UserCog className={cn('h-5 w-5', C.muted)} strokeWidth={1.75} />
            <h3 className={cn('text-lg font-semibold tracking-tight', C.heading)}>Gestión de Equipo</h3>
          </div>
          <p className={cn('mt-1 max-w-xl text-sm', C.muted)}>
            Añadí miembros del equipo y configurá su acceso y notificaciones de Telegram.
          </p>
        </div>
        {canInvite && (
          <motion.button type="button" whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm((v) => !v)}
            className={cn('inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium', C.btnPrimary)}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            Invitar miembro
          </motion.button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={cn('mb-5 overflow-hidden rounded-xl border p-4', C.cardMuted)}>
            <p className={cn('mb-3 text-sm font-semibold', C.heading)}>Invitar nuevo miembro</p>
            <div className="flex flex-wrap gap-2">
              <input className={cn('h-9 min-w-[160px] flex-1 rounded-xl border px-3 text-sm', C.input)}
                placeholder="Nombre completo *" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
              <input className={cn('h-9 min-w-[180px] flex-1 rounded-xl border px-3 text-sm', C.input)}
                type="email" placeholder="Email *" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
              <input className={cn('h-9 w-28 rounded-xl border px-3 text-sm', C.input)}
                placeholder="DNI" value={dniInput} onChange={(e) => setDniInput(e.target.value)} />
              <select value={roleInput} onChange={(e) => setRoleInput(e.target.value as EmployeeRole)}
                className={cn('h-9 rounded-xl border px-3 text-sm', C.input)}>
                <option value="operator">Operador</option>
                <option value="manager">Manager</option>
                <option value="legal">Legal</option>
                <option value="medical">Médico</option>
              </select>
              <motion.button type="button" whileTap={{ scale: 0.97 }}
                onClick={() => void handleInvite()}
                disabled={inviteLoading || !nameInput.trim() || !emailInput.trim()}
                className={cn('h-9 rounded-xl px-4 text-sm font-medium', C.btnPrimary, (inviteLoading || !nameInput.trim() || !emailInput.trim()) && 'opacity-50 cursor-not-allowed')}>
                {inviteLoading ? 'Generando...' : 'Generar link'}
              </motion.button>
              <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => { setShowForm(false); setInviteLink(null); setInviteError(null) }}
                className={cn('h-9 rounded-xl px-3 text-sm font-medium', C.btnSecondary)}>
                Cancelar
              </motion.button>
            </div>
            {inviteError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">❌ {inviteError}</p>
            )}
            {inviteLink && (
              <div className={cn('mt-3 rounded-xl border p-3', C.cardMuted)}>
                <p className={cn('mb-1.5 text-xs font-medium', C.heading)}>
                  ✅ Link generado — mandáselo al empleado:
                </p>
                <div className="flex items-center gap-2">
                  <code className={cn('flex-1 truncate rounded-lg border px-2 py-1 text-xs', C.input)}>
                    {inviteLink}
                  </code>
                  <motion.button type="button" whileTap={{ scale: 0.95 }}
                    onClick={() => { navigator.clipboard.writeText(inviteLink).catch(() => {}); setCopied('invite') ; setTimeout(() => setCopied(null), 2000) }}
                    className={cn('shrink-0 rounded-lg p-1.5 transition', copied === 'invite' ? 'text-emerald-500' : C.muted)}>
                    {copied === 'invite' ? <CheckCircle2 className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  </motion.button>
                </div>
                <p className={cn('mt-1.5 text-[11px]', C.muted)}>El link expira en 7 días.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Owner row (hardcoded) */}
      <div className="-mx-5 overflow-x-auto border-t border-gray-200/80 dark:border-[#2e2e2e]">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className={cn('border-b border-gray-200/90 dark:border-[#2e2e2e]', C.tableHead)}>
              <th className="px-5 py-3 font-semibold">Miembro</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Acceso</th>
              <th className="px-4 py-3 font-semibold">Telegram</th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {/* Owner row — datos reales del usuario logueado */}
            {authProfile && (
              <tr className={cn('border-b border-gray-100 dark:border-[#2e2e2e]', C.tableRow)}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold', C.iconBox)}>
                      {authProfile.full_name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <p className={cn('font-medium', C.heading)}>{authProfile.full_name}</p>
                      <p className={cn('text-xs', C.muted)}>{authProfile.role === 'owner' ? 'Propietario/a' : ROLE_LABEL[authProfile.role as EmployeeRole] ?? authProfile.role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex rounded-md px-2.5 py-1 text-xs font-semibold border border-purple-100 bg-purple-50 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300">
                    {authProfile.role.charAt(0).toUpperCase() + authProfile.role.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={cn('text-xs font-mono', C.muted)}>{authProfile.username}</span>
                </td>
                <td className="px-4 py-4">
                  <span className={cn('text-xs', authProfile.telegram_chat_id ? 'text-emerald-600 dark:text-emerald-400' : C.muted)}>
                    {authProfile.telegram_chat_id ? '✓ Vinculado' : '—'}
                  </span>
                </td>
                <td className="px-3 py-4" />
              </tr>
            )}

            {/* Employees */}
            {employees.map((emp) => (
              <Fragment key={emp.id}>
                <tr className={cn('border-b border-gray-100 transition-colors last:border-b-0 dark:border-[#2e2e2e]', C.tableRow, C.rowHover)}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold', C.iconBox)}>
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className={cn('font-medium', C.heading)}>{emp.name}</p>
                        <p className={cn('text-xs', C.muted)}>{emp.dni || 'Sin DNI'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <select value={emp.role} onChange={(e) => setEmployeeRole(emp.id, e.target.value as EmployeeRole)}
                      className={cn('rounded-lg border px-2 py-1 text-xs font-semibold', ROLE_BADGE[emp.role], 'cursor-pointer')}>
                      <option value="operator">Operador</option>
                      <option value="manager">Manager</option>
                      <option value="legal">Legal</option>
                      <option value="medical">Médico</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <div>
                        <p className={cn('text-xs font-mono', C.heading)}>{emp.username}</p>
                        <div className="flex items-center gap-1">
                          <p className={cn('font-mono text-xs', C.muted)}>
                            {visibleCode === emp.id ? emp.accessCode : '••••••••'}
                          </p>
                          <button type="button" onClick={() => setVisibleCode(v => v === emp.id ? null : emp.id)}
                            className={cn('rounded p-0.5', C.muted)}>
                            {visibleCode === emp.id
                              ? <EyeOff className="h-3 w-3" />
                              : <Eye className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                      <button type="button" title="Copiar credenciales"
                        onClick={() => copyToClipboard(`Usuario: ${emp.username}\nCódigo: ${emp.accessCode}`, emp.id)}
                        className={cn('rounded-lg p-1.5 transition', copied === emp.id ? 'text-emerald-500' : C.muted)}>
                        {copied === emp.id ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" title="Regenerar código"
                        onClick={() => { if (confirm(`¿Regenerar código de acceso de ${emp.name}? El código anterior dejará de funcionar.`)) regenerateAccessCode(emp.id) }}
                        className={cn('rounded-lg p-1.5 transition', C.muted)}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {justLinked === emp.id ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Vinculado
                      </span>
                    ) : emp.telegramChatId ? (
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <Send className="h-3 w-3" /> Activo
                        </span>
                        <button type="button" onClick={() => { setLinkingId(emp.id); setChatIdInput(emp.telegramChatId ?? ''); setLinkError('') }}
                          className={cn('rounded px-1.5 py-0.5 text-xs', C.muted, 'underline underline-offset-2')}>
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setLinkingId(emp.id); setChatIdInput(''); setLinkError('') }}
                        className={cn('flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition', C.btnSecondary)}>
                        <Send className="h-3 w-3" /> Vincular
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-4 text-right">
                    <button type="button"
                      onClick={() => { if (confirm(`¿Eliminar a ${emp.name} del equipo?`)) removeEmployee(emp.id) }}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400">
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>

                {/* Telegram link panel */}
                {linkingId === emp.id && (
                  <tr className={cn('border-b border-gray-100 dark:border-[#2e2e2e]', C.tableRow)}>
                    <td colSpan={5} className="px-5 py-3">
                      <div className={cn('rounded-xl border p-4', C.cardMuted)}>
                        <p className={cn('mb-3 text-sm font-semibold', C.heading)}>
                          Vincular Telegram de {emp.name}
                        </p>

                        {!botConnected ? (
                          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                            ⚠️ El bot de Telegram no está configurado. Configuralo primero en{' '}
                            <span className="font-semibold">Integraciones → Telegram Bot</span>.
                          </p>
                        ) : (
                          <ol className={cn('mb-3 space-y-1.5 text-xs', C.muted)}>
                            <li className="flex items-start gap-1.5">
                              <span className="mt-0.5 font-bold text-sky-500">1.</span>
                              <span>
                                {emp.name} debe abrir Telegram y buscar{' '}
                                {botUsername ? (
                                  <a
                                    href={`https://t.me/${botUsername}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold text-sky-500 underline underline-offset-2"
                                  >
                                    @{botUsername}
                                  </a>
                                ) : (
                                  <span className="font-semibold">el bot configurado</span>
                                )}{' '}
                                y mandar <span className="font-mono font-semibold">/start</span>.{' '}
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  (Obligatorio — sin esto el bot no puede escribirle)
                                </span>
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="mt-0.5 font-bold text-sky-500">2.</span>
                              <span>
                                Abrir{' '}
                                <a
                                  href="https://t.me/userinfobot"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-sky-500 underline underline-offset-2"
                                >
                                  @userinfobot
                                </a>{' '}
                                y mandar <span className="font-mono font-semibold">/start</span> — copiar el número (Chat ID) que responde.
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="mt-0.5 font-bold text-sky-500">3.</span>
                              <span>Pegá ese número acá abajo y hacé click en Guardar.</span>
                            </li>
                          </ol>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <input
                            autoFocus
                            className={cn('h-8 w-44 rounded-lg border px-2.5 text-xs', C.input)}
                            placeholder="Ej: 1504808624"
                            value={chatIdInput}
                            onChange={(e) => setChatIdInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void saveLink(emp.id, emp.name) }}
                          />
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            disabled={!chatIdInput.trim() || !botConnected}
                            onClick={() => void saveLink(emp.id, emp.name)}
                            className={cn('h-8 rounded-lg px-3 text-xs font-medium', C.btnPrimary)}
                          >
                            Guardar y verificar
                          </motion.button>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            onClick={() => { setLinkingId(null); setChatIdInput(''); setLinkError('') }}
                            className={cn('h-8 rounded-lg px-3 text-xs font-medium', C.btnSecondary)}
                          >
                            Cancelar
                          </motion.button>
                        </div>
                        {linkError && (
                          <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                            ❌ {linkError}
                          </p>
                        )}
                        <p className={cn('mt-2 text-[11px]', C.muted)}>
                          Al guardar se envía un mensaje de prueba. Si falla, revisá que el empleado haya hecho el paso 1.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {employees.length === 0 && (
        <p className={cn('py-8 text-center text-sm', C.muted)}>
          No hay miembros del equipo aún. Añadí el primero con el botón de arriba.
        </p>
      )}
    </section>
  )
}
