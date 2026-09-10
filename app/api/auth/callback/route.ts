import config from "@/config/config";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getUser } from "@/features/auth/services/get-user";
import { EmailService } from "@/lib/email/service";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "@/features/auth/utils/redirect";
import { after } from "next/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureServerEvent } from "@/lib/analytics/server";
import { FIRST_TOUCH_COOKIE, LAST_TOUCH_COOKIE, parseAttribution } from "@/lib/analytics/attribution";
import { gaClientIdFromCookie, sendGA4ServerEvent } from "@/lib/analytics/ga4-server";
import { sendStartTrialEvent } from "@/lib/analytics/meta-capi";

export async function GET(request: NextRequest) {
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

        const firstTouch = parseAttribution(request.cookies.get(FIRST_TOUCH_COOKIE)?.value);
        const lastTouch = parseAttribution(request.cookies.get(LAST_TOUCH_COOKIE)?.value);
        if (firstTouch) {
          const attribution = lastTouch ?? firstTouch;
          const gaClientId = gaClientIdFromCookie(request.cookies.get("_ga")?.value);
          const { error: attributionError } = await serviceClient.from("marketing_attribution").upsert({
            user_id: user.id,
            first_touch: firstTouch,
            last_touch: attribution,
            first_touch_captured_at: firstTouch.capturedAt,
            last_touch_captured_at: attribution.capturedAt,
            ga_client_id: gaClientId,
          }, { onConflict: "user_id" });
          if (attributionError) console.error("Unable to persist marketing attribution", attributionError.message);
          const events = ["sign_up", "start_trial"].map((eventName) => ({
            event_id: `${eventName}:${user.id}`,
            user_id: user.id,
            event_name: eventName,
            attribution,
            properties: { source: attribution.source, campaign: attribution.campaign, content: attribution.content },
          }));
          const { error: funnelError } = await serviceClient.from("marketing_funnel_events").upsert(events, { onConflict: "event_id", ignoreDuplicates: true });
          if (funnelError) console.error("Unable to persist signup funnel events", funnelError.message);
          await Promise.all([
            sendGA4ServerEvent({ clientId: gaClientId, userId: user.id, name: "sign_up", eventId: `sign_up:${user.id}`, params: { method: user.app_metadata?.provider ?? "email" } }),
            sendGA4ServerEvent({ clientId: gaClientId, userId: user.id, name: "start_trial", eventId: `start_trial:${user.id}`, params: { plan: "free_trial" } }),
            sendStartTrialEvent({ email: user.email, userId: user.id, planName: "free_trial", value: 0, eventId: `start_trial:${user.id}` }),
          ]);
        }

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
