import type { PlacesCandidate, PlacesClient, PlacesPage } from "./types";

const FIELD_MASK = ["places.id", "places.displayName", "places.websiteUri", "places.googleMapsUri", "places.nationalPhoneNumber", "places.formattedAddress", "places.addressComponents", "places.primaryType", "places.types", "nextPageToken"].join(",");
export type GooglePlacesErrorKind = "timeout" | "rate_limit" | "transient" | "permanent" | "malformed" | "request_cap";
export class GooglePlacesError extends Error {
  constructor(public readonly kind: GooglePlacesErrorKind, message: string, public readonly status?: number, public readonly attempts?: number) {
    super(message); this.name = "GooglePlacesError";
  }
}
export interface GooglePlacesClientOptions {
  timeoutMs?: number; maxAttempts?: number; maxBackoffMs?: number; maxRequestsPerSearch?: number;
  sleep?: (ms: number) => Promise<void>;
}
function isCandidate(value: unknown): value is PlacesCandidate {
  if (!value || typeof value !== "object") return false;
  const item = value as PlacesCandidate;
  return typeof item.id === "string" && typeof item.displayName?.text === "string";
}
export class GooglePlacesTextSearchClient implements PlacesClient {
  private readonly options: Required<GooglePlacesClientOptions>;
  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch, options: GooglePlacesClientOptions = {}) {
    if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is required");
    this.options = { timeoutMs: options.timeoutMs ?? 8_000, maxAttempts: options.maxAttempts ?? 3, maxBackoffMs: options.maxBackoffMs ?? 1_000, maxRequestsPerSearch: options.maxRequestsPerSearch ?? 3, sleep: options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))) };
  }
  async searchText(query: string, pageToken?: string, requestBudget = this.options.maxRequestsPerSearch): Promise<PlacesPage> {
    let requestsUsed = 0;
    const allowedAttempts = Math.min(this.options.maxAttempts, this.options.maxRequestsPerSearch, requestBudget);
    if (allowedAttempts <= 0) throw new GooglePlacesError("request_cap", "Google Places request budget exhausted", undefined, 0);
    let lastError: GooglePlacesError | undefined;
    for (let attempt = 1; attempt <= allowedAttempts; attempt += 1) {
      requestsUsed += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
      try {
        const response = await this.fetchImpl("https://places.googleapis.com/v1/places:searchText", {
          method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": this.apiKey, "X-Goog-FieldMask": FIELD_MASK },
          body: JSON.stringify({ textQuery: query, pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
        });
        if (!response.ok) {
          const transient = response.status === 429 || response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504;
          const kind: GooglePlacesErrorKind = response.status === 429 ? "rate_limit" : transient ? "transient" : "permanent";
          const error = new GooglePlacesError(kind, `Google Places search failed (${response.status})`, response.status, attempt);
          if (!transient || attempt === allowedAttempts) throw error;
          lastError = error;
        } else {
          let payload: unknown;
          try { payload = await response.json(); } catch { throw new GooglePlacesError("malformed", "Google Places returned invalid JSON", response.status, attempt); }
          if (!payload || typeof payload !== "object" || ("places" in payload && !Array.isArray((payload as { places?: unknown }).places))) {
            throw new GooglePlacesError("malformed", "Google Places returned a malformed response", response.status, attempt);
          }
          const parsed = payload as { places?: unknown[]; nextPageToken?: unknown };
          const candidates = parsed.places ?? [];
          if (!candidates.every(isCandidate)) throw new GooglePlacesError("malformed", "Google Places returned a malformed candidate", response.status, attempt);
          const nextPageToken = parsed.nextPageToken;
          if (nextPageToken !== undefined && typeof nextPageToken !== "string") throw new GooglePlacesError("malformed", "Google Places returned an invalid page token", response.status, attempt);
          const validatedPageToken = typeof nextPageToken === "string" ? nextPageToken : null;
          return { candidates: candidates as PlacesCandidate[], nextPageToken: validatedPageToken, requestsUsed };
        }
      } catch (error) {
        if (error instanceof GooglePlacesError) {
          if (error.kind === "permanent" || error.kind === "malformed" || attempt === allowedAttempts) throw error;
          lastError = error;
        } else if (error instanceof Error && error.name === "AbortError") {
          lastError = new GooglePlacesError("timeout", "Google Places request timed out", undefined, attempt);
          if (attempt === allowedAttempts) throw lastError;
        } else {
          lastError = new GooglePlacesError("transient", error instanceof Error ? error.message : "Google Places network failure", undefined, attempt);
          if (attempt === allowedAttempts) throw lastError;
        }
      } finally { clearTimeout(timeout); }
      await this.options.sleep(Math.min(100 * 2 ** (attempt - 1), this.options.maxBackoffMs));
    }
    throw lastError ?? new GooglePlacesError("transient", "Google Places retry exhaustion");
  }
}
