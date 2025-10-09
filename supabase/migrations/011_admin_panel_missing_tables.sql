-- Add missing columns to prompt_templates table
DO $$
BEGIN
    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'category') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN category TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('proposal', 'email', 'follow_up', 'custom'));
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'description') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN description TEXT;
    END IF;
    
    -- Add name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'name') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN name TEXT NOT NULL DEFAULT 'Untitled';
    END IF;
    
    -- Add template_content column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'template_content') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN template_content TEXT NOT NULL DEFAULT '';
    END IF;
    
    -- Add variables column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'variables') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN variables JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add is_default column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'is_default') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;
    
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'created_by') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'created_at') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
    
    -- Add updated_at column if it doesn't exist (might already exist from migration 010)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
    
    -- Make service_type nullable if it exists (from migration 010)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'prompt_templates' 
               AND column_name = 'service_type' 
               AND is_nullable = 'NO') THEN
        ALTER TABLE public.prompt_templates ALTER COLUMN service_type DROP NOT NULL;
    END IF;
    
    -- Remove UNIQUE constraint on service_type if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'prompt_templates' 
               AND constraint_type = 'UNIQUE' 
               AND constraint_name LIKE '%service_type%') THEN
        ALTER TABLE public.prompt_templates DROP CONSTRAINT prompt_templates_service_type_key;
    END IF;
END $$;

-- Add missing columns to admin_audit_log table
DO $$
BEGIN
    -- Add target_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_audit_log' 
                   AND column_name = 'target_type') THEN
        ALTER TABLE public.admin_audit_log ADD COLUMN target_type TEXT;
    END IF;
    
    -- Add target_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_audit_log' 
                   AND column_name = 'target_id') THEN
        ALTER TABLE public.admin_audit_log ADD COLUMN target_id UUID;
    END IF;
    
    -- Add ip_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_audit_log' 
                   AND column_name = 'ip_address') THEN
        ALTER TABLE public.admin_audit_log ADD COLUMN ip_address INET;
    END IF;
    
    -- Add user_agent column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_audit_log' 
                   AND column_name = 'user_agent') THEN
        ALTER TABLE public.admin_audit_log ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- Create indexes (using existing column names from migration 010)
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON public.prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON public.prompt_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_created_by ON public.prompt_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at);

-- Enable RLS (might already be enabled)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'prompt_templates' AND rowsecurity = true) THEN
        ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'admin_audit_log' AND rowsecurity = true) THEN
        ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- RLS Policies for prompt_templates (drop existing if needed and recreate)
DROP POLICY IF EXISTS "Admin can manage prompt templates" ON public.prompt_templates;
CREATE POLICY "Admin can manage prompt templates" ON public.prompt_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add read policy for authenticated users
DROP POLICY IF EXISTS "Allow read access to prompt templates" ON public.prompt_templates;
CREATE POLICY "Allow read access to prompt templates" ON public.prompt_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view active prompt templates" ON public.prompt_templates
  FOR SELECT USING (is_active = true);

-- RLS Policies for admin_audit_log
CREATE POLICY "Admin can view audit logs" ON public.admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert audit logs" ON public.admin_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default prompt templates only if they don't exist
DO $$
BEGIN
    -- Insert Standard Proposal template
    IF NOT EXISTS (SELECT 1 FROM public.prompt_templates WHERE name = 'Standard Proposal') THEN
        INSERT INTO public.prompt_templates (name, description, category, template_content, template_text, variables, is_default, service_type) VALUES
        ('Standard Proposal', 'Default proposal template for cleaning services', 'proposal', 'Dear {{client_name}},\n\nThank you for considering our cleaning services. We are pleased to present this proposal for {{service_type}} cleaning services at {{service_location}}.\n\nService Details:\n- Facility Size: {{facility_size}} sq ft\n- Service Frequency: {{service_frequency}}\n- Estimated Duration: {{estimated_hours}} hours\n\nWe look forward to serving you.\n\nBest regards,\n{{company_name}}', 'Dear {{client_name}},\n\nThank you for considering our cleaning services. We are pleased to present this proposal for {{service_type}} cleaning services at {{service_location}}.\n\nService Details:\n- Facility Size: {{facility_size}} sq ft\n- Service Frequency: {{service_frequency}}\n- Estimated Duration: {{estimated_hours}} hours\n\nWe look forward to serving you.\n\nBest regards,\n{{company_name}}', '["client_name", "service_type", "service_location", "facility_size", "service_frequency", "estimated_hours", "company_name"]'::jsonb, true, 'standard_proposal');
    END IF;
    
    -- Insert Follow-up Email template
    IF NOT EXISTS (SELECT 1 FROM public.prompt_templates WHERE name = 'Follow-up Email') THEN
        INSERT INTO public.prompt_templates (name, description, category, template_content, template_text, variables, is_default, service_type) VALUES
        ('Follow-up Email', 'Template for following up on sent proposals', 'follow_up', 'Hi {{client_name}},\n\nI wanted to follow up on the cleaning service proposal we sent for {{service_location}}. Do you have any questions about our services or pricing?\n\nWe would love the opportunity to discuss how we can help maintain your facility.\n\nBest regards,\n{{sender_name}}', 'Hi {{client_name}},\n\nI wanted to follow up on the cleaning service proposal we sent for {{service_location}}. Do you have any questions about our services or pricing?\n\nWe would love the opportunity to discuss how we can help maintain your facility.\n\nBest regards,\n{{sender_name}}', '["client_name", "service_location", "sender_name"]'::jsonb, true, 'follow_up_email');
    END IF;
    
    -- Insert Thank You Email template
    IF NOT EXISTS (SELECT 1 FROM public.prompt_templates WHERE name = 'Thank You Email') THEN
        INSERT INTO public.prompt_templates (name, description, category, template_content, template_text, variables, is_default, service_type) VALUES
        ('Thank You Email', 'Template for thanking clients after proposal acceptance', 'email', 'Dear {{client_name}},\n\nThank you for choosing our cleaning services! We are excited to begin working with you.\n\nOur team will contact you within 24 hours to schedule the initial service and discuss any specific requirements.\n\nWelcome to the family!\n\nBest regards,\n{{company_name}}', 'Dear {{client_name}},\n\nThank you for choosing our cleaning services! We are excited to begin working with you.\n\nOur team will contact you within 24 hours to schedule the initial service and discuss any specific requirements.\n\nWelcome to the family!\n\nBest regards,\n{{company_name}}', '["client_name", "company_name"]'::jsonb, true, 'thank_you_email');
    END IF;
END $$;

-- Grant permissions
GRANT ALL PRIVILEGES ON public.prompt_templates TO authenticated;
GRANT ALL PRIVILEGES ON public.admin_audit_log TO authenticated;
GRANT SELECT ON public.prompt_templates TO anon;
GRANT SELECT ON public.admin_audit_log TO anon;

-- Add trigger for updated_at on prompt_templates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON public.prompt_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();