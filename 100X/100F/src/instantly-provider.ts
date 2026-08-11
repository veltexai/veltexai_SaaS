import type { DailyRampMetrics, RampMetricsProvider, RampProvider } from "./types";

const numberValue = (value: unknown, fallback = 0): number => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const objectValue = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};

export class InstantlyRampProvider implements RampProvider {
  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch) {}

  private async request(path: string, init: RequestInit): Promise<void> {
    const response = await this.fetchImpl(`https://api.instantly.ai/api/v2${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    if (!response.ok) throw new Error(`Instantly ramp mutation failed (${response.status})`);
  }

  async setDailyLimit(campaignId: string, dailyLimit: number): Promise<void> {
    await this.request(`/campaigns/${encodeURIComponent(campaignId)}`, {
      method: "PATCH",
      body: JSON.stringify({ daily_limit: dailyLimit, daily_max_leads: dailyLimit, stop_on_reply: true, insert_unsubscribe_header: true, disable_bounce_protect: false }),
    });
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    await this.request(`/campaigns/${encodeURIComponent(campaignId)}/pause`, { method: "POST" });
  }
}

export class InstantlyMetricsProvider implements RampMetricsProvider {
  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch, private readonly timeoutMs = 10_000) {}

  private async json(path: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`https://api.instantly.ai/api/v2${path}`, { headers: { Authorization: `Bearer ${this.apiKey}` }, signal: controller.signal });
      if (!response.ok) {
        const endpoint = path.split("?", 1)[0];
        throw new Error(`Instantly metrics read failed (${response.status}) at ${endpoint}`);
      }
      return response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async collect(campaignId: string, date: string): Promise<Omit<DailyRampMetrics, "spamComplaints" | "webhookFailures">> {
    const id = encodeURIComponent(campaignId);
    const campaignRaw = await this.json(`/campaigns/${id}`);
    const analyticsRaw = await this.json(`/campaigns/analytics?id=${id}&start_date=${date}&end_date=${date}&exclude_total_leads_count=true`);
    const campaign = objectValue(campaignRaw);
    const analyticsItems = Array.isArray(analyticsRaw) ? analyticsRaw : [];
    const analytics = objectValue(analyticsItems[0]);
    const emails = Array.isArray(campaign.email_list) ? campaign.email_list.filter((v): v is string => typeof v === "string" && Boolean(v)) : [];
    if (emails.length === 0) throw new Error("Instantly campaign has no sending accounts");
    const query = new URLSearchParams({ start_date: date, end_date: date });
    for (const email of emails) query.append("emails", email);
    const accountAnalyticsRaw = await this.json(`/accounts/analytics/daily?${query.toString()}`);
    const accountAnalytics = Array.isArray(accountAnalyticsRaw) ? accountAnalyticsRaw.map(objectValue) : [];

    const accountsRaw = await this.json(`/accounts?limit=100`);
    const accountItems = Array.isArray(objectValue(accountsRaw).items) ? objectValue(accountsRaw).items as unknown[] : [];
    const assigned = accountItems.map(objectValue).filter((account) => typeof account.email === "string" && emails.includes(account.email));
    if (assigned.length !== emails.length) throw new Error("Instantly account inventory is incomplete");
    const healthy = assigned.filter((account) => numberValue(account.status, -1) === 1);
    const minimumHealth = Math.min(...assigned.map((account) => numberValue(account.stat_warmup_score, 0)));

    return {
      date, campaignId,
      campaignStatus: numberValue(campaign.status, -99),
      configuredDailyLimit: numberValue(campaign.daily_limit),
      sent: numberValue(analytics.emails_sent_count, accountAnalytics.reduce((sum, row) => sum + numberValue(row.sent), 0)),
      bounced: numberValue(analytics.bounced_count, accountAnalytics.reduce((sum, row) => sum + numberValue(row.bounced), 0)),
      replies: numberValue(analytics.reply_count, accountAnalytics.reduce((sum, row) => sum + numberValue(row.replies), 0)),
      unsubscribes: numberValue(analytics.unsubscribed_count),
      healthySendingAccounts: healthy.length,
      minimumAccountHealth: minimumHealth,
    };
  }
}
