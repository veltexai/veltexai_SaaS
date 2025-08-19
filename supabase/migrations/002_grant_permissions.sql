-- Grant permissions to anon and authenticated roles
GRANT SELECT ON public.profiles TO anon;
GRANT ALL PRIVILEGES ON public.profiles TO authenticated;

GRANT SELECT ON public.proposals TO anon;
GRANT ALL PRIVILEGES ON public.proposals TO authenticated;

GRANT SELECT ON public.subscriptions TO anon;
GRANT ALL PRIVILEGES ON public.subscriptions TO authenticated;

GRANT SELECT ON public.billing_history TO anon;
GRANT ALL PRIVILEGES ON public.billing_history TO authenticated;

GRANT SELECT ON public.pdf_exports TO anon;
GRANT ALL PRIVILEGES ON public.pdf_exports TO authenticated;

-- Grant sequence permissions
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;