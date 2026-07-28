import { AUTH_ROUTES } from "@/features/auth/constants";

const DUMMY_ORIGIN = "https://veltex.local";

export function getSafeRedirectPath(redirectTo?: string | null) {
  if (
    !redirectTo ||
    !redirectTo.startsWith("/") ||
    redirectTo.startsWith("//") ||
    // Browsers treat "\" as "/" when resolving redirects, so "/\evil.com"
    // resolves to https://evil.com — reject backslashes entirely.
    redirectTo.includes("\\")
  ) {
    return AUTH_ROUTES.DASHBOARD;
  }

  return redirectTo;
}

export function buildAuthCallbackUrl({
  baseUrl,
  redirectTo,
  priceId,
  authIntent,
}: {
  baseUrl: string;
  redirectTo?: string | null;
  priceId?: string | null;
  authIntent?: "signup";
}) {
  const callbackUrl = new URL("/api/auth/callback", baseUrl);

  if (priceId) {
    callbackUrl.searchParams.set("priceId", priceId);
  }

  if (authIntent) {
    callbackUrl.searchParams.set("auth_intent", authIntent);
  }

  callbackUrl.searchParams.set("redirect", getSafeRedirectPath(redirectTo));

  return callbackUrl.toString();
}

export function buildAuthPathWithRedirect({
  pathname,
  redirectTo,
  params = {},
}: {
  pathname: string;
  redirectTo?: string | null;
  params?: Record<string, string | undefined>;
}) {
  const authUrl = new URL(pathname, DUMMY_ORIGIN);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      authUrl.searchParams.set(key, value);
    }
  }

  if (redirectTo) {
    authUrl.searchParams.set("redirect", getSafeRedirectPath(redirectTo));
  }

  return `${authUrl.pathname}${authUrl.search}`;
}
