export type UserRole = 'owner' | 'manager' | 'operator' | 'legal' | 'medical'

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          plan: 'trial' | 'basic' | 'pro'
          max_users: number
          max_socios: number
          telegram_bot_token: string | null
          telegram_group_chat_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string
          role: UserRole
          full_name: string
          dni: string | null
          photo_url: string | null
          telegram_chat_id: string | null
          telegram_link_token: string | null
          username: string
          access_code: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      consent_requests: {
        Row: {
          id: string
          tenant_id: string
          socio_local_id: string
          socio_nombre: string
          socio_dni: string
          doc_version: string
          doc_hash: string
          token: string
          status: 'pendiente' | 'aceptado' | 'revocado'
          accepted_at: string | null
          accepted_ip: string | null
          accepted_user_agent: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['consent_requests']['Row'], 'id' | 'created_at' | 'accepted_at' | 'accepted_ip' | 'accepted_user_agent' | 'status'> & {
          status?: 'pendiente' | 'aceptado' | 'revocado'
        }
        Update: Partial<Database['public']['Tables']['consent_requests']['Insert']>
      }
      consent_log: {
        Row: {
          id: string
          request_id: string
          event: 'viewed' | 'accepted' | 'revoked'
          ip: string | null
          user_agent: string | null
          doc_version: string
          doc_hash: string
          occurred_at: string
        }
        Insert: Omit<Database['public']['Tables']['consent_log']['Row'], 'id' | 'occurred_at'>
        Update: Partial<Database['public']['Tables']['consent_log']['Insert']>
      }
    }
    Functions: {
      get_my_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
      get_consent_request: {
        Args: { p_token: string }
        Returns: {
          ok: boolean
          error?: string
          nombre?: string
          dni?: string
          doc_version?: string
          doc_hash?: string
          status?: 'pendiente' | 'aceptado' | 'revocado'
          accepted_at?: string | null
        }
      }
      accept_consent: {
        Args: { p_token: string }
        Returns: { ok: boolean; error?: string; already?: boolean }
      }
    }
  }
}
