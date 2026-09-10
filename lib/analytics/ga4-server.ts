interface GA4ServerEvent { clientId: string | null; userId?: string; name: "sign_up" | "start_trial" | "purchase"; eventId: string; params?: Record<string, string | number | boolean> }
export function gaClientIdFromCookie(cookie: string | undefined): string | null { if (!cookie) return null; const match = cookie.match(/^GA\d+\.\d+\.(\d+\.\d+)$/); return match?.[1] ?? null; }
export async function sendGA4ServerEvent(event: GA4ServerEvent): Promise<boolean> {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_MEASUREMENT_PROTOCOL_SECRET;
  if (!measurementId || !apiSecret || !event.clientId) return false;
  const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: event.clientId, user_id: event.userId, events: [{ name: event.name, params: { ...event.params, event_id: event.eventId, engagement_time_msec: 1 } }] }),
  }).catch(() => null);
  return Boolean(response?.ok);
}
