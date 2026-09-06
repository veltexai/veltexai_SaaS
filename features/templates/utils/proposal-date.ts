interface ProposalDateSource {
  created_at: string;
  global_inputs?: unknown;
}

export interface ProposalDateMetadata {
  proposal_date: string;
  proposal_timezone?: string;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function localDateParts(date: Date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function createLocalProposalDateMetadata(
  date = new Date(),
): ProposalDateMetadata {
  const { year, month, day } = localDateParts(date);
  let proposal_timezone: string | undefined;
  try {
    proposal_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    proposal_timezone = undefined;
  }
  return {
    proposal_date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    ...(proposal_timezone ? { proposal_timezone } : {}),
  };
}

function resolveParts(source: ProposalDateSource) {
  const stored = readRecord(source.global_inputs).proposal_date;
  if (typeof stored === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stored);
    if (match) {
      return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    }
  }

  const date = new Date(source.created_at);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function formatProposalDateShort(source: ProposalDateSource): string {
  const parts = resolveParts(source);
  if (!parts) return "—";
  return `${String(parts.month).padStart(2, "0")}/${String(parts.day).padStart(2, "0")}/${String(parts.year).slice(-2)}`;
}

export function formatProposalDateLong(source: ProposalDateSource): string {
  const parts = resolveParts(source);
  if (!parts) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}
