import config from '@/config/config';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/queries/user';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const encodedRedirectTo =
    requestUrl.searchParams.get('redirect') || '/dashboard';
  const priceId = decodeURIComponent(
    requestUrl.searchParams.get('priceId') || ''
  );
  const discountCode = decodeURIComponent(
    requestUrl.searchParams.get('discountCode') || ''
  );
  const redirectTo = decodeURIComponent(encodedRedirectTo);

  const supabase = await createClient();
  const baseUrl = config.domainName || requestUrl.origin;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    // Check if this is a new user
    let isNewUser = false;
    if (data?.user && !error) {
      const userCreatedAt = new Date(data.user.created_at);
      const now = new Date();
      const timeDiff = now.getTime() - userCreatedAt.getTime();
      isNewUser = timeDiff < 30000;

      // Set session flag for new users
      if (isNewUser) {
        await supabase.auth.updateUser({
          data: {
            signup_completed: true,
            signup_timestamp: new Date().toISOString(),
          },
        });
      }
    }

    const userData = await getUser();
  }

  return NextResponse.redirect(`${baseUrl}${redirectTo}`);
}
