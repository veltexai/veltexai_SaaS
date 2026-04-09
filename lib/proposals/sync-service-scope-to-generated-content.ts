import {
  getAreaFrequencyLabel,
  isOnDemandFrequency,
} from "@/features/proposals/constants/area-frequency";
import type { ProposalFormData } from "@/lib/validations/proposal";

type ServiceScope = ProposalFormData["service_scope"];
type PricingData = ProposalFormData["pricing_data"];

function getServiceFrequencyLabel(freq: string): string {
  const labels: Record<string, string> = {
    "one-time": "One-time",
    "1x-month": "Monthly",
    "bi-weekly": "Bi-weekly",
    weekly: "Weekly",
    "2x-week": "2x weekly",
    "3x-week": "3x weekly",
    "5x-week": "5x weekly",
    daily: "Daily",
  };
  return labels[freq] || freq;
}

function getVisitsPerMonth(freq: string): number {
  const map: Record<string, number> = {
    "one-time": 1,
    "1x-month": 1,
    "bi-weekly": 2.17,
    weekly: 4.33,
    "2x-week": 8.66,
    "3x-week": 13.0,
    "5x-week": 21.67,
    daily: 30,
  };
  return map[freq] ?? 1;
}

function formatMoney(n: number): string {
  return `$${(n ?? 0).toFixed(2)}`;
}

function computeScopeTableMoney(
  pricingData: PricingData | undefined,
  serviceFrequency: string,
): { tableCostPerVisit: string; tableMonthlyCost: string } {
  let tableCostPerVisit = "—";
  let tableMonthlyCost = "—";
  if (!pricingData) {
    return { tableCostPerVisit, tableMonthlyCost };
  }
  const pd = pricingData as Record<string, unknown>;
  const priceRange = pd.price_range as
    | { low?: number; high?: number }
    | undefined;
  if (priceRange) {
    const low = priceRange.low;
    const high = priceRange.high;
    let calculatedTotal = 0;
    if (typeof low === "number" && typeof high === "number") {
      calculatedTotal = (low + high) / 2;
    } else if (typeof low === "number") {
      calculatedTotal = low;
    } else if (typeof high === "number") {
      calculatedTotal = high;
    }
    if (calculatedTotal > 0) {
      tableMonthlyCost = formatMoney(calculatedTotal);
      const visits = getVisitsPerMonth(serviceFrequency);
      if (visits > 0) {
        tableCostPerVisit = formatMoney(calculatedTotal / visits);
      }
    }
  } else if (typeof pd.total === "number" && pd.total > 0) {
    tableMonthlyCost = formatMoney(pd.total);
    const visits = getVisitsPerMonth(serviceFrequency);
    if (visits > 0) {
      tableCostPerVisit = formatMoney(pd.total / visits);
    }
  }
  return { tableCostPerVisit, tableMonthlyCost };
}

function isBasicScopeRow(row: unknown): boolean {
  return (
    !!row &&
    typeof row === "object" &&
    ("costPerVisit" in (row as object) || "monthlyCost" in (row as object))
  );
}

function buildCostLookup(
  prevRows: unknown[],
): Map<string, { costPerVisit: unknown; monthlyCost: unknown }> {
  const map = new Map<string, { costPerVisit: unknown; monthlyCost: unknown }>();
  for (const r of prevRows) {
    const row = r as { area?: string; costPerVisit?: unknown; monthlyCost?: unknown };
    if (row?.area && typeof row.area === "string") {
      map.set(row.area.trim().toLowerCase(), {
        costPerVisit: row.costPerVisit ?? null,
        monthlyCost: row.monthlyCost ?? null,
      });
    }
  }
  return map;
}

function replaceFencedJsonBlock(
  markdown: string,
  fenceToken: string,
  buildNewJson: (previousJson: string) => string,
): string {
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (
      trimmed.startsWith("```") &&
      trimmed.toLowerCase().includes(fenceToken.toLowerCase())
    ) {
      out.push(lines[i]);
      i++;
      const jsonLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        jsonLines.push(lines[i]);
        i++;
      }
      const jsonText = jsonLines.join("\n");
      out.push(buildNewJson(jsonText));
      if (i < lines.length) {
        out.push(lines[i]);
        i++;
      }
      continue;
    }
    out.push(lines[i]);
    i++;
  }
  return out.join("\n");
}

/**
 * Keeps `generated_content` markdown in sync with structured `service_scope` after edits.
 * Proposal previews render scope from fenced `veliz_scope_table` JSON inside this field.
 */
/** Areas driving per-row scope: prefer explicit list; fall back to frequency_details keys (DB/UI drift). */
function resolveAreasInOrder(service_scope: ServiceScope): string[] {
  const fromList = service_scope?.areas_included;
  if (Array.isArray(fromList) && fromList.length > 0) {
    return fromList;
  }
  const keys = Object.keys(service_scope?.frequency_details || {});
  return keys.length > 0 ? keys : [];
}

export function syncServiceScopeIntoGeneratedContent(
  generatedContent: string,
  args: {
    service_scope: ServiceScope;
    service_frequency: string;
    pricing_data?: PricingData;
    /** Used when the markdown has no parsable scope table yet */
    fullMarkdownHint?: string;
  },
): string {
  const {
    service_scope,
    service_frequency,
    pricing_data,
    fullMarkdownHint = generatedContent,
  } = args;
  const money = computeScopeTableMoney(pricing_data, service_frequency);
  const areasInOrder = resolveAreasInOrder(service_scope);

  let result = replaceFencedJsonBlock(
    generatedContent,
    "veliz_scope_table",
    (previousJsonText) => {
      let previous: { rows?: unknown[] };
      try {
        previous = JSON.parse(previousJsonText) as { rows?: unknown[] };
      } catch {
        previous = { rows: [] };
      }
      const prevRows = Array.isArray(previous?.rows) ? previous.rows : [];
      const defaultPremiumStyle = fullMarkdownHint
        .toLowerCase()
        .includes("representative scope");
      const basicStyle =
        prevRows.some(isBasicScopeRow) ||
        (!prevRows.length && !defaultPremiumStyle);

      const costLookup = buildCostLookup(prevRows);

      const hasPerAreaFrequencies =
        !!service_scope?.frequency_details &&
        Object.keys(service_scope.frequency_details).length > 0;

      if (basicStyle) {
        const rows = hasPerAreaFrequencies
          ? areasInOrder.map((area: string) => {
              const rawFreq = service_scope.frequency_details?.[area];
              const freqKey =
                rawFreq == null ? "" : String(rawFreq);
              const frequency = freqKey
                ? getAreaFrequencyLabel(freqKey)
                : getServiceFrequencyLabel(service_frequency);
              const prev = costLookup.get(area.trim().toLowerCase());
              const onDemand = isOnDemandFrequency(freqKey);
              const noteRaw = service_scope.area_notes?.[area];
              const note =
                noteRaw == null || noteRaw === ""
                  ? null
                  : String(noteRaw);
              return {
                area,
                frequency,
                costPerVisit: onDemand
                  ? null
                  : (prev?.costPerVisit ?? money.tableCostPerVisit) || null,
                monthlyCost: onDemand
                  ? null
                  : (prev?.monthlyCost ?? money.tableMonthlyCost) || null,
                note,
              };
            })
          : [
              {
                area: areasInOrder.join(", ") || "—",
                frequency: getServiceFrequencyLabel(service_frequency),
                costPerVisit: money.tableCostPerVisit || null,
                monthlyCost: money.tableMonthlyCost || null,
                note: null,
              },
            ];
        return JSON.stringify({ rows });
      }

      const premiumScopeRows = areasInOrder.map((area: string) => ({
        area,
        frequency: hasPerAreaFrequencies
          ? getAreaFrequencyLabel(
              String(
                service_scope.frequency_details?.[area] ?? service_frequency,
              ),
            )
          : getServiceFrequencyLabel(service_frequency),
        note: (() => {
          const n = service_scope.area_notes?.[area];
          return n == null || n === "" ? null : String(n);
        })(),
      }));

      return JSON.stringify({ rows: premiumScopeRows });
    },
  );

  result = replaceFencedJsonBlock(result, "veliz_additional_services", () => {
    const additionalServicesRows = Array.isArray(service_scope?.special_services)
      ? (service_scope.special_services as string[]).map((s: string) => ({
          service: s,
          pricePerTime: null,
          pricePerMonth: null,
        }))
      : [];
    return JSON.stringify({ rows: additionalServicesRows });
  });

  return result;
}
