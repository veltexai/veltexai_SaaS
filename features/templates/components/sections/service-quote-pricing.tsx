import React from "react";
import { TemplateType } from "@/features/templates/types/templates";
import { dmSerifText } from "@/lib/fonts";
import ProposalTitle from "../shared/proposal-title";
import { cn } from "@/lib/utils";
import {
  isOneTimeFrequency,
  isStandardJanitorialService,
} from "@/lib/recurring-monthly-functions";
import { FrequencyLabel } from "./frequency-label";

interface ServiceQuotePricingProps {
  title: string;
  content: string;
  description?: string | null;
  templateType: TemplateType;
  className?: string;
}

type PricingRow = {
  service: string;
  frequency: string;
  pricePerMonth: string;
};

type PricingData = {
  rows: PricingRow[];
  summary?: {
    subtotal?: string;
    tax?: string;
    total?: string;
  };
};

export default function ServiceQuotePricing({
  title,
  content,
  description,
  templateType,
  className = "",
}: ServiceQuotePricingProps) {
  const lines = (content ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let data: PricingData | null = null;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (
      ln.startsWith("```") &&
      ln.toLowerCase().includes("veliz_pricing_table")
    ) {
      const jsonLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        jsonLines.push(lines[i]);
        i++;
      }
      const jsonText = jsonLines.join("\n");
      try {
        data = JSON.parse(jsonText);
      } catch {}
      break;
    }
  }

  const parseInline = (text: string) => {
    const parts: React.ReactNode[] = [];
    let idx = 0;
    const re = /(\*\*|__)(.*?)\1/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > idx) parts.push(text.slice(idx, m.index));
      parts.push(
        <strong key={`b-${m.index}`} className="font-semibold text-gray-900">
          {m[2]}
        </strong>,
      );
      idx = m.index + m[0].length;
    }
    if (idx < text.length) parts.push(text.slice(idx));
    return parts.length ? parts : text;
  };

  return (
    <div>
      <ProposalTitle templateType={templateType} title={title} />
      <div className={cn("sm:mt-20 mt-10", className)}>
        {description ? (
          <p className="text-sm text-[#383838] mb-6 leading-relaxed mt-4">
            {parseInline(description)}
          </p>
        ) : null}
        {data ? (
          <div className="sm:mb-10 mb-4">
            <div className="sm:text-base text-xs text-center grid grid-cols-4 text-[var(--color-primary)] gap-4 sm:px-5 px-2 mb-2">
              <div className="font-semibold col-span-2">Service</div>
              <div className="font-semibold">Frequency</div>
              <div className="font-semibold">Price/month</div>
            </div>
            {data.rows.map((row, i) => (
              <div
                key={`pr-${i}`}
                className={cn(
                  templateType !== "luxury_elite"
                    ? "rounded-xl sm:px-5 px-2 sm:py-4 py-2 mb-2"
                    : "px-5 py-4 mb-2",
                  templateType === "modern_corporate"
                    ? i % 2 === 0
                      ? "bg-[var(--color-primary)]/8 text-[#383838] drop-shadow-sm"
                      : "bg-[var(--color-primary)]/3 text-[#383838] drop-shadow-sm"
                    : templateType === "luxury_elite"
                      ? i % 2 === 0
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-primary)]/70 text-white"
                      : "bg-[var(--color-primary)] text-white",
                )}
              >
                <div className="grid grid-cols-4 gap-4 sm:text-sm text-2xs items-center text-center">
                  <div
                    className={`font-bold whitespace-pre-line col-span-2 ${
                      templateType === "modern_corporate"
                        ? "text-[var(--color-primary)]"
                        : "text-white"
                    }`}
                  >
                    {row.service}
                  </div>
                  <div className="capitalize">
                    {isStandardJanitorialService(row.service) ? (
                      <FrequencyLabel frequency={row.frequency} />
                    ) : row.frequency === "annual" ? (
                      "Annual Service"
                    ) : row.frequency === "one_time" ? (
                      "One time"
                    ) : (
                      row.frequency
                    )}
                  </div>
                  <div className="font-semibold">{row.pricePerMonth}</div>
                </div>
              </div>
            ))}
            {data.summary ? (
              <div className="mt-1 sm:text-sm text-xs">
                <div className="grid grid-cols-3 items-center">
                  <div></div>
                  <div className="text-right font-semibold text-[var(--color-primary)] sm:pr-4 pr-2">
                    Sub-total
                  </div>
                  <div
                    className={`${
                      templateType !== "luxury_elite" ? "rounded-xl" : ""
                    }  sm:px-5 px-3 sm:py-3 py-2 text-center font-semibold ${
                      templateType === "modern_corporate"
                        ? "bg-[var(--color-primary)]/6  text-[#383838]"
                        : "bg-[var(--color-primary)] text-white"
                    }`}
                  >
                    {data.summary.subtotal ?? "$0.00"}
                  </div>
                </div>
                <div className="grid grid-cols-3 mt-1 items-center">
                  <div></div>
                  <div className="text-right font-semibold text-[var(--color-primary)] sm:pr-4 pr-2">
                    Tax
                  </div>
                  <div
                    className={`${
                      templateType !== "luxury_elite" ? "rounded-xl" : ""
                    }  sm:px-5 px-3 sm:py-3 py-2 text-center font-semibold ${
                      templateType === "modern_corporate"
                        ? "bg-[var(--color-primary)]/6 text-[#383838]"
                        : "bg-[var(--color-primary)] text-white"
                    }`}
                  >
                    {data.summary.tax ?? "$0.00"}
                  </div>
                </div>
                <div className="grid grid-cols-3 mt-1 items-center">
                  {/* <div></div> */}
                  <div className="col-span-2 text-right font-semibold text-[var(--color-primary)] sm:pr-4 pr-2">
                    Total Monthly Investment:
                  </div>
                  <div
                    className={`${
                      templateType !== "luxury_elite" ? "rounded-xl" : ""
                    } sm:text-base font-bold border-2 border-[var(--color-primary)] text-[var(--color-primary)] sm:px-5 px-3 sm:py-3 py-2 text-center`}
                  >
                    {data.summary.total ?? "$0.00"}
                  </div>
                </div>
                <p className="text-xs mt-10">
                  <span className="font-semibold">Agreement Term: </span>12
                  Months
                </p>
                <p className="text-xs">
                  <span className="font-semibold">Billing Terms: </span>Net 30
                </p>
                <p className="text-xs mt-10">
                  This investment reflects the full scope of services outlined
                  above, including supervision, documented inspections,
                  compliance oversight, and account management.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
