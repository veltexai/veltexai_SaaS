-- Enhanced Prompt Templates System with Better Categorization
-- This migration adds more specific categories and improves the variable system

-- First, update the category constraint to include more specific categories
-- Drop any existing CHECK constraints on the category column safely
ALTER TABLE public.prompt_templates DROP CONSTRAINT IF EXISTS prompt_templates_category_check;

-- Add the new constraint with expanded categories
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
  'follow_up_final'
));

-- Add new columns for enhanced categorization
DO $$
BEGIN
    -- Add subcategory column for more granular categorization
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'subcategory') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN subcategory TEXT;
    END IF;
    
    -- Add tags column for flexible tagging
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'tags') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add variable_definitions column for better variable management
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'variable_definitions') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN variable_definitions JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add usage_count column for analytics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'usage_count') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN usage_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add last_used_at column for analytics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompt_templates' 
                   AND column_name = 'last_used_at') THEN
        ALTER TABLE public.prompt_templates ADD COLUMN last_used_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompt_templates_subcategory ON public.prompt_templates(subcategory);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_tags ON public.prompt_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_usage_count ON public.prompt_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_last_used ON public.prompt_templates(last_used_at DESC);

-- Create a function to update usage statistics
CREATE OR REPLACE FUNCTION update_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.prompt_templates 
    SET 
        usage_count = usage_count + 1,
        last_used_at = now()
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_template_usage(UUID) TO authenticated;