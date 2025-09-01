-- Add new profile fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS company_background TEXT;

-- Add constraints
ALTER TABLE public.profiles 
ADD CONSTRAINT check_phone_format 
  CHECK (phone ~ '^[+]?[1-9]\d{1,14}$'),
ADD CONSTRAINT check_website_format 
  CHECK (website IS NULL OR website ~ '^https?://.*'),
ADD CONSTRAINT check_company_background_length 
  CHECK (company_background IS NULL OR (LENGTH(company_background) >= 50 AND LENGTH(company_background) <= 500));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON public.profiles(company_name);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Update RLS policies (existing policies will cover new fields)
-- No additional RLS policies needed as they inherit from table-level policies