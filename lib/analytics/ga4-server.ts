interface GA4ServerEvent { clientId: string | null; sessionId?: string | null; userId?: string; name: "sign_up" | "start_trial" | "purchase"; eventId: string; params?: Record<string, string | number | boolean> }
export function gaClientIdFromCookie(cookie: string | undefined): string | null { if (!cookie) return null; const match = cookie.match(/^GA\d+\.\d+\.(\d+\.\d+)$/); return match?.[1] ?? null; }
export function gaSessionIdFromCookies(cookies: Array<{ name: string; value: string }>): string | null {
  for (const cookie of cookies) {
    if (!cookie.name.startsWith("_ga_")) continue;
    const legacy = cookie.value.match(/^GS\d+\.\d+\.(\d+)/);
    if (legacy?.[1]) return legacy[1];
    const current = cookie.value.match(/(?:^|[.$])s(\d+)(?:\$|$)/);
    if (current?.[1]) return current[1];
  }
  return null;
}
export async function sendGA4ServerEvent(event: GA4ServerEvent): Promise<boolean> {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_MEASUREMENT_PROTOCOL_SECRET;
  if (!measurementId || !apiSecret || !event.clientId) return false;
  const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: event.clientId, user_id: event.userId, events: [{ name: event.name, params: { ...event.params, event_id: event.eventId, ...(event.sessionId ? { session_id: event.sessionId } : {}), engagement_time_msec: 1 } }] }),
  }).catch(() => null);
  return Boolean(response?.ok);
}
