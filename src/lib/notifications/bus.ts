import { telegramSendMessage } from '../integrations/telegram'
import { formatTelegramMessage, EVENT_ROLES, type NotificationEvent } from './events'
import { useIntegrationsStore } from '../../store/useIntegrationsStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useCrmStore } from '../../store/useCrmStore'

/**
 * Dispatcher con enrutamiento por roles (RBAC).
 * - Grupo: recibe TODOS los eventos siempre.
 * - Chat personal: solo recibe los eventos permitidos para su rol.
 * - Owner: recibe todo.
 * Fire-and-forget — nunca bloquea la UI.
 */
export function dispatchTelegram(event: NotificationEvent): void {
  const authState = useAuthStore.getState()
  const tgStore = useIntegrationsStore.getState().integrations.telegram
  const token = authState.tenant?.telegram_bot_token ?? tgStore?.config.botToken ?? ''
  if (!token) return

  const performer = authState.profile?.full_name
  const text = formatTelegramMessage(event) + (performer ? `\n\nEmpleado: ${performer}` : '')
  const sent = new Set<string>()

  // 1. Grupo — recibe todos los eventos sin filtro
  const groupChatId = authState.tenant?.telegram_group_chat_id ?? tgStore?.config.chatId ?? ''
  if (groupChatId) {
    telegramSendMessage(token, groupChatId, text).catch(() => {})
    sent.add(groupChatId)
  }

  // 2. Perfiles reales del tenant — filtrado por rol
  const allowedRoles = EVENT_ROLES[event.type]
  for (const p of authState.tenantProfiles) {
    if (
      p.telegram_chat_id &&
      !sent.has(p.telegram_chat_id) &&
      allowedRoles.includes(p.role)
    ) {
      telegramSendMessage(token, p.telegram_chat_id, text).catch(() => {})
      sent.add(p.telegram_chat_id)
    }
  }

  // 3. Empleados legacy del CRM store (compatibilidad — sin filtro de rol)
  for (const emp of useCrmStore.getState().employees) {
    if (emp.telegramChatId && !sent.has(emp.telegramChatId)) {
      telegramSendMessage(token, emp.telegramChatId, text).catch(() => {})
      sent.add(emp.telegramChatId)
    }
  }
}
