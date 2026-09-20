import { type EmailOtpType, createClient as createServiceClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AUTH_ROUTES } from "@/features/auth/constants";
import config from "@/config/config";
import { after } from "next/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureServerEvent } from "@/lib/analytics/server";
import { FIRST_TOUCH_COOKIE, LAST_TOUCH_COOKIE, parseAttribution } from "@/lib/analytics/attribution";
import { gaClientIdFromCookie, sendGA4ServerEvent } from "@/lib/analytics/ga4-server";
import { sendCompleteRegistrationEvent, sendStartTrialEvent } from "@/lib/analytics/meta-capi";
import { getSafeRedirectPath } from "@/features/auth/utils/redirect";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = getSafeRedirectPath(searchParams.get("next") ?? "/dashboard/proposals/quick?source=signup");
  const plan = searchParams.get("plan"); // Add plan parameter

  if (token_hash && type) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error && data.session) {
      // For password recovery, redirect with session tokens
      if (type === "recovery") {
        const { access_token, refresh_token } = data.session;
        redirect(
          `${config.domainName}${AUTH_ROUTES.RESET_PASSWORD}?access_token=${access_token}&refresh_token=${refresh_token}`,
        );
      }

      const isNewUser = type === "signup" || type === "email";

      if (isNewUser) {
        // Set session metadata instead of URL parameter
        await supabase.auth.updateUser({
          data: {
            signup_completed: true,
            signup_timestamp: new Date().toISOString(),
          },
        });

        if (data.user) {
          after(() =>
            captureServerEvent({
              distinctId: data.user!.id,
              event: ANALYTICS_EVENTS.SIGNUP_COMPLETED,
              properties: {
                auth_method: "email",
                $insert_id: `signup_completed:${data.user!.id}`,
              },
            }),
          );

          const user = data.user;
          const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
          );
          const metadataFirstTouch = typeof user.user_metadata?.marketing_first_touch === "string"
            ? user.user_metadata.marketing_first_touch : undefined;
          const metadataLastTouch = typeof user.user_metadata?.marketing_last_touch === "string"
            ? user.user_metadata.marketing_last_touch : undefined;
          const firstTouch = parseAttribution(request.cookies.get(FIRST_TOUCH_COOKIE)?.value) ?? parseAttribution(metadataFirstTouch);
          const lastTouch = parseAttribution(request.cookies.get(LAST_TOUCH_COOKIE)?.value) ?? parseAttribution(metadataLastTouch) ?? firstTouch;
          const { data: existingSignup, error: existingSignupError } = await serviceClient
            .from("marketing_funnel_events")
            .select("event_id")
            .eq("event_id", `sign_up:${user.id}`)
            .maybeSingle();

          if (!existingSignupError && !existingSignup) {
            if (firstTouch) {
              await serviceClient.from("marketing_attribution").upsert({
                user_id: user.id,
                first_touch: firstTouch,
                last_touch: lastTouch,
                first_touch_captured_at: firstTouch.capturedAt,
                last_touch_captured_at: lastTouch?.capturedAt ?? firstTouch.capturedAt,
                ga_client_id: gaClientIdFromCookie(request.cookies.get("_ga")?.value),
              }, { onConflict: "user_id" });
            }
            const source = lastTouch?.source ?? firstTouch?.source ?? "direct";
            await serviceClient.from("marketing_funnel_events").upsert([
              { event_id: `sign_up:${user.id}`, user_id: user.id, event_name: "sign_up", attribution: lastTouch ?? firstTouch, properties: { source } },
              { event_id: `start_trial:${user.id}`, user_id: user.id, event_name: "start_trial", attribution: lastTouch ?? firstTouch, properties: { source } },
            ], { onConflict: "event_id", ignoreDuplicates: true });
            if (user.email) {
              const gaClientId = gaClientIdFromCookie(request.cookies.get("_ga")?.value);
              await Promise.all([
                sendGA4ServerEvent({ clientId: gaClientId, userId: user.id, name: "sign_up", eventId: `sign_up:${user.id}`, params: { method: "email", source } }),
                sendGA4ServerEvent({ clientId: gaClientId, userId: user.id, name: "start_trial", eventId: `start_trial:${user.id}`, params: { plan: "free_trial", source } }),
                sendCompleteRegistrationEvent({ email: user.email, userId: user.id, eventId: `complete_registration:${user.id}` }),
                sendStartTrialEvent({ email: user.email, userId: user.id, planName: "free_trial", value: 0, eventId: `start_trial:${user.id}` }),
              ]);
            }
          } else if (existingSignupError) {
            console.error("Unable to record verified signup", existingSignupError.message);
          }
        }
      }

      if (plan) {
        redirect(
          `${config.domainName}/pricing?plan=${plan}&auto_checkout=true`,
        );
      }

      redirect(`${config.domainName}${next}`);
    }
  }

  // redirect the user to an error page with instructions
  redirect(
    `${config.domainName}${AUTH_ROUTES.LOGIN}?error=Invalid or expired reset link`,
  );
}
