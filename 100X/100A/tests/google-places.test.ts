import { GooglePlacesError, GooglePlacesTextSearchClient } from "../src/google-places";

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const place = { id: "place-1", displayName: { text: "Commercial Cleaning One" } };
describe("bounded Google Places adapter", () => {
  it("handles successful, empty, and paginated responses", async () => {
    await expect(new GooglePlacesTextSearchClient("key", async () => ok({ places: [place], nextPageToken: "next" }), { sleep: async () => {} }).searchText("query")).resolves.toMatchObject({ candidates: [place], nextPageToken: "next", requestsUsed: 1 });
    await expect(new GooglePlacesTextSearchClient("key", async () => ok({}), { sleep: async () => {} }).searchText("query")).resolves.toEqual({ candidates: [], nextPageToken: null, requestsUsed: 1 });
  });
  it.each([400,401,403])("does not retry permanent HTTP %s", async (status) => {
    const fetcher = jest.fn(async () => ok({}, status));
    await expect(new GooglePlacesTextSearchClient("key", fetcher, { sleep: async () => {} }).searchText("query")).rejects.toMatchObject({ kind: "permanent", status });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([429,500,503])("retries transient HTTP %s with bounded exhaustion", async (status) => {
    const fetcher = jest.fn(async () => ok({}, status));
    await expect(new GooglePlacesTextSearchClient("key", fetcher, { maxAttempts: 3, maxRequestsPerSearch: 3, sleep: async () => {} }).searchText("query")).rejects.toBeInstanceOf(GooglePlacesError);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("recovers from a transient response", async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(ok({}, 503)).mockResolvedValueOnce(ok({ places: [place] }));
    await expect(new GooglePlacesTextSearchClient("key", fetcher, { sleep: async () => {} }).searchText("query")).resolves.toMatchObject({ requestsUsed: 2 });
  });
  it("rejects malformed JSON, shapes, candidates, and page tokens", async () => {
    const invalidJson = new Response("{", { status: 200 });
    await expect(new GooglePlacesTextSearchClient("key", async () => invalidJson).searchText("query")).rejects.toMatchObject({ kind: "malformed" });
    for (const body of [{ places: {} }, { places: [{}] }, { places: [place], nextPageToken: 4 }]) {
      await expect(new GooglePlacesTextSearchClient("key", async () => ok(body)).searchText("query")).rejects.toMatchObject({ kind: "malformed" });
    }
  });
  it("bounds request timeouts and retries", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    const fetcher = jest.fn(async () => { throw abort; });
    await expect(new GooglePlacesTextSearchClient("key", fetcher, { maxAttempts: 2, maxRequestsPerSearch: 2, timeoutMs: 1, sleep: async () => {} }).searchText("query")).rejects.toMatchObject({ kind: "timeout", attempts: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("applies its defensive maximum to each search call, not the client lifetime", async () => {
    const fetcher = jest.fn(async () => ok({}, 503));
    const client = new GooglePlacesTextSearchClient("key", fetcher, { maxAttempts: 3, maxRequestsPerSearch: 1, sleep: async () => {} });
    await expect(client.searchText("one", undefined, 6)).rejects.toMatchObject({ attempts: 1 });
    await expect(client.searchText("two", undefined, 6)).rejects.toMatchObject({ attempts: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("cannot retry beyond the runner-provided remaining request budget", async () => {
    const fetcher = jest.fn(async () => ok({}, 503));
    await expect(new GooglePlacesTextSearchClient("key", fetcher, { maxAttempts: 3, maxRequestsPerSearch: 3, sleep: async () => {} }).searchText("query", undefined, 1)).rejects.toMatchObject({ kind: "transient", attempts: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
