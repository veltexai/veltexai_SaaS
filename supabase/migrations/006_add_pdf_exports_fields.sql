-- Add missing columns to pdf_exports table
ALTER TABLE public.pdf_exports 
ADD COLUMN IF NOT EXISTS template_used TEXT DEFAULT 'modern',
ADD COLUMN IF NOT EXISTS exported_at TIMESTAMPTZ DEFAULT NOW();

-- Remove file_url column as it's not being used
ALTER TABLE public.pdf_exports DROP COLUMN IF EXISTS file_url;