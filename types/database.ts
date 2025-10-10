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
          // Enhanced proposal fields
          facility_details: Json;
          traffic_analysis: Json;
          service_scope: Json;
          special_requirements: Json;
          regional_location: string | null;
          property_type: string | null;
          pricing_breakdown: Json;
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
          // Enhanced proposal fields
          facility_details?: Json;
          traffic_analysis?: Json;
          service_scope?: Json;
          special_requirements?: Json;
          regional_location?: string | null;
          property_type?: string | null;
          pricing_breakdown?: Json;
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
          // Enhanced proposal fields
          facility_details?: Json;
          traffic_analysis?: Json;
          service_scope?: Json;
          special_requirements?: Json;
          regional_location?: string | null;
          property_type?: string | null;
          pricing_breakdown?: Json;
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
      company_profiles: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          contact_info: Json;
          logo_url: string | null;
          company_background: string | null;
          service_references: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          contact_info?: Json;
          logo_url?: string | null;
          company_background?: string | null;
          service_references?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          contact_info?: Json;
          logo_url?: string | null;
          company_background?: string | null;
          service_references?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      regional_multipliers: {
        Row: {
          id: string;
          region_name: string;
          multiplier_percentage: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          region_name: string;
          multiplier_percentage?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          region_name?: string;
          multiplier_percentage?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      property_baselines: {
        Row: {
          id: string;
          property_type: string;
          baseline_rate: number;
          complexity_factors: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_type: string;
          baseline_rate?: number;
          complexity_factors?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_type?: string;
          baseline_rate?: number;
          complexity_factors?: Json;
          created_at?: string;
          updated_at?: string;
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
          traffic_multipliers: Json;
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
          traffic_multipliers?: Json;
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
          traffic_multipliers?: Json;
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
export type CompanyProfile = Database['public']['Tables']['company_profiles']['Row'];
export type RegionalMultiplier = Database['public']['Tables']['regional_multipliers']['Row'];
export type PropertyBaseline = Database['public']['Tables']['property_baselines']['Row'];
export type User = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
};

// Enhanced proposal data types
export interface FacilityDetails {
  building_age?: number;
  building_type?: string;
  accessibility_requirements?: string[];
  special_areas?: string[];
  equipment_present?: string[];
  environmental_concerns?: string[];
}

export interface TrafficAnalysis {
  staff_count?: number;
  visitor_frequency?: 'low' | 'medium' | 'high';
  peak_hours?: string[];
  special_events?: boolean;
  traffic_level?: 'light' | 'medium' | 'heavy';
}

export interface ServiceScope {
  areas_included?: string[];
  areas_excluded?: string[];
  special_services?: string[];
  frequency_details?: Record<string, any>;
}

export interface SpecialRequirements {
  security_clearance?: boolean;
  after_hours_access?: boolean;
  special_equipment?: string[];
  certifications_required?: string[];
  insurance_requirements?: string[];
}

export interface PricingBreakdown {
  base_rate?: number;
  regional_multiplier?: number;
  traffic_multiplier?: number;
  property_complexity?: number;
  total_rate?: number;
  breakdown_details?: Record<string, any>;
}

export interface ContactInfo {
  primary_contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  billing_contact?: string;
  emergency_contact?: string;
}

export interface ServiceReferences {
  client_name?: string;
  service_type?: string;
  duration?: string;
  contact_info?: string;
  testimonial?: string;
}
