"use server";

import { z } from "zod";
import { validatedAction } from "@/lib/auth/middleware";
import { createClient } from "@/lib/supabase/server";
import type { AuthResponse } from "@/features/auth/types";
import config from "@/config/config";
import { buildAuthCallbackUrl } from "@/features/auth/utils/redirect";

const magicLinkSchema = z.object({
  email: z.string().email(),
  redirect: z.string().optional(),
  redirectTo: z.string().optional(),
  priceId: z.string().optional(),
});

export const signInWithMagicLink = validatedAction(
  magicLinkSchema,
  async (data): Promise<AuthResponse> => {
    const supabase = await createClient();
    const { email, priceId, redirectTo, redirect } = data;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildAuthCallbackUrl({
          baseUrl: config.domainName,
          priceId,
          redirectTo: redirectTo || redirect,
        }),
      },
    });

    if (error) {
      console.error("Error sending magic link:", error);
      return { error: { message: error.message } };
    }

    return { success: "Magic link sent to your email." };
  },
);

const signUpMagicLinkSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  companyName: z.string().optional(),
  priceId: z.string().optional(),
  redirectTo: z.string().optional(),
});

export const signUpWithMagicLink = validatedAction(
  signUpMagicLinkSchema,
  async (data): Promise<AuthResponse> => {
    const supabase = await createClient();
    const { email, fullName, companyName, priceId, redirectTo } = data;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName || "",
        },
        emailRedirectTo: buildAuthCallbackUrl({
          baseUrl: config.domainName,
          priceId,
          redirectTo,
        }),
      },
    });

    if (error) {
      console.error("Error sending magic link:", error);
      return { error: { message: error.message } };
    }

    return { success: "Magic link sent to your email." };
  },
);
