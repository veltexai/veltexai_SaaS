"use server";

import { createClient } from "@/lib/supabase/server";
import { AUTH_REDIRECTS, AUTH_ERRORS } from "@/features/auth/constants";
import type { AuthResponse } from "@/features/auth/types";
import config from "@/config/config";
import {
  buildAuthCallbackUrl,
  getSafeRedirectPath,
} from "@/features/auth/utils/redirect";

export const signInWithGoogle = async (
  priceId?: string,
  redirectTo?: string,
): Promise<AuthResponse> => {
  const supabase = await createClient();
  const safeRedirectTo = getSafeRedirectPath(
    redirectTo ?? AUTH_REDIRECTS.DEFAULT_REDIRECT,
  );

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildAuthCallbackUrl({
          baseUrl: config.domainName,
          priceId,
          redirectTo: safeRedirectTo,
        }),
      },
    });

    if (error) {
      return { error: { message: AUTH_ERRORS.GOOGLE_SIGNIN_FAILED } };
    }

    // Return the OAuth URL for client-side redirect
    if (data.url) {
      return { data: { url: data.url } };
    }

    return { error: { message: AUTH_ERRORS.GOOGLE_SIGNIN_FAILED } };
  } catch {
    return { error: { message: AUTH_ERRORS.GOOGLE_SIGNIN_FAILED } };
  }
};
