import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Copy, Eye, EyeOff, Plus, RefreshCw, Send, Trash2, UserCog } from 'lucide-react'
import { Fragment, useState } from 'react'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import { telegramSendMessage } from '../../lib/integrations/telegram'
import { useCrmStore } from '../../store/useCrmStore'
import { useIntegrationsStore } from '../../store/useIntegrationsStore'
import type { EmployeeRole } from '../../store/types'

const ROLE_BADGE: Record<EmployeeRole, string> = {
  manager: 'border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300',
  operator: 'border border-slate-200 bg-slate-100 text-slate-700 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#d4d4d4]',
}

export function TeamRolesSettings() {
  const employees = useCrmStore((s) => s.employees)
  const addEmployee = useCrmStore((s) => s.addEmployee)
  const removeEmployee = useCrmStore((s) => s.removeEmployee)
  const setEmployeeTelegramChatId = useCrmStore((s) => s.setEmployeeTelegramChatId)
  const setEmployeeRole = useCrmStore((s) => s.setEmployeeRole)
  const regenerateAccessCode = useCrmStore((s) => s.regenerateAccessCode)

  const [showForm, setShowForm] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [dniInput, setDniInput] = useState('')
  const [roleInput, setRoleInput] = useState<EmployeeRole>('operator')

  const [visibleCode, setVisibleCode] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Telegram linking
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [chatIdInput, setChatIdInput] = useState('')
  const [linkError, setLinkError] = useState('')
  const [justLinked, setJustLinked] = useState<string | null>(null)

  function addMember() {
    const n = nameInput.trim()
    const d = dniInput.trim()
    if (!n) return
    addEmployee({ name: n, dni: d, photo: null, reprocan: null, role: roleInput })
    setNameInput('')
    setDniInput('')
    setRoleInput('operator')
    setShowForm(false)
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
        <motion.button type="button" whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm((v) => !v)}
          className={cn('inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium', C.btnPrimary)}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          Añadir miembro
        </motion.button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={cn('mb-5 overflow-hidden rounded-xl border p-4', C.cardMuted)}>
            <p className={cn('mb-3 text-sm font-semibold', C.heading)}>Nuevo miembro</p>
            <div className="flex flex-wrap gap-2">
              <input className={cn('h-9 min-w-[160px] flex-1 rounded-xl border px-3 text-sm', C.input)}
                placeholder="Nombre completo *" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addMember() }} />
              <input className={cn('h-9 w-36 rounded-xl border px-3 text-sm', C.input)}
                placeholder="DNI" value={dniInput} onChange={(e) => setDniInput(e.target.value)} />
              <select value={roleInput} onChange={(e) => setRoleInput(e.target.value as EmployeeRole)}
                className={cn('h-9 rounded-xl border px-3 text-sm', C.input)}>
                <option value="operator">Operador</option>
                <option value="manager">Manager</option>
              </select>
              <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={addMember}
                className={cn('h-9 rounded-xl px-4 text-sm font-medium', C.btnPrimary)}>
                Crear
              </motion.button>
              <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => setShowForm(false)}
                className={cn('h-9 rounded-xl px-3 text-sm font-medium', C.btnSecondary)}>
                Cancelar
              </motion.button>
            </div>
            <p className={cn('mt-2 text-xs', C.muted)}>Se generarán credenciales de acceso únicas automáticamente.</p>
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
            {/* Owner */}
            <tr className={cn('border-b border-gray-100 dark:border-[#2e2e2e]', C.tableRow)}>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold', C.iconBox)}>NS</div>
                  <div>
                    <p className={cn('font-medium', C.heading)}>Natalia Sakharova</p>
                    <p className={cn('text-xs', C.muted)}>Propietaria</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex rounded-md px-2.5 py-1 text-xs font-semibold border border-purple-100 bg-purple-50 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300">
                  Owner
                </span>
              </td>
              <td className="px-4 py-4">
                <span className={cn('text-xs', C.muted)}>admin / admin</span>
              </td>
              <td className="px-4 py-4">
                <span className={cn('text-xs', C.muted)}>—</span>
              </td>
              <td className="px-3 py-4" />
            </tr>

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
                      <div className={cn('rounded-xl border p-3', C.cardMuted)}>
                        <p className={cn('mb-2 text-sm font-semibold', C.heading)}>Vincular Telegram de {emp.name}</p>
                        <ol className={cn('mb-2 space-y-0.5 text-xs', C.muted)}>
                          <li>1. Abrí <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer"
                            className="font-semibold text-sky-500 underline underline-offset-2">@userinfobot</a> en Telegram</li>
                          <li>2. Mandá <span className="font-mono font-semibold">/start</span> → copiá el número que responde</li>
                        </ol>
                        <div className="flex flex-wrap gap-2">
                          <input autoFocus
                            className={cn('h-8 w-40 rounded-lg border px-2.5 text-xs', C.input)}
                            placeholder="Ej: 1504808624"
                            value={chatIdInput}
                            onChange={(e) => setChatIdInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void saveLink(emp.id, emp.name) }}
                          />
                          <motion.button type="button" whileTap={{ scale: 0.97 }}
                            disabled={!chatIdInput.trim()}
                            onClick={() => void saveLink(emp.id, emp.name)}
                            className={cn('h-8 rounded-lg px-3 text-xs font-medium', C.btnPrimary)}>
                            Guardar
                          </motion.button>
                          <motion.button type="button" whileTap={{ scale: 0.97 }}
                            onClick={() => { setLinkingId(null); setChatIdInput(''); setLinkError('') }}
                            className={cn('h-8 rounded-lg px-3 text-xs font-medium', C.btnSecondary)}>
                            Cancelar
                          </motion.button>
                        </div>
                        {linkError && <p className="mt-1.5 text-xs text-red-500">{linkError}</p>}
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
