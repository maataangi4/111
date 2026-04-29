import { create } from 'zustand'
import { createClient } from '@supabase/supabase-js'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database, UserRole } from '../lib/supabase.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Tenant = Database['public']['Tables']['tenants']['Row']

export interface InvitationInfo {
  email: string
  full_name: string
  role: string
  tenant_id: string
}

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  tenant: Tenant | null
  tenantProfiles: Profile[]
  loading: boolean
  error: string | null

  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  createInvitation: (email: string, fullName: string, role: UserRole) => Promise<string | null>
  getInvitationByToken: (token: string) => Promise<InvitationInfo | null>
  acceptInvitation: (token: string, password: string, invitation: InvitationInfo) => Promise<string | null>
  updateTelegramChatId: (profileId: string, chatId: string) => Promise<void>
  generateTelegramLinkToken: (profileId: string) => Promise<string | null>
  saveTenantTelegramConfig: (botToken: string, chatId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  tenant: null,
  tenantProfiles: [],
  loading: true,
  error: null,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await loadProfile(session.user, set)
    }
    set({ session, loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null })
      if (session?.user) {
        await loadProfile(session.user, set)
      } else {
        set({ profile: null, tenant: null, tenantProfiles: [] })
      }
    })
  },

  signIn: async (email, password) => {
    set({ error: null, loading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) set({ error: error.message })
    set({ loading: false })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null, tenant: null })
  },

  createInvitation: async (email, fullName, role) => {
    const { tenant } = get()
    if (!tenant) return null
    const { data, error } = await supabase
      .from('invitations' as never)
      .insert({ tenant_id: tenant.id, email, full_name: fullName, role } as never)
      .select('token')
      .single() as { data: { token: string } | null; error: unknown }
    if (error || !data) return null
    return data.token
  },

  getInvitationByToken: async (token) => {
    const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, string>) => Promise<{ data: InvitationInfo[] | null; error: unknown }>)
      ('get_invitation_by_token', { p_token: token })
    if (error || !data?.length) return null
    return data[0]
  },

  acceptInvitation: async (token, password, invitation) => {
    // Usar un cliente sin sesión para no afectar la sesión actual
    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const { error } = await tempClient.auth.signUp({
      email: invitation.email,
      password,
      options: {
        data: {
          full_name: invitation.full_name,
          role: invitation.role,
          tenant_id: invitation.tenant_id,
        },
      },
    })
    if (error) return error.message

    // Marcar la invitación como usada
    await (supabase.rpc as unknown as (fn: string, args: Record<string, string>) => Promise<unknown>)('use_invitation', { p_token: token })
    return null
  },

  updateTelegramChatId: async (profileId, chatId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ telegram_chat_id: chatId } as never)
      .eq('id', profileId)
    if (error) { set({ error: error.message }); return }
    set((s) => ({ profile: s.profile ? { ...s.profile, telegram_chat_id: chatId } : null }))
  },

  saveTenantTelegramConfig: async (botToken, chatId) => {
    const { tenant } = get()
    if (!tenant) return
    const { error } = await supabase
      .from('tenants')
      .update({ telegram_bot_token: botToken, telegram_group_chat_id: chatId } as never)
      .eq('id', tenant.id)
    if (error) { set({ error: error.message }); return }
    set((s) => ({
      tenant: s.tenant
        ? { ...s.tenant, telegram_bot_token: botToken, telegram_group_chat_id: chatId }
        : null,
    }))
  },

  generateTelegramLinkToken: async (profileId) => {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    const { error } = await supabase
      .from('profiles')
      .update({ telegram_link_token: token } as never)
      .eq('id', profileId)
    if (error) return null
    set((s) => ({ profile: s.profile ? { ...s.profile, telegram_link_token: token } : null }))
    return token
  },
}))

async function loadProfile(user: User, set: (s: Partial<AuthState>) => void) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Database['public']['Tables']['profiles']['Row'] | null }

  if (!profile) return

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .single() as { data: Database['public']['Tables']['tenants']['Row'] | null }

  // Cargar todos los perfiles del tenant para notificaciones personales
  const { data: tenantProfiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('tenant_id', profile.tenant_id) as { data: Database['public']['Tables']['profiles']['Row'][] | null }

  set({ user, profile, tenant: tenant ?? null, tenantProfiles: tenantProfiles ?? [] })
}
