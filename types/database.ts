export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          company_name: string | null;
          phone: string | null;
          website: string | null;
          logo_url: string | null;
          company_background: string | null;
          role: 'user' | 'admin' | 'moderator';
          subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due';
          subscription_plan: 'starter' | 'professional' | 'enterprise' | null;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          company_name?: string | null;
          phone?: string | null;
          website?: string | null;
          logo_url?: string | null;
          company_background?: string | null;
          role?: 'user' | 'admin' | 'moderator';
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'past_due';
          subscription_plan?: 'starter' | 'professional' | 'enterprise' | null;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          company_name?: string | null;
          phone?: string | null;
          website?: string | null;
          logo_url?: string | null;
          company_background?: string | null;
          role?: 'user' | 'admin' | 'moderator';
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'past_due';
          subscription_plan?: 'starter' | 'professional' | 'enterprise' | null;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      proposals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          client_name: string;
          client_email: string;
          client_company: string | null;
          contact_phone: string;
          service_location: string;
          facility_size: number;
          service_type:
            | 'residential'
            | 'commercial'
            | 'carpet'
            | 'window'
            | 'floor';
          service_frequency:
            | 'one-time'
            | '1x-month'
            | 'bi-weekly'
            | 'weekly'
            | '2x-week'
            | '3x-week'
            | '5x-week'
            | 'daily';
          service_specific_data: Json;
          global_inputs: Json;
          pricing_enabled: boolean;
          pricing_data: Json;
          generated_content: string | null;
          status: 'draft' | 'sent' | 'accepted' | 'rejected';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          client_name: string;
          client_email: string;
          client_company?: string | null;
          contact_phone: string;
          service_location: string;
          facility_size: number;
          service_type:
            | 'residential'
            | 'commercial'
            | 'carpet'
            | 'window'
            | 'floor';
          service_frequency:
            | 'one-time'
            | '1x-month'
            | 'bi-weekly'
            | 'weekly'
            | '2x-week'
            | '3x-week'
            | '5x-week'
            | 'daily';
          service_specific_data?: Json;
          global_inputs?: Json;
          pricing_enabled?: boolean;
          pricing_data?: Json;
          generated_content?: string | null;
          status?: 'draft' | 'sent' | 'accepted' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          client_name?: string;
          client_email?: string;
          client_company?: string | null;
          contact_phone?: string;
          service_location?: string;
          facility_size?: number;
          service_type?:
            | 'residential'
            | 'commercial'
            | 'carpet'
            | 'window'
            | 'floor';
          service_frequency?:
            | 'one-time'
            | '1x-month'
            | 'bi-weekly'
            | 'weekly'
            | '2x-week'
            | '3x-week'
            | '5x-week'
            | 'daily';
          service_specific_data?: Json;
          global_inputs?: Json;
          pricing_enabled?: boolean;
          pricing_data?: Json;
          generated_content?: string | null;
          status?: 'draft' | 'sent' | 'accepted' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
          plan: 'starter' | 'professional' | 'enterprise';
          current_period_start: string;
          current_period_end: string;
          canceled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
          plan: 'starter' | 'professional' | 'enterprise';
          current_period_start: string;
          current_period_end: string;
          canceled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          status?: 'active' | 'cancelled' | 'past_due' | 'unpaid';
          plan?: 'starter' | 'professional' | 'enterprise';
          current_period_start?: string;
          current_period_end?: string;
          canceled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      billing_history: {
        Row: {
          id: string;
          user_id: string;
          stripe_invoice_id: string | null;
          amount: number;
          currency: string;
          status: 'paid' | 'pending' | 'failed';
          action: 'upgrade' | 'downgrade' | 'payment' | 'refund' | null;
          invoice_url: string | null;
          invoice_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_invoice_id?: string | null;
          amount: number;
          currency: string;
          status: 'paid' | 'pending' | 'failed';
          action: 'upgrade' | 'downgrade' | 'payment' | 'refund' | null;
          invoice_url?: string | null;
          invoice_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_invoice_id?: string | null;
          amount?: number;
          currency?: string;
          status?: 'paid' | 'pending' | 'failed';
          action: 'upgrade' | 'downgrade' | 'payment' | 'refund' | null;
          invoice_url?: string | null;
          invoice_date: string;
          created_at?: string;
        };
      };
      pdf_exports: {
        Row: {
          id: string;
          proposal_id: string;
          user_id: string;
          file_path: string;
          file_size: number;
          template_version: string;
          exported_at: string;
        };
        Insert: {
          id?: string;
          proposal_id: string;
          user_id: string;
          file_path: string;
          file_size: number;
          template_version: string;
          exported_at?: string;
        };
        Update: {
          id?: string;
          proposal_id?: string;
          user_id?: string;
          file_path?: string;
          file_size?: number;
          template_version?: string;
          exported_at?: string;
        };
      };
      pricing_settings: {
        Row: {
          id: string;
          user_id: string;
          labor_rate: number;
          overhead_percentage: number;
          margin_percentage: number;
          production_rates: Json;
          frequency_multipliers: Json;
          service_type_rates: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          labor_rate?: number;
          overhead_percentage?: number;
          margin_percentage?: number;
          production_rates?: Json;
          frequency_multipliers?: Json;
          service_type_rates?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          labor_rate?: number;
          overhead_percentage?: number;
          margin_percentage?: number;
          production_rates?: Json;
          frequency_multipliers?: Json;
          service_type_rates?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          price_monthly: number;
          price_annual: number;
          proposal_limit: number;
          features: string[];
          stripe_price_id_monthly: string | null;
          stripe_price_id_annual: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price_monthly: number;
          price_annual: number;
          proposal_limit: number;
          features: string[];
          stripe_price_id_monthly?: string | null;
          stripe_price_id_annual?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price_monthly?: number;
          price_annual?: number;
          proposal_limit?: number;
          features?: string[];
          stripe_price_id_monthly?: string | null;
          stripe_price_id_annual?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Export commonly used types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Proposal = Database['public']['Tables']['proposals']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type BillingHistory =
  Database['public']['Tables']['billing_history']['Row'];
export type PDFExport = Database['public']['Tables']['pdf_exports']['Row'];
export type PricingSettings =
  Database['public']['Tables']['pricing_settings']['Row'];
export type SubscriptionPlan =
  Database['public']['Tables']['subscription_plans']['Row'];
export type User = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
};
