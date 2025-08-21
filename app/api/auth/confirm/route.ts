import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AUTH_ROUTES } from '@/lib/auth/constants';
import config from '@/config/config';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';

  if (token_hash && type) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error && data.session) {
      // For password recovery, redirect with session tokens
      if (type === 'recovery') {
        const { access_token, refresh_token } = data.session;
        redirect(
          `${config.domainName}/${AUTH_ROUTES.RESET_PASSWORD}?access_token=${access_token}&refresh_token=${refresh_token}`
        );
      }
      // For other types (email confirmation), use next parameter or dashboard
      redirect(`${config.domainName}/${next}`);
    }
  }

  // redirect the user to an error page with instructions
  redirect(
    `${config.domainName}/${AUTH_ROUTES.LOGIN}?error=Invalid or expired reset link`
  );
}
