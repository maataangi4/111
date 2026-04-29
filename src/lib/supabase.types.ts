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
    }
    Functions: {
      get_my_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
  }
}
