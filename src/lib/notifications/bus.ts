import { telegramSendMessage } from '../integrations/telegram'
import { formatTelegramMessage, type NotificationEvent } from './events'
import { useIntegrationsStore } from '../../store/useIntegrationsStore'
import { useCrmStore } from '../../store/useCrmStore'

/**
 * Dispatcher externo: envía al canal Telegram si está conectado.
 * Envía al grupo configurado + a cada empleado con telegramChatId vinculado.
 * Fire-and-forget — nunca bloquea la UI.
 */
export function dispatchTelegram(event: NotificationEvent): void {
  const tg = useIntegrationsStore.getState().integrations.telegram
  if (!tg?.connected) return
  const token = tg.config.botToken ?? ''
  if (!token) return

  const text = formatTelegramMessage(event)
  const sent = new Set<string>()

  const groupChatId = tg.config.chatId ?? ''
  if (groupChatId) {
    telegramSendMessage(token, groupChatId, text).catch(() => {})
    sent.add(groupChatId)
  }

  for (const emp of useCrmStore.getState().employees) {
    if (emp.telegramChatId && !sent.has(emp.telegramChatId)) {
      telegramSendMessage(token, emp.telegramChatId, text).catch(() => {})
      sent.add(emp.telegramChatId)
    }
  }
}
