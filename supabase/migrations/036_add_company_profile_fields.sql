-- Add company-specific fields to profiles table
-- company_founded_date: used to auto-calculate years in business for proposals
-- industries_served: e.g. "Education, offices, retail & healthcare"
-- satisfaction_guarantee: e.g. "100% Satisfaction"

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS company_founded_date DATE,
  ADD COLUMN IF NOT EXISTS industries_served TEXT,
  ADD COLUMN IF NOT EXISTS satisfaction_guarantee TEXT;
