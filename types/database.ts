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
          subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due' | 'expired';
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
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'past_due' | 'expired';
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
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'past_due' | 'expired';
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
          // AI and tracking fields
          ai_tone: 'professional' | 'friendly' | 'formal' | 'casual' | 'technical' | null;
          view_count: number;
          last_viewed_at: string | null;
          tracking_enabled: boolean;
          send_options: Json | null;
          template_id: string | null;
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
          // AI and tracking fields
          ai_tone?: 'professional' | 'friendly' | 'formal' | 'casual' | 'technical' | null;
          view_count?: number;
          last_viewed_at?: string | null;
          tracking_enabled?: boolean;
          send_options?: Json | null;
          template_id?: string | null;
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
          // AI and tracking fields
          ai_tone?: 'professional' | 'friendly' | 'formal' | 'casual' | 'technical' | null;
          view_count?: number;
          last_viewed_at?: string | null;
          tracking_enabled?: boolean;
          send_options?: Json | null;
          template_id?: string | null;
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
          status: 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'expired';
          plan: 'starter' | 'professional' | 'enterprise';
          current_period_start: string;
          current_period_end: string;
          canceled_at: string | null;
          auto_renewal: boolean;
          cancellation_reason: string | null;
          grace_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          status: 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'expired';
          plan: 'starter' | 'professional' | 'enterprise';
          current_period_start: string;
          current_period_end: string;
          canceled_at?: string | null;
          auto_renewal?: boolean;
          cancellation_reason?: string | null;
          grace_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          status?: 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'expired';
          plan?: 'starter' | 'professional' | 'enterprise';
          current_period_start?: string;
          current_period_end?: string;
          canceled_at?: string | null;
          auto_renewal?: boolean;
          cancellation_reason?: string | null;
          grace_period_end?: string | null;
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
      system_settings: {
        Row: {
          id: string;
          company_name: string;
          company_logo_url: string | null;
          company_tagline: string | null;
          primary_color: string;
          secondary_color: string;
          accent_color: string;
          email_from_name: string;
          email_from_address: string;
          email_reply_to: string | null;
          smtp_host: string | null;
          smtp_port: number | null;
          smtp_username: string | null;
          smtp_password: string | null;
          smtp_secure: boolean;
          max_login_attempts: number;
          session_timeout: number;
          password_min_length: number;
          require_2fa: boolean;
          ai_enabled: boolean;
          pdf_generation_enabled: boolean;
          email_notifications_enabled: boolean;
          analytics_enabled: boolean;
          business_hours_start: string;
          business_hours_end: string;
          business_timezone: string;
          maintenance_mode: boolean;
          maintenance_message: string | null;
          theme_applied_to_pdfs: boolean;
          ai_attribution_enabled: boolean;
          proposal_tracking_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name?: string;
          company_logo_url?: string | null;
          company_tagline?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          email_from_name?: string;
          email_from_address?: string;
          email_reply_to?: string | null;
          smtp_host?: string | null;
          smtp_port?: number | null;
          smtp_username?: string | null;
          smtp_password?: string | null;
          smtp_secure?: boolean;
          max_login_attempts?: number;
          session_timeout?: number;
          password_min_length?: number;
          require_2fa?: boolean;
          ai_enabled?: boolean;
          pdf_generation_enabled?: boolean;
          email_notifications_enabled?: boolean;
          analytics_enabled?: boolean;
          business_hours_start?: string;
          business_hours_end?: string;
          business_timezone?: string;
          maintenance_mode?: boolean;
          maintenance_message?: string | null;
          theme_applied_to_pdfs?: boolean;
          ai_attribution_enabled?: boolean;
          proposal_tracking_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          company_logo_url?: string | null;
          company_tagline?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          email_from_name?: string;
          email_from_address?: string;
          email_reply_to?: string | null;
          smtp_host?: string | null;
          smtp_port?: number | null;
          smtp_username?: string | null;
          smtp_password?: string | null;
          smtp_secure?: boolean;
          max_login_attempts?: number;
          session_timeout?: number;
          password_min_length?: number;
          require_2fa?: boolean;
          ai_enabled?: boolean;
          pdf_generation_enabled?: boolean;
          email_notifications_enabled?: boolean;
          analytics_enabled?: boolean;
          business_hours_start?: string;
          business_hours_end?: string;
          business_timezone?: string;
          maintenance_mode?: boolean;
          maintenance_message?: string | null;
          theme_applied_to_pdfs?: boolean;
          ai_attribution_enabled?: boolean;
          proposal_tracking_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      proposal_views: {
        Row: {
          id: string;
          proposal_id: string;
          viewer_ip: string | null;
          tracking_token: string | null;
          user_agent: string | null;
          viewed_at: string;
          view_duration: number | null;
        };
        Insert: {
          id?: string;
          proposal_id: string;
          viewer_ip?: string | null;
          tracking_token?: string | null;
          user_agent?: string | null;
          viewed_at?: string;
          view_duration?: number | null;
        };
        Update: {
          id?: string;
          proposal_id?: string;
          viewer_ip?: string | null;
          tracking_token?: string | null;
          user_agent?: string | null;
          viewed_at?: string;
          view_duration?: number | null;
        };
      };
      proposal_status_history: {
        Row: {
          id: string;
          proposal_id: string;
          old_status: string | null;
          new_status: string;
          changed_by: string | null;
          change_reason: string | null;
          email_sent: boolean;
          changed_at: string;
        };
        Insert: {
          id?: string;
          proposal_id: string;
          old_status?: string | null;
          new_status: string;
          changed_by?: string | null;
          change_reason?: string | null;
          email_sent?: boolean;
          changed_at?: string;
        };
        Update: {
          id?: string;
          proposal_id?: string;
          old_status?: string | null;
          new_status?: string;
          changed_by?: string | null;
          change_reason?: string | null;
          email_sent?: boolean;
          changed_at?: string;
        };
      };
      error_logs: {
        Row: {
          id: string;
          error_type: string;
          error_message: string;
          stack_trace: string | null;
          user_id: string | null;
          request_url: string | null;
          user_agent: string | null;
          severity: 'low' | 'medium' | 'high' | 'critical';
          resolved: boolean;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          error_type: string;
          error_message: string;
          stack_trace?: string | null;
          user_id?: string | null;
          request_url?: string | null;
          user_agent?: string | null;
          severity?: 'low' | 'medium' | 'high' | 'critical';
          resolved?: boolean;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          error_type?: string;
          error_message?: string;
          stack_trace?: string | null;
          user_id?: string | null;
          request_url?: string | null;
          user_agent?: string | null;
          severity?: 'low' | 'medium' | 'high' | 'critical';
          resolved?: boolean;
          created_at?: string;
          resolved_at?: string | null;
        };
      };
      proposal_tracking: {
        Row: {
          id: string;
          proposal_id: string;
          tracking_id: string;
          delivery_method: 'pdf' | 'online' | 'both';
          recipient_email: string;
          cc_emails: string[];
          subject: string;
          message: string;
          include_branding: boolean;
          track_opens: boolean;
          track_downloads: boolean;
          email_sent_at: string;
          email_opened: boolean;
          email_opened_at: string | null;
          proposal_viewed: boolean;
          proposal_viewed_at: string | null;
          proposal_downloaded: boolean;
          proposal_downloaded_at: string | null;
          view_count: number;
          download_count: number;
          user_agent: string | null;
          ip_address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          proposal_id: string;
          tracking_id: string;
          delivery_method: 'pdf' | 'online' | 'both';
          recipient_email: string;
          cc_emails?: string[];
          subject: string;
          message: string;
          include_branding?: boolean;
          track_opens?: boolean;
          track_downloads?: boolean;
          email_sent_at?: string;
          email_opened?: boolean;
          email_opened_at?: string | null;
          proposal_viewed?: boolean;
          proposal_viewed_at?: string | null;
          proposal_downloaded?: boolean;
          proposal_downloaded_at?: string | null;
          view_count?: number;
          download_count?: number;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          proposal_id?: string;
          tracking_id?: string;
          delivery_method?: 'pdf' | 'online' | 'both';
          recipient_email?: string;
          cc_emails?: string[];
          subject?: string;
          message?: string;
          include_branding?: boolean;
          track_opens?: boolean;
          track_downloads?: boolean;
          email_sent_at?: string;
          email_opened?: boolean;
          email_opened_at?: string | null;
          proposal_viewed?: boolean;
          proposal_viewed_at?: string | null;
          proposal_downloaded?: boolean;
          proposal_downloaded_at?: string | null;
          view_count?: number;
          download_count?: number;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cancellation_requests: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string;
          reason: string | null;
          requested_at: string;
          processed_at: string | null;
          status: 'pending' | 'completed' | 'failed';
          stripe_cancellation_id: string | null;
          refund_amount: number | null;
          refund_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id: string;
          reason?: string | null;
          requested_at?: string;
          processed_at?: string | null;
          status?: 'pending' | 'completed' | 'failed';
          stripe_cancellation_id?: string | null;
          refund_amount?: number | null;
          refund_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_id?: string;
          reason?: string | null;
          requested_at?: string;
          processed_at?: string | null;
          status?: 'pending' | 'completed' | 'failed';
          stripe_cancellation_id?: string | null;
          refund_amount?: number | null;
          refund_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      proposal_templates: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          preview_image_url: string | null;
          preview_pdf_url: string | null;
          template_data: Json;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          preview_image_url?: string | null;
          preview_pdf_url?: string | null;
          template_data?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          preview_image_url?: string | null;
          preview_pdf_url?: string | null;
          template_data?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      template_tier_access: {
        Row: {
          id: string;
          template_id: string;
          subscription_tier: 'starter' | 'professional' | 'enterprise';
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          subscription_tier: 'starter' | 'professional' | 'enterprise';
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          subscription_tier?: 'starter' | 'professional' | 'enterprise';
          created_at?: string;
        };
      };
      user_template_preferences: {
        Row: {
          id: string;
          user_id: string;
          preferred_template_id: string | null;
          template_settings: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preferred_template_id?: string | null;
          template_settings?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          preferred_template_id?: string | null;
          template_settings?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_branding_settings: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          company_logo_url: string | null;
          company_tagline: string | null;
          primary_color: string;
          secondary_color: string;
          accent_color: string;
          theme_applied_to_pdfs: boolean;
          template_version: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          company_logo_url?: string | null;
          company_tagline?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          theme_applied_to_pdfs?: boolean;
          template_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          company_logo_url?: string | null;
          company_tagline?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          theme_applied_to_pdfs?: boolean;
          template_version?: string | null;
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
export type SystemSettings = Database['public']['Tables']['system_settings']['Row'];
export type ProposalView = Database['public']['Tables']['proposal_views']['Row'];
export type ProposalStatusHistory = Database['public']['Tables']['proposal_status_history']['Row'];
export type ErrorLog = Database['public']['Tables']['error_logs']['Row'];
export type ProposalTracking = Database['public']['Tables']['proposal_tracking']['Row'];
export type CancellationRequest = Database['public']['Tables']['cancellation_requests']['Row'];
export type ProposalTemplate = Database['public']['Tables']['proposal_templates']['Row'];
export type TemplateTierAccess = Database['public']['Tables']['template_tier_access']['Row'];
export type UserTemplatePreferences = Database['public']['Tables']['user_template_preferences']['Row'];
export type UserBrandingSettings = Database['public']['Tables']['user_branding_settings']['Row'];
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
  special_notes?: string;
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

// AI and Proposal Enhancement Types
export type AITone = 'professional' | 'friendly' | 'formal' | 'casual' | 'technical';

export interface SendOptions {
  send_pdf?: boolean;
  send_online_link?: boolean;
  email_message?: string;
  tracking_enabled?: boolean;
  custom_subject?: string;
  schedule_send?: string | null;
}

export interface BrandingTheme {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  company_name: string;
  logo_url?: string | null;
  tagline?: string | null;
}

export interface ProposalTrackingStats {
  total_views: number;
  unique_viewers: number;
  last_viewed_at?: string | null;
  average_view_duration?: number;
  view_history: ProposalView[];
}

export interface ErrorLogEntry {
  error_type: string;
  error_message: string;
  stack_trace?: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string | null;
  request_url?: string | null;
  user_agent?: string | null;
}
