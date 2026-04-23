export interface TelegramBotInfo {
  id: number
  first_name: string
  username?: string
  is_bot: boolean
}

export async function telegramGetMe(token: string): Promise<TelegramBotInfo> {
  const res = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`)
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
  const data = (await res.json()) as { ok: boolean; result?: TelegramBotInfo; description?: string }
  if (!data.ok || !data.result) throw new Error(data.description ?? 'Token inválido')
  return data.result
}

export async function telegramSendMessage(
  token: string,
  chatId: string,
  text: string,
): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token.trim()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId.trim(), text }),
  })
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
  const data = (await res.json()) as { ok: boolean; description?: string }
  if (!data.ok) throw new Error(data.description ?? 'No se pudo enviar el mensaje')
}
