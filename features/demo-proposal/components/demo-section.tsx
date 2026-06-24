import { cn } from "@/lib/utils/cn";
import type { DemoSection } from "../types/demo-proposal";

interface DemoSectionProps {
  section: DemoSection;
  index: number;
  variant?: "commercial" | "residential";
}

export function DemoSectionBlock({
  section,
  index,
  variant = "commercial",
}: DemoSectionProps) {
  const accentClass =
    variant === "commercial"
      ? "border-blue-600 text-blue-700"
      : "border-emerald-600 text-emerald-700";

  return (
    <section
      id={section.id}
      className="scroll-mt-24 border-b border-gray-100 pb-8 last:border-b-0"
    >
      <div className="flex items-start gap-3 mb-4">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
            variant === "commercial" ? "bg-blue-600" : "bg-emerald-600",
          )}
        >
          {index + 1}
        </span>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 pt-0.5">
          {section.title}
        </h3>
      </div>

      <p className="text-gray-600 leading-relaxed mb-4">{section.content}</p>

      {section.highlight && (
        <div
          className={cn(
            "rounded-lg border-l-4 bg-gray-50 px-4 py-3 mb-4 text-sm font-medium",
            accentClass,
          )}
        >
          {section.highlight}
        </div>
      )}

      {section.bullets && section.bullets.length > 0 && (
        <ul className="space-y-2">
          {section.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-2 text-sm text-gray-700"
            >
              <span
                className={cn(
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  variant === "commercial" ? "bg-blue-500" : "bg-emerald-500",
                )}
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
