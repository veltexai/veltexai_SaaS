import MagicLinkSignupForm from "@/features/auth/components/magic-link-signup-form";
import SignupForm from "@/features/auth/components/signup-form";
import { getUser } from "@/features/auth/services/get-user";
import { redirect } from "next/navigation";
import { getSafeRedirectPath } from "@/features/auth/utils/redirect";

interface SignupPageProps {
  searchParams: Promise<{ method?: string; redirect?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
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
        <MagicLinkSignupForm className="w-4xl" redirectTo={redirectTo} />
      ) : (
        <SignupForm className="w-4xl" redirectTo={redirectTo} />
      )}
    </div>
  );
}
