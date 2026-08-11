import { InstantlyMetricsProvider } from "../src/instantly-provider";

describe("InstantlyMetricsProvider", () => {
  it("collects campaign and assigned-account evidence without exposing account identities", async () => {
    const fetchMock = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      let body: unknown;
      if (url.includes("/campaigns/analytics?")) body = [{ emails_sent_count: 8, bounced_count: 0, reply_count: 1, unsubscribed_count: 0 }];
      else if (url.includes("/campaigns/pilot")) body = { status: 1, daily_limit: 10, email_list: ["a@example.com", "b@example.com"] };
      else if (url.includes("/accounts/analytics/daily")) body = [];
      else body = { items: [{ email: "a@example.com", status: 1, stat_warmup_score: 99 }, { email: "b@example.com", status: 1, stat_warmup_score: 97 }] };
      return { ok: true, json: async () => body } as Response;
    });
    const result = await new InstantlyMetricsProvider("secret", fetchMock as typeof fetch).collect("pilot", "2026-08-11");
    expect(result).toEqual(expect.objectContaining({ sent: 8, bounced: 0, replies: 1, healthySendingAccounts: 2, minimumAccountHealth: 97, configuredDailyLimit: 10 }));
    expect(JSON.stringify(result)).not.toContain("example.com");
  });

  it("fails closed when assigned-account inventory is incomplete", async () => {
    const fetchMock = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const body = url.includes("/campaigns/analytics?") ? [{}] : url.includes("/campaigns/pilot") ? { status: 1, daily_limit: 1, email_list: ["missing@example.com"] } : url.includes("/accounts/analytics/daily") ? [] : { items: [] };
      return { ok: true, json: async () => body } as Response;
    });
    await expect(new InstantlyMetricsProvider("secret", fetchMock as typeof fetch).collect("pilot", "2026-08-11")).rejects.toThrow("inventory is incomplete");
  });
});
