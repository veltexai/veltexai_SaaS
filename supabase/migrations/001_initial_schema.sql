-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'past_due')),
  subscription_plan TEXT CHECK (subscription_plan IN ('starter', 'professional', 'enterprise')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create proposals table
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  service_type TEXT NOT NULL CHECK (service_type IN ('residential', 'commercial', 'industrial')),
  property_size INTEGER,
  frequency TEXT NOT NULL CHECK (frequency IN ('one-time', 'weekly', 'bi-weekly', 'monthly')),
  estimated_hours DECIMAL(5,2),
  hourly_rate DECIMAL(10,2),
  total_amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  ai_generated_content JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'professional', 'enterprise')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create billing_history table
CREATE TABLE IF NOT EXISTS public.billing_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_invoice_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'failed')),
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pdf_exports table
CREATE TABLE IF NOT EXISTS public.pdf_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_exports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for proposals
CREATE POLICY "Users can view own proposals" ON public.proposals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own proposals" ON public.proposals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proposals" ON public.proposals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own proposals" ON public.proposals
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for billing_history
CREATE POLICY "Users can view own billing history" ON public.billing_history
  FOR SELECT USING (auth.uid() = user_id);

-- Create RLS policies for pdf_exports
CREATE POLICY "Users can view own pdf exports" ON public.pdf_exports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pdf exports" ON public.pdf_exports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pdf exports" ON public.pdf_exports
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_proposals
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_subscriptions
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'company_name', 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();