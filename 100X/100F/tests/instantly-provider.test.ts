import { InstantlyRampProvider } from "../src/instantly-provider";

describe("100F Instantly provider", () => {
  it("applies a bounded campaign limit with safety flags", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response("{}", { status: 200 });
    };
    const provider = new InstantlyRampProvider("secret", fakeFetch as typeof fetch);
    await provider.setDailyLimit("campaign", 25);
    expect(calls[0].url).toBe("https://api.instantly.ai/api/v2/campaigns/campaign");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ daily_limit: 25, daily_max_leads: 25, stop_on_reply: true, insert_unsubscribe_header: true, disable_bounce_protect: false });
  });

  it("uses the dedicated pause endpoint", async () => {
    const urls: string[] = [];
    const provider = new InstantlyRampProvider("secret", (async (url: string | URL | Request) => { urls.push(String(url)); return new Response("{}", { status: 200 }); }) as typeof fetch);
    await provider.pauseCampaign("campaign");
    expect(urls).toEqual(["https://api.instantly.ai/api/v2/campaigns/campaign/pause"]);
  });
});
