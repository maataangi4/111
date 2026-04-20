import type { PaymentMethod } from '../store/types'

export function paymentMessageKey(m: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    USDT: 'payment.usdt',
    'ARS Efectivo': 'payment.arsCash',
    'ARS Transferencia': 'payment.arsTransfer',
  }
  return map[m]
}
