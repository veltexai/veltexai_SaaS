export const FIRST_TOUCH_COOKIE = "veltex_first_touch";
export const LAST_TOUCH_COOKIE = "veltex_last_touch";
export const ATTRIBUTION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export interface MarketingAttribution {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  landingPath: string;
  referrer: string;
  capturedAt: string;
}

const clean = (value: string | null, max = 160) => (value ?? "").trim().slice(0, max);
export function attributionFromUrl(url: URL, referrer = "", now = new Date()): MarketingAttribution | null {
  const source = clean(url.searchParams.get("utm_source"), 80);
  const medium = clean(url.searchParams.get("utm_medium"), 80);
  const campaign = clean(url.searchParams.get("utm_campaign"), 120);
  const content = clean(url.searchParams.get("utm_content"), 160);
  const term = clean(url.searchParams.get("utm_term"), 120);
  if (![source, medium, campaign, content, term].some(Boolean)) return null;
  return { source, medium, campaign, content, term, landingPath: clean(`${url.pathname}${url.search}`, 500), referrer: clean(referrer, 500), capturedAt: now.toISOString() };
}
export function serializeAttribution(value: MarketingAttribution): string { const params = new URLSearchParams(); Object.entries(value).forEach(([key, item]) => params.set(key, item)); return params.toString(); }
export function parseAttribution(value: string | undefined): MarketingAttribution | null { if (!value) return null; try { const params = new URLSearchParams(value); const capturedAt = clean(params.get("capturedAt"), 40); if (!capturedAt || Number.isNaN(Date.parse(capturedAt))) return null; return { source: clean(params.get("source"), 80), medium: clean(params.get("medium"), 80), campaign: clean(params.get("campaign"), 120), content: clean(params.get("content"), 160), term: clean(params.get("term"), 120), landingPath: clean(params.get("landingPath"), 500), referrer: clean(params.get("referrer"), 500), capturedAt }; } catch { return null; } }
