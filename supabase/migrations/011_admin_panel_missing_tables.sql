-- Create prompt_templates table
CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('proposal', 'email', 'follow_up', 'custom')),
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON public.prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON public.prompt_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_created_by ON public.prompt_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at);

-- Enable RLS
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prompt_templates
CREATE POLICY "Admin can manage prompt templates" ON public.prompt_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

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

-- Insert default prompt templates
INSERT INTO public.prompt_templates (name, description, category, template_content, variables, is_default) VALUES
('Standard Proposal', 'Default proposal template for cleaning services', 'proposal', 'Dear {{client_name}},\n\nThank you for considering our cleaning services. We are pleased to present this proposal for {{service_type}} cleaning services at {{service_location}}.\n\nService Details:\n- Facility Size: {{facility_size}} sq ft\n- Service Frequency: {{service_frequency}}\n- Estimated Duration: {{estimated_hours}} hours\n\nWe look forward to serving you.\n\nBest regards,\n{{company_name}}', '["client_name", "service_type", "service_location", "facility_size", "service_frequency", "estimated_hours", "company_name"]'::jsonb, true),
('Follow-up Email', 'Template for following up on sent proposals', 'follow_up', 'Hi {{client_name}},\n\nI wanted to follow up on the cleaning service proposal we sent for {{service_location}}. Do you have any questions about our services or pricing?\n\nWe would love the opportunity to discuss how we can help maintain your facility.\n\nBest regards,\n{{sender_name}}', '["client_name", "service_location", "sender_name"]'::jsonb, true),
('Thank You Email', 'Template for thanking clients after proposal acceptance', 'email', 'Dear {{client_name}},\n\nThank you for choosing our cleaning services! We are excited to begin working with you.\n\nOur team will contact you within 24 hours to schedule the initial service and discuss any specific requirements.\n\nWelcome to the family!\n\nBest regards,\n{{company_name}}', '["client_name", "company_name"]'::jsonb, true);

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