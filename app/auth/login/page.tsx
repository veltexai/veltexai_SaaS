import MagicLinkLoginForm from "@/features/auth/components/magic-link-login-form";
import { redirect } from "next/navigation";
import { getUser } from "@/features/auth/services/get-user";
import LoginForm from "@/features/auth/components/login-form";
import { getSafeRedirectPath } from "@/features/auth/utils/redirect";
interface LoginPageProps {
  searchParams: Promise<{ method?: string; redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = getSafeRedirectPath(params.redirect);
  const { user } = await getUser();
  if (user) {
    return redirect(redirectTo);
  }

  const authMethod = params.method === "magic" ? "magic" : "email";

  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4">
      {authMethod === "magic" ? (
        <MagicLinkLoginForm className="w-4xl" redirectTo={redirectTo} />
      ) : (
        <LoginForm className="w-4xl" redirectTo={redirectTo} />
      )}
    </div>
  );
}
