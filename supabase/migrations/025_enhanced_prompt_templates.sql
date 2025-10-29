-- Enhanced Prompt Templates System
-- This migration enhances the prompt_templates table with more specific categories and additional functionality

-- Ensure the prompt_templates table exists before proceeding
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'prompt_templates' 
                   AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Table prompt_templates does not exist. Please run previous migrations first.';
    END IF;
END $$;

-- First, let's update the category constraint to include more specific categories
-- Drop the existing CHECK constraint and add new one with additional categories
ALTER TABLE public.prompt_templates DROP CONSTRAINT IF EXISTS prompt_templates_category_check;

-- Add the updated constraint with new categories
ALTER TABLE public.prompt_templates 
ADD CONSTRAINT prompt_templates_category_check 
CHECK (category IN (
  'proposal', 
  'email', 
  'follow_up', 
  'custom',
  'proposal_commercial',
  'proposal_residential', 
  'proposal_specialized',
  'email_welcome',
  'email_follow_up',
  'email_reminder',
  'email_thank_you',
  'email_rejection',
  'follow_up_initial',
  'follow_up_second',
  'follow_up_final',
  'commercial_proposal',
  'residential_proposal',
  'email_followup',
  'contract_terms',
  'project_scope'
));

-- Add new columns to prompt_templates table using DO block for better error handling
DO $$
BEGIN
    -- Add subcategory column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'subcategory'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN subcategory VARCHAR(100);
    END IF;
    
    -- Add tags column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'tags'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add variable_definitions column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'variable_definitions'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN variable_definitions JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add usage_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'usage_count'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN usage_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add last_used_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'last_used_at'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN last_used_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompt_templates_subcategory ON public.prompt_templates(subcategory);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_tags ON public.prompt_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_usage_count ON public.prompt_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_last_used ON public.prompt_templates(last_used_at DESC);

-- Clean up duplicate entries and add unique constraint on name column to support ON CONFLICT
DO $$
BEGIN
    -- First, check if name column exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'prompt_templates' 
               AND column_name = 'name') THEN
        
        -- Update duplicate names to make them unique
        UPDATE public.prompt_templates 
        SET name = name || '_' || id::text 
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as rn
                FROM public.prompt_templates
                WHERE name IS NOT NULL
            ) t WHERE rn > 1
        );
        
        -- Now add the unique constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'prompt_templates_name_unique' 
            AND table_name = 'prompt_templates'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.prompt_templates ADD CONSTRAINT prompt_templates_name_unique UNIQUE (name);
        END IF;
    END IF;
END $$;

-- Insert enhanced default templates with proper conflict handling
INSERT INTO public.prompt_templates (name, description, category, subcategory, template_content, template_text, variables, tags, variable_definitions, is_default, service_type) VALUES
(
  'Commercial Proposal Template',
  'Enhanced template for commercial cleaning proposals',
  'commercial_proposal',
  'standard',
  'Dear {{client_name}},

Thank you for considering {{company_name}} for your {{project_type}} project. We are excited to present our proposal for {{project_description}}.

**Project Overview:**
{{project_overview}}

**Scope of Work:**
{{scope_of_work}}

**Timeline:**
- Project Start: {{start_date}}
- Estimated Completion: {{completion_date}}
- Total Duration: {{project_duration}}

**Investment:**
- Total Project Cost: ${{total_cost}}
- Payment Terms: {{payment_terms}}

**Why Choose {{company_name}}:**
{{company_benefits}}

We look forward to the opportunity to work with you on this exciting project.

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}',
  'Dear {{client_name}},

Thank you for considering {{company_name}} for your {{project_type}} project. We are excited to present our proposal for {{project_description}}.

**Project Overview:**
{{project_overview}}

**Scope of Work:**
{{scope_of_work}}

**Timeline:**
- Project Start: {{start_date}}
- Estimated Completion: {{completion_date}}
- Total Duration: {{project_duration}}

**Investment:**
- Total Project Cost: ${{total_cost}}
- Payment Terms: {{payment_terms}}

**Why Choose {{company_name}}:**
{{company_benefits}}

We look forward to the opportunity to work with you on this exciting project.

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}',
  '["client_name", "company_name", "project_type", "project_description", "project_overview", "scope_of_work", "start_date", "completion_date", "project_duration", "total_cost", "payment_terms", "company_benefits", "sender_name", "sender_title"]'::jsonb,
  '["commercial", "proposal", "business"]'::jsonb,
  '{
    "client_name": {"type": "text", "description": "Name of the client or company"},
    "company_name": {"type": "text", "description": "Your company name"},
    "project_type": {"type": "text", "description": "Type of project (e.g., construction, renovation)"},
    "project_description": {"type": "text", "description": "Brief description of the project"},
    "project_overview": {"type": "textarea", "description": "Detailed project overview"},
    "scope_of_work": {"type": "textarea", "description": "Detailed scope of work"},
    "start_date": {"type": "date", "description": "Project start date"},
    "completion_date": {"type": "date", "description": "Expected completion date"},
    "project_duration": {"type": "text", "description": "Project duration (e.g., 6 weeks)"},
    "total_cost": {"type": "number", "description": "Total project cost"},
    "payment_terms": {"type": "text", "description": "Payment terms and schedule"},
    "company_benefits": {"type": "textarea", "description": "Why client should choose your company"},
    "sender_name": {"type": "text", "description": "Name of the person sending the proposal"},
    "sender_title": {"type": "text", "description": "Title of the person sending the proposal"}
  }'::jsonb,
  true,
  'commercial_proposal'
),
(
  'Residential Proposal Template',
  'Enhanced template for residential cleaning proposals',
  'residential_proposal',
  'standard',
  'Dear {{homeowner_name}},

Thank you for inviting {{company_name}} to provide a proposal for your {{project_type}} project at {{property_address}}.

**Project Details:**
{{project_details}}

**What''s Included:**
{{included_services}}

**Timeline & Schedule:**
- Start Date: {{start_date}}
- Completion: {{completion_date}}
- Working Hours: {{working_hours}}

**Investment & Payment:**
- Total Investment: ${{total_cost}}
- Payment Schedule: {{payment_schedule}}

**Our Commitment:**
{{commitment_statement}}

**Next Steps:**
{{next_steps}}

We appreciate the opportunity to work on your home and look forward to hearing from you.

Warm regards,
{{contractor_name}}
{{company_name}}
{{contact_info}}',
  'Dear {{homeowner_name}},

Thank you for inviting {{company_name}} to provide a proposal for your {{project_type}} project at {{property_address}}.

**Project Details:**
{{project_details}}

**What''s Included:**
{{included_services}}

**Timeline & Schedule:**
- Start Date: {{start_date}}
- Completion: {{completion_date}}
- Working Hours: {{working_hours}}

**Investment & Payment:**
- Total Investment: ${{total_cost}}
- Payment Schedule: {{payment_schedule}}

**Our Commitment:**
{{commitment_statement}}

**Next Steps:**
{{next_steps}}

We appreciate the opportunity to work on your home and look forward to hearing from you.

Warm regards,
{{contractor_name}}
{{company_name}}
{{contact_info}}',
  '["homeowner_name", "company_name", "project_type", "property_address", "project_details", "included_services", "start_date", "completion_date", "working_hours", "total_cost", "payment_schedule", "commitment_statement", "next_steps", "contractor_name", "contact_info"]'::jsonb,
  '["residential", "proposal", "homeowner"]'::jsonb,
  '{
    "homeowner_name": {"type": "text", "description": "Name of the homeowner"},
    "company_name": {"type": "text", "description": "Your company name"},
    "project_type": {"type": "text", "description": "Type of residential project"},
    "property_address": {"type": "text", "description": "Address of the property"},
    "project_details": {"type": "textarea", "description": "Detailed project description"},
    "included_services": {"type": "textarea", "description": "List of included services"},
    "start_date": {"type": "date", "description": "Project start date"},
    "completion_date": {"type": "date", "description": "Expected completion date"},
    "working_hours": {"type": "text", "description": "Working hours (e.g., 8 AM - 5 PM)"},
    "total_cost": {"type": "number", "description": "Total project cost"},
    "payment_schedule": {"type": "text", "description": "Payment schedule details"},
    "commitment_statement": {"type": "textarea", "description": "Your commitment to quality and service"},
    "next_steps": {"type": "textarea", "description": "What happens next in the process"},
    "contractor_name": {"type": "text", "description": "Name of the contractor"},
    "contact_info": {"type": "text", "description": "Contact information"}
  }'::jsonb,
  true,
  'residential_proposal'
),
(
  'Welcome Email Template',
  'Enhanced template for welcoming new clients',
  'email_welcome',
  'new_client',
  'Subject: Welcome to {{company_name}} - Let''s Get Started!

Dear {{client_name}},

Welcome to the {{company_name}} family! We''re thrilled to have you on board and excited to begin working on your {{project_type}} project.

**What Happens Next:**
{{next_steps}}

**Your Project Team:**
{{team_introduction}}

**Important Information:**
{{important_info}}

**How to Reach Us:**
{{contact_methods}}

We''re committed to making this process as smooth and enjoyable as possible. If you have any questions, please don''t hesitate to reach out.

Looking forward to creating something amazing together!

Best regards,
{{sender_name}}
{{company_name}}',
  'Subject: Welcome to {{company_name}} - Let''s Get Started!

Dear {{client_name}},

Welcome to the {{company_name}} family! We''re thrilled to have you on board and excited to begin working on your {{project_type}} project.

**What Happens Next:**
{{next_steps}}

**Your Project Team:**
{{team_introduction}}

**Important Information:**
{{important_info}}

**How to Reach Us:**
{{contact_methods}}

We''re committed to making this process as smooth and enjoyable as possible. If you have any questions, please don''t hesitate to reach out.

Looking forward to creating something amazing together!

Best regards,
{{sender_name}}
{{company_name}}',
  '["company_name", "client_name", "project_type", "next_steps", "team_introduction", "important_info", "contact_methods", "sender_name"]'::jsonb,
  '["email", "welcome", "onboarding"]'::jsonb,
  '{
    "company_name": {"type": "text", "description": "Your company name"},
    "client_name": {"type": "text", "description": "Client name"},
    "project_type": {"type": "text", "description": "Type of project"},
    "next_steps": {"type": "textarea", "description": "What happens next in the process"},
    "team_introduction": {"type": "textarea", "description": "Introduction to the project team"},
    "important_info": {"type": "textarea", "description": "Important information for the client"},
    "contact_methods": {"type": "textarea", "description": "How clients can reach you"},
    "sender_name": {"type": "text", "description": "Name of the sender"}
  }'::jsonb,
  true,
  'welcome_email'
),
(
  'Follow-up Reminder Template',
  'Enhanced template for following up on proposals',
  'email_followup',
  'proposal_reminder',
  'Subject: Following Up on Your {{project_type}} Proposal

Hi {{client_name}},

I hope this email finds you well. I wanted to follow up on the proposal we sent for your {{project_type}} project on {{proposal_date}}.

**Proposal Summary:**
{{proposal_summary}}

**Timeline Reminder:**
{{timeline_reminder}}

**Questions or Concerns:**
{{questions_section}}

**Next Steps:**
{{next_steps}}

We understand that decisions like this take time, and we''re here to support you through the process. Please feel free to reach out if you need any clarification or have additional questions.

Thank you for considering {{company_name}} for your project.

Best regards,
{{sender_name}}
{{company_name}}
{{contact_info}}',
  'Subject: Following Up on Your {{project_type}} Proposal

Hi {{client_name}},

I hope this email finds you well. I wanted to follow up on the proposal we sent for your {{project_type}} project on {{proposal_date}}.

**Proposal Summary:**
{{proposal_summary}}

**Timeline Reminder:**
{{timeline_reminder}}

**Questions or Concerns:**
{{questions_section}}

**Next Steps:**
{{next_steps}}

We understand that decisions like this take time, and we''re here to support you through the process. Please feel free to reach out if you need any clarification or have additional questions.

Thank you for considering {{company_name}} for your project.

Best regards,
{{sender_name}}
{{company_name}}
{{contact_info}}',
  '["project_type", "client_name", "proposal_date", "proposal_summary", "timeline_reminder", "questions_section", "next_steps", "company_name", "sender_name", "contact_info"]'::jsonb,
  '["email", "followup", "reminder"]'::jsonb,
  '{
    "project_type": {"type": "text", "description": "Type of project"},
    "client_name": {"type": "text", "description": "Client name"},
    "proposal_date": {"type": "date", "description": "Date the proposal was sent"},
    "proposal_summary": {"type": "textarea", "description": "Brief summary of the proposal"},
    "timeline_reminder": {"type": "text", "description": "Timeline information"},
    "questions_section": {"type": "textarea", "description": "Common questions or concerns"},
    "next_steps": {"type": "textarea", "description": "What the client should do next"},
    "company_name": {"type": "text", "description": "Your company name"},
    "sender_name": {"type": "text", "description": "Name of the sender"},
    "contact_info": {"type": "text", "description": "Contact information"}
  }'::jsonb,
  true,
  'followup_email'
)
ON CONFLICT (name) DO NOTHING;

-- Create a function to update template usage
CREATE OR REPLACE FUNCTION public.update_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.prompt_templates 
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    last_used_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.update_template_usage(UUID) TO authenticated;