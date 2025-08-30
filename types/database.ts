export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company_name: string | null
          phone: string | null
          role: 'user' | 'admin' | 'moderator'
          subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due'
          subscription_plan: 'starter' | 'professional' | 'enterprise' | null
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          phone?: string | null
          role?: 'user' | 'admin' | 'moderator'
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'past_due'
          subscription_plan?: 'starter' | 'professional' | 'enterprise' | null
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_name?: string | null
          phone?: string | null
          role?: 'user' | 'admin' | 'moderator'
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'past_due'
          subscription_plan?: 'starter' | 'professional' | 'enterprise' | null
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      proposals: {
        Row: {
          id: string
          user_id: string
          title: string
          client_name: string
          client_email: string | null
          client_phone: string | null
          service_type: 'residential' | 'commercial' | 'industrial'
          property_size: number | null
          frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly'
          estimated_hours: number | null
          hourly_rate: number | null
          total_amount: number
          description: string | null
          ai_generated_content: Json | null
          status: 'draft' | 'sent' | 'accepted' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          client_name: string
          client_email?: string | null
          client_phone?: string | null
          service_type: 'residential' | 'commercial' | 'industrial'
          property_size?: number | null
          frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly'
          estimated_hours?: number | null
          hourly_rate?: number | null
          total_amount: number
          description?: string | null
          ai_generated_content?: Json | null
          status?: 'draft' | 'sent' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          client_name?: string
          client_email?: string | null
          client_phone?: string | null
          service_type?: 'residential' | 'commercial' | 'industrial'
          property_size?: number | null
          frequency?: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly'
          estimated_hours?: number | null
          hourly_rate?: number | null
          total_amount?: number
          description?: string | null
          ai_generated_content?: Json | null
          status?: 'draft' | 'sent' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          status: 'active' | 'cancelled' | 'past_due' | 'unpaid'
          plan: 'starter' | 'professional' | 'enterprise'
          current_period_start: string
          current_period_end: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status: 'active' | 'cancelled' | 'past_due' | 'unpaid'
          plan: 'starter' | 'professional' | 'enterprise'
          current_period_start: string
          current_period_end: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: 'active' | 'cancelled' | 'past_due' | 'unpaid'
          plan?: 'starter' | 'professional' | 'enterprise'
          current_period_start?: string
          current_period_end?: string
          created_at?: string
          updated_at?: string
        }
      }
      billing_history: {
        Row: {
          id: string
          user_id: string
          stripe_invoice_id: string | null
          amount: number
          currency: string
          status: 'paid' | 'pending' | 'failed'
          invoice_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_invoice_id?: string | null
          amount: number
          currency: string
          status: 'paid' | 'pending' | 'failed'
          invoice_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_invoice_id?: string | null
          amount?: number
          currency?: string
          status?: 'paid' | 'pending' | 'failed'
          invoice_url?: string | null
          created_at?: string
        }
      }
      pdf_exports: {
        Row: {
          id: string
          proposal_id: string
          user_id: string
          file_size: number
          template_used: string
          exported_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          user_id: string
          file_size: number
          template_used: string
          exported_at: string
        }
        Update: {
          id?: string
          proposal_id?: string
          user_id?: string
          file_size?: number
          template_used?: string
          exported_at?: string
        }
        attachments: Json | null
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Export commonly used types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Proposal = Database['public']['Tables']['proposals']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type BillingHistory = Database['public']['Tables']['billing_history']['Row']
export type PDFExport = Database['public']['Tables']['pdf_exports']['Row']