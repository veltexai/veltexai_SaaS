import MagicLinkSignupForm from '@/components/forms/magic-link-signup-form';
import SignupForm from '@/components/forms/signup-form';
import { getUser } from '@/queries/user';
import { redirect } from 'next/navigation';

interface SignupPageProps {
  searchParams: Promise<{ method?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { user } = await getUser();
  if (user) {
    return redirect('/dashboard');
  }
  const params = await searchParams;
  const authMethod = params.method === 'magic' ? 'magic' : 'email';

  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4">
      {authMethod === 'magic' ? (
        <MagicLinkSignupForm className="w-4xl" />
      ) : (
        <SignupForm className="w-4xl" />
      )}
    </div>
  );
}
