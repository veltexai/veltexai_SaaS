/**
 * Client-side Meta Pixel helper.
 * Provides typed wrappers around `window.fbq` with event_id generation
 * for deduplication against server-side CAPI events.
 */

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function trackEvent(
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string
) {
  if (typeof window === 'undefined' || !window.fbq) return;

  const options = eventId ? { eventID: eventId } : undefined;
  window.fbq('track', eventName, params ?? {}, options);
}

export function trackInitiateCheckout(data: {
  planName: string;
  value: number;
  currency?: string;
  eventId?: string;
}) {
  const eventId = data.eventId ?? generateEventId();
  trackEvent(
    'InitiateCheckout',
    {
      content_name: data.planName,
      value: data.value,
      currency: data.currency ?? 'USD',
    },
    eventId
  );
  return eventId;
}

export function trackStartTrial(data: {
  planName: string;
  value: number;
  currency?: string;
  eventId?: string;
}) {
  const eventId = data.eventId ?? generateEventId();
  trackEvent(
    'StartTrial',
    {
      content_name: data.planName,
      value: data.value,
      currency: data.currency ?? 'USD',
      predicted_ltv: data.value,
    },
    eventId
  );
  return eventId;
}

export function trackPurchase(data: {
  planName: string;
  value: number;
  currency?: string;
  eventId?: string;
}) {
  const eventId = data.eventId ?? generateEventId();
  trackEvent(
    'Purchase',
    {
      content_name: data.planName,
      value: data.value,
      currency: data.currency ?? 'USD',
    },
    eventId
  );
  return eventId;
}
