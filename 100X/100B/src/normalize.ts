import type { NormalizedContact, Provider, ProviderContactCandidate, RoleCategory, VerificationStatus } from "./types";
import { ROLE_RANK } from "./types";

function clean(value?: string | null): string | null {
  const result = value?.trim().replace(/\s+/g, " ");
  return result ? result : null;
}

// Conservative RFC-ish email syntax check (single @, no spaces, a dotted domain).
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
export function normalizeEmail(email: string | null): { normalizedEmail: string | null; emailValid: boolean } {
  const raw = clean(email);
  if (!raw) return { normalizedEmail: null, emailValid: false };
  const lowered = raw.toLowerCase();
  return { normalizedEmail: lowered, emailValid: EMAIL_RE.test(lowered) };
}

const GENERIC_LOCALS = new Set([
  "info", "office", "admin", "contact", "contactus", "sales", "hello", "support",
  "hr", "jobs", "careers", "team", "enquiries", "inquiries", "mail", "general", "help", "service",
]);
export function isGenericMailbox(normalizedEmail: string | null): boolean {
  if (!normalizedEmail) return false;
  const local = normalizedEmail.split("@")[0]?.replace(/[+.].*$/, "");
  return local ? GENERIC_LOCALS.has(local) : false;
}

// Ordered strongest-first so the first match wins.
const ROLE_PATTERNS: Array<[RoleCategory, RegExp]> = [
  ["owner", /\bowner\b/i],
  ["founder", /\b(?:co[-\s]?founder|founder)\b/i],
  ["chief_executive", /\b(?:chief executive|ceo)\b/i],
  ["president", /\bpresident\b/i],
  ["general_manager", /\b(?:general manager|gm)\b/i],
  ["operations", /\b(?:chief operating|coo|vp of operations|director of operations|head of operations|operations manager|operations)\b/i],
  ["sales_bd", /\b(?:chief revenue|cro|business development|bus\.? dev|sales|revenue)\b/i],
  ["estimator", /\bestimator\b/i],
  ["office_manager", /\boffice manager\b/i],
];
export function classifyRole(title: string | null, genericMailbox: boolean, hasPersonName: boolean): RoleCategory {
  const t = title ?? "";
  for (const [role, re] of ROLE_PATTERNS) {
    // "president" must not match "vice president" as a top-tier president.
    if (role === "president" && /\bvice president|\bvp\b/i.test(t) && !/\bpresident\b(?!.*vice)/i.test(t)) continue;
    if (re.test(t)) return role;
  }
  if (genericMailbox && !hasPersonName) return "generic_mailbox";
  return "other";
}

// Map a provider's verification string onto the canonical set.
export function mapVerificationStatus(providerStatus: string | null): VerificationStatus {
  const s = (providerStatus ?? "").trim().toLowerCase();
  if (["verified", "valid", "deliverable", "safe", "ok"].includes(s)) return "verified";
  if (["accept_all", "accept-all", "catch_all", "catch-all"].includes(s)) return "accept_all";
  if (["unknown", "risky", "unverifiable"].includes(s)) return "unknown";
  if (["invalid", "undeliverable", "bounced", "hard_bounce", "disposable"].includes(s)) return "invalid";
  return "unverified";
}

export function normalizeContact(candidate: ProviderContactCandidate, provider: Provider): NormalizedContact {
  const providerRecordId = clean(candidate.providerRecordId);
  if (!providerRecordId) throw new Error("provider contact requires a providerRecordId");
  const firstName = clean(candidate.firstName);
  const lastName = clean(candidate.lastName);
  const fullName = clean(candidate.fullName) ?? clean([firstName, lastName].filter(Boolean).join(" "));
  const title = clean(candidate.title);
  const { normalizedEmail, emailValid } = normalizeEmail(candidate.email ?? null);
  const generic = isGenericMailbox(normalizedEmail);
  const roleCategory = classifyRole(title, generic, Boolean(fullName));
  return {
    firstName, lastName, fullName, title,
    roleCategory, roleRank: ROLE_RANK[roleCategory], isGenericMailbox: generic,
    email: clean(candidate.email), normalizedEmail, emailValid,
    phone: clean(candidate.phone), linkedinUrl: clean(candidate.linkedinUrl),
    provider, providerRecordId,
    providerVerificationStatus: clean(candidate.providerVerificationStatus),
    verificationStatus: mapVerificationStatus(candidate.providerVerificationStatus ?? null),
    providerMetadata: candidate.providerMetadata ?? null,
  };
}
