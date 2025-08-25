import MagicLinkLoginForm from '@/components/forms/magic-link-login-form';
import { redirect } from 'next/navigation';
import { getUser } from '@/queries/user';
import LoginForm from '@/components/forms/login-form';
interface LoginPageProps {
  searchParams: Promise<{ method?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { user } = await getUser();
  if (user) {
    return redirect('/dashboard');
  }

  const params = await searchParams;
  const authMethod = params.method === 'magic' ? 'magic' : 'email';

  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4">
      {authMethod === 'magic' ? (
        <MagicLinkLoginForm className="w-4xl" />
      ) : (
        <LoginForm className="w-4xl" />
      )}
    </div>
  );
}
