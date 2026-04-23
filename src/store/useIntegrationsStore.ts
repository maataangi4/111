import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type IntegrationId =
  | 'telegram'
  | 'homeAssistant'
  | 'googleSheets'
  | 'googleDrive'
  | 'whatsapp'
  | 'mercadopago'
  | 'bluelab'
  | 'trolmaster'

export interface IntegrationEntry {
  id: IntegrationId
  connected: boolean
  lastConnectedAt: string | null
  config: Record<string, string>
  info: Record<string, string>
}

interface IntegrationsState {
  integrations: Record<IntegrationId, IntegrationEntry>
  patchConfig: (id: IntegrationId, patch: Record<string, string>) => void
  setConnected: (id: IntegrationId, connected: boolean) => void
  setInfo: (id: IntegrationId, info: Record<string, string>) => void
  disconnect: (id: IntegrationId) => void
}

const ALL_IDS: IntegrationId[] = [
  'telegram',
  'homeAssistant',
  'googleSheets',
  'googleDrive',
  'whatsapp',
  'mercadopago',
  'bluelab',
  'trolmaster',
]

const TELEGRAM_SEED: Partial<IntegrationEntry> = {
  connected: true,
  lastConnectedAt: new Date().toISOString(),
  config: {
    botToken: '8637490574:AAF0s5ReeZFasBZeiOUJwYtB4_H3Er-f36U',
    chatId: '-5294330075',
  },
  info: { firstName: 'Canspace_bot', username: 'CanspaceBot' },
}

function makeDefault(id: IntegrationId): IntegrationEntry {
  return { id, connected: false, lastConnectedAt: null, config: {}, info: {} }
}

function defaultIntegrations(): Record<IntegrationId, IntegrationEntry> {
  const out = {} as Record<IntegrationId, IntegrationEntry>
  for (const id of ALL_IDS) out[id] = makeDefault(id)
  out.telegram = { ...makeDefault('telegram'), ...TELEGRAM_SEED }
  return out
}

export const INTEGRATION_DEFAULT = makeDefault

export const useIntegrationsStore = create<IntegrationsState>()(
  persist(
    (set) => ({
      integrations: defaultIntegrations(),

      patchConfig: (id, patch) =>
        set((s) => ({
          integrations: {
            ...s.integrations,
            [id]: {
              ...s.integrations[id],
              config: { ...(s.integrations[id]?.config ?? {}), ...patch },
            },
          },
        })),

      setConnected: (id, connected) =>
        set((s) => ({
          integrations: {
            ...s.integrations,
            [id]: {
              ...s.integrations[id],
              connected,
              lastConnectedAt: connected
                ? new Date().toISOString()
                : (s.integrations[id]?.lastConnectedAt ?? null),
            },
          },
        })),

      setInfo: (id, info) =>
        set((s) => ({
          integrations: {
            ...s.integrations,
            [id]: { ...s.integrations[id], info },
          },
        })),

      disconnect: (id) =>
        set((s) => ({
          integrations: {
            ...s.integrations,
            [id]: { ...makeDefault(id) },
          },
        })),
    }),
    {
      name: 'canspace-integrations',
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<IntegrationsState>
        const base = defaultIntegrations()
        const saved: Partial<Record<IntegrationId, IntegrationEntry>> = { ...(p.integrations ?? {}) }
        // Si el localStorage no tiene telegram conectado, usamos el seed
        if (!saved.telegram?.connected) saved.telegram = base.telegram
        return {
          ...current,
          integrations: { ...base, ...saved } as Record<IntegrationId, IntegrationEntry>,
        }
      },
    },
  ),
)
