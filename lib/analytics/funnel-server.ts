import { createClient } from "@supabase/supabase-js";

type FunnelEvent = {
  eventId: string;
  userId: string;
  eventName:
    | "proposal_generate_succeeded"
    | "proposal_saved"
    | "first_proposal"
    | "repeat_proposal"
    | "checkout_started";
  properties?: Record<string, unknown>;
};

/**
 * Best-effort first-party funnel recording. Analytics must never block the
 * product action it describes, and event IDs make retries idempotent.
 */
export async function recordFunnelEvents(events: FunnelEvent[]) {
  if (events.length === 0) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return;

  try {
    const db = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await db.from("marketing_funnel_events").upsert(
      events.map(({ eventId, userId, eventName, properties }) => ({
        event_id: eventId,
        user_id: userId,
        event_name: eventName,
        properties: properties ?? {},
      })),
      { onConflict: "event_id", ignoreDuplicates: true },
    );
    if (error) console.error("Unable to record funnel event", error.message);
  } catch (error) {
    console.error("Unable to record funnel event", error);
  }
}
