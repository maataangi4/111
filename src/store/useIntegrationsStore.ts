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
}

interface IntegrationsState {
  integrations: Record<IntegrationId, IntegrationEntry>
  patchConfig: (id: IntegrationId, patch: Record<string, string>) => void
  setConnected: (id: IntegrationId, connected: boolean) => void
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

function makeDefault(id: IntegrationId): IntegrationEntry {
  return { id, connected: false, lastConnectedAt: null, config: {} }
}

function defaultIntegrations(): Record<IntegrationId, IntegrationEntry> {
  const out = {} as Record<IntegrationId, IntegrationEntry>
  for (const id of ALL_IDS) out[id] = makeDefault(id)
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
        return {
          ...current,
          integrations: { ...base, ...(p.integrations ?? {}) },
        }
      },
    },
  ),
)
