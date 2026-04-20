/** Demo / stub: считаем, что организация уже на верхнем тарифе. Позже заменить на данные с бэкенда. */
export const SUBSCRIPTION_STUB = {
  isMaxPlan: true,
  planTierKey: 'enterprise' as const,
  memberSinceIso: '2025-01-10T12:00:00.000Z',
  renewsAtIso: '2026-12-15T12:00:00.000Z',
  billingCycleKey: 'annual' as const,
}
