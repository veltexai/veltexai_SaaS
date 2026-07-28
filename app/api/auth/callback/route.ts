import config from "@/config/config";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getUser } from "@/features/auth/services/get-user";
import { EmailService } from "@/lib/email/service";
import { NextResponse } from "next/server";
import { getSafeRedirectPath } from "@/features/auth/utils/redirect";
import { after } from "next/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureServerEvent } from "@/lib/analytics/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = getSafeRedirectPath(
    requestUrl.searchParams.get("redirect"),
  );
  const isSignupCallback =
    requestUrl.searchParams.get("auth_intent") === "signup";

  const supabase = await createClient();
  const baseUrl = config.domainName || requestUrl.origin;

  console.log("Before code check");
  if (code) {
    console.log("Before exchange code for session");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("After exchange code for session");
    console.log("data", data);
    console.log("error", error);
    if (data?.user && !error) {
      console.log("After user check");
      const user = data.user;

      if (isSignupCallback) {
        const authMethod =
          typeof user.app_metadata?.provider === "string"
            ? user.app_metadata.provider
            : "unknown";
        after(() =>
          captureServerEvent({
            distinctId: user.id,
            event: ANALYTICS_EVENTS.SIGNUP_COMPLETED,
            properties: {
              auth_method: authMethod,
              $insert_id: `signup_completed:${user.id}`,
            },
          }),
        );
      }

      // Mark signup as completed on every new session exchange so downstream
      // code can rely on this flag.
      console.log("Before update user");
      await supabase.auth.updateUser({
        data: {
          signup_completed: true,
          signup_timestamp:
            user.user_metadata?.signup_timestamp ?? new Date().toISOString(),
        },
      });

      // ── Welcome email ──────────────────────────────────────────────────────
      // Use email_automation_log as the source of truth instead of a time
      // window. Email confirmation clicks happen minutes/hours after signup, so
      // a 30-second window never fires. The UNIQUE constraint prevents duplicates
      // even if this callback is visited multiple times.
      console.log("Before user email check");
      if (user.email) {
        console.log("user.email", user.email);
        const serviceClient = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const { data: alreadySent } = await serviceClient
          .from("email_automation_log")
          .select("id")
          .eq("user_id", user.id)
          .eq("email_type", "welcome")
          .maybeSingle();

        console.log("alreadySent", alreadySent);

        if (!alreadySent) {
          const loginUrl = `${baseUrl}/dashboard/proposals`;
          EmailService.sendWelcomeTrialEmail(user.email, { loginUrl })
            .then(async (sent) => {
              if (sent) {
                await serviceClient
                  .from("email_automation_log")
                  .insert({ user_id: user.id, email_type: "welcome" });
              }
            })
            .catch((err) => console.error("❌ Welcome email error:", err));
        }
      }
    }

    await getUser();
  }

  return NextResponse.redirect(`${baseUrl}${redirectTo}`);
}
