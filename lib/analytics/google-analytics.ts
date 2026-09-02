declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}

export function trackGoogleEvent(
  eventName: string,
  params: Record<string, unknown> = {},
) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, params);
}
