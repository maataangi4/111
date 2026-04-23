import { telegramSendMessage } from '../integrations/telegram'
import { formatTelegramMessage, type NotificationEvent } from './events'
import { useIntegrationsStore } from '../../store/useIntegrationsStore'

/**
 * Dispatcher externo: envía al canal Telegram si está conectado.
 * Fire-and-forget — nunca bloquea la UI.
 * Para el bell de UI usá useSociosStore.getState().pushNotification() directamente.
 */
export function dispatchTelegram(event: NotificationEvent): void {
  const tg = useIntegrationsStore.getState().integrations.telegram
  if (!tg?.connected) return
  const token = tg.config.botToken ?? ''
  const chatId = tg.config.chatId ?? ''
  if (!token || !chatId) return
  const text = formatTelegramMessage(event)
  telegramSendMessage(token, chatId, text).catch(() => {
    // silent fail — no bloquea la operación
  })
}
