import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database, UserRole } from '../lib/supabase.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Tenant = Database['public']['Tables']['tenants']['Row']

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  tenant: Tenant | null
  loading: boolean
  error: string | null

  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  inviteEmployee: (email: string, fullName: string, role: UserRole) => Promise<void>
  updateTelegramChatId: (profileId: string, chatId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  tenant: null,
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
        set({ profile: null, tenant: null })
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

  inviteEmployee: async (email, fullName, role) => {
    const { tenant } = get()
    if (!tenant) return
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role, tenant_id: tenant.id },
    })
    if (error) set({ error: error.message })
  },

  updateTelegramChatId: async (profileId, chatId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ telegram_chat_id: chatId } as never)
      .eq('id', profileId)
    if (error) set({ error: error.message })
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

  set({ user, profile, tenant: tenant ?? null })
}
