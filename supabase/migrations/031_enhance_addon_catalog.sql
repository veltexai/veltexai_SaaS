-- ==============================================
-- Enhancement: Add-On Catalog Enhancements
-- ==============================================
-- Add missing columns for admin management feature
-- - category: for grouping/filtering add-ons
-- - show_in_proposals: visibility flag for proposal builder
-- - description: user-facing description

-- Add category column
ALTER TABLE public.additional_service_catalog 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('cleaning', 'maintenance', 'specialty', 'seasonal', 'other'));

-- Add show_in_proposals column (defaults to true for existing records)
ALTER TABLE public.additional_service_catalog 
ADD COLUMN IF NOT EXISTS show_in_proposals BOOLEAN NOT NULL DEFAULT true;

-- Add description column (user-facing text)
ALTER TABLE public.additional_service_catalog 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add notes column (internal admin notes)
ALTER TABLE public.additional_service_catalog 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for category for faster filtering
CREATE INDEX IF NOT EXISTS idx_additional_service_catalog_category 
ON public.additional_service_catalog(category);

-- Create index for show_in_proposals for faster filtering
CREATE INDEX IF NOT EXISTS idx_additional_service_catalog_show_in_proposals 
ON public.additional_service_catalog(show_in_proposals);

-- Create index for active status (if not already exists)
CREATE INDEX IF NOT EXISTS idx_additional_service_catalog_active 
ON public.additional_service_catalog(active);

-- Update existing records with default categories based on SKU patterns
UPDATE public.additional_service_catalog
SET category = 'cleaning'
WHERE category IS NULL 
  AND (sku LIKE '%carpet%' OR sku LIKE '%clean%' OR sku LIKE '%wax%');

UPDATE public.additional_service_catalog
SET category = 'maintenance'
WHERE category IS NULL 
  AND (sku LIKE '%window%' OR sku LIKE '%breakroom%' OR sku LIKE '%fridge%');

UPDATE public.additional_service_catalog
SET category = 'specialty'
WHERE category IS NULL;

-- ==============================================
-- Update Seed Data with New Fields
-- ==============================================

-- Update existing seed data with categories and descriptions
UPDATE public.additional_service_catalog
SET 
  category = 'cleaning',
  description = 'Deep carpet cleaning using hot water extraction method for thorough dirt and stain removal',
  show_in_proposals = true
WHERE sku = 'carpet_extraction';

UPDATE public.additional_service_catalog
SET 
  category = 'maintenance',
  description = 'Professional floor care including stripping old wax and applying fresh protective coating',
  show_in_proposals = true
WHERE sku = 'strip_wax_vct';

UPDATE public.additional_service_catalog
SET 
  category = 'maintenance',
  description = 'Complete interior and exterior window cleaning for enhanced visibility and appearance',
  show_in_proposals = true
WHERE sku = 'window_wash_in_out';

UPDATE public.additional_service_catalog
SET 
  category = 'specialty',
  description = 'Thorough cleaning and sanitization of breakroom appliances including refrigerator and microwave',
  show_in_proposals = true
WHERE sku = 'breakroom_fridge_micro';

-- ==============================================
-- Comments for Documentation
-- ==============================================

COMMENT ON COLUMN public.additional_service_catalog.category IS 
  'Service category for grouping and filtering: cleaning, maintenance, specialty, seasonal, other';

COMMENT ON COLUMN public.additional_service_catalog.show_in_proposals IS 
  'Whether this add-on should be visible in the proposal builder UI';

COMMENT ON COLUMN public.additional_service_catalog.description IS 
  'User-facing description shown in proposals and catalog';

COMMENT ON COLUMN public.additional_service_catalog.notes IS 
  'Internal admin notes (not shown to clients)';

