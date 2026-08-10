import { classifyEvent } from "../src/event-classification";
import { validateAndNormalizeInstantlyEvent } from "../src/normalize-event";
import { computeEventFingerprint } from "../src/fingerprint";
import { normalizeEmail } from "../src/normalize";
import { INSTANTLY_EVENT_TYPES } from "../src/types";

const NOW = new Date("2026-08-10T00:00:00.000Z");
const base = {
  workspace: "698b2090-f4d5-484b-a0b1-44016fee7515",
  campaign_id: "c01e55de-f1c8-4a0c-9817-13fe7456ab66",
  lead_email: "Dir@BuildingCleaningNW.example",
  timestamp: "2026-08-10T00:01:00.000Z",
};

describe("100D event classification", () => {
  it("classifies every supported Instantly event without throwing", () => {
    for (const t of INSTANTLY_EVENT_TYPES) {
      const c = classifyEvent(t);
      expect(["delivery", "reply", "meeting", "suppression", "operational", "unknown"]).toContain(c.category);
    }
  });
  it("only bounce/unsubscribe/complaint/DNC suppress", () => {
    expect(classifyEvent("email_bounced")).toMatchObject({ suppresses: true, suppressionKind: "hard_bounce" });
    expect(classifyEvent("lead_unsubscribed")).toMatchObject({ suppresses: true, suppressionKind: "unsubscribed" });
    expect(classifyEvent("spam_complaint")).toMatchObject({ suppresses: true, suppressionKind: "spam_complaint" });
    expect(classifyEvent("do_not_contact")).toMatchObject({ suppresses: true, suppressionKind: "do_not_contact" });
  });
  it("opens, clicks, and replies never suppress", () => {
    for (const t of ["email_opened", "email_link_clicked", "reply_received", "auto_reply_received", "lead_interested"]) {
      expect(classifyEvent(t).suppresses).toBe(false);
    }
  });
  it("unknown/custom events fail safe (unknown, never suppress)", () => {
    expect(classifyEvent("some_custom_label")).toMatchObject({ category: "unknown", suppresses: false, suppressionKind: null });
  });
});

describe("100D normalization", () => {
  it("normalizes email case + rejects malformed", () => {
    expect(normalizeEmail("Dir@BuildingCleaningNW.example")).toBe("dir@buildingcleaningnw.example");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
  });
  it("requires a valid timestamp", () => {
    expect(validateAndNormalizeInstantlyEvent({ ...base, event_type: "email_sent", timestamp: null }, "cfg", NOW).ok).toBe(false);
    expect(validateAndNormalizeInstantlyEvent({ ...base, event_type: "email_sent", timestamp: "not-a-date" }, "cfg", NOW).ok).toBe(false);
  });
  it("requires a lead email for lead-scoped events but not for campaign_completed", () => {
    expect(validateAndNormalizeInstantlyEvent({ ...base, event_type: "email_sent", lead_email: null }, "cfg", NOW).ok).toBe(false);
    expect(validateAndNormalizeInstantlyEvent({ ...base, event_type: "campaign_completed", lead_email: null }, "cfg", NOW).ok).toBe(true);
  });
  it("classifies an unknown event as unknown without suppressing", () => {
    const r = validateAndNormalizeInstantlyEvent({ ...base, event_type: "mystery" }, "cfg", NOW);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.event.eventType).toBe("unknown"); expect(r.event.suppresses).toBe(false); }
  });
  it("never persists raw email or reply bodies in the normalized event", () => {
    const r = validateAndNormalizeInstantlyEvent(
      { ...base, event_type: "reply_received", reply_text: "SECRET REPLY", reply_html: "<b>secret</b>", reply_subject: "re: hi", unibox_url: "https://app/x" } as never,
      "cfg", NOW,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const json = JSON.stringify(r.event);
      expect(json).not.toContain("SECRET REPLY");
      expect(json).not.toContain("secret");
      expect(json).not.toContain("re: hi");
      expect(json).not.toContain("unibox");
      // raw email is not stored; only normalizedEmail (for matching) is present
      expect(r.event.providerMetadata).not.toHaveProperty("reply_text");
    }
  });
});

describe("100D deterministic fingerprint", () => {
  const fp = (over: Record<string, unknown> = {}) => computeEventFingerprint({
    provider: "instantly", workspace: base.workspace, campaignId: base.campaign_id,
    eventType: "email_sent", leadEmail: base.lead_email, timestamp: base.timestamp, ...over,
  });
  it("is deterministic for identical input (replay -> same id)", () => {
    expect(fp()).toBe(fp());
  });
  it("differs for distinct legitimate events", () => {
    expect(fp({ eventType: "email_opened" })).not.toBe(fp());
    expect(fp({ timestamp: "2026-08-10T00:02:00.000Z" })).not.toBe(fp());
    expect(fp({ step: 2 })).not.toBe(fp({ step: 1 }));
  });
  it("is stable under email case/whitespace normalization", () => {
    expect(fp({ leadEmail: "  DIR@BuildingCleaningNW.example " })).toBe(fp());
  });
  it("contains no raw email (only a versioned hash)", () => {
    const id = fp();
    expect(id.startsWith("100D-fpv1:")).toBe(true);
    expect(id.toLowerCase()).not.toContain("buildingcleaningnw");
    expect(id).not.toContain("@");
  });
});
