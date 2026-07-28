import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PropertyAssumptionsLite as PropertyAssumptionsLiteResult } from "../lib/property-assumptions-lite";
import { getScopeTemplate } from "../constants/scope-templates";

interface PropertyAssumptionsLiteProps {
  assumptions: PropertyAssumptionsLiteResult;
}

export function PropertyAssumptionsLite({
  assumptions,
}: PropertyAssumptionsLiteProps) {
  const recommendedTemplate = getScopeTemplate(
    assumptions.recommendedScopeTemplateId,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Property Assumptions Lite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium uppercase text-gray-500">
              Recommended Scope
            </p>
            <p className="mt-1 font-medium text-gray-900">
              {recommendedTemplate?.label ?? assumptions.recommendedScopeTemplateId}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium uppercase text-gray-500">
              Recommended Frequency
            </p>
            <p className="mt-1 font-medium text-gray-900">
              {assumptions.recommendedFrequency}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium uppercase text-gray-500">
              Restrooms
            </p>
            <p className="mt-1 font-medium text-gray-900">
              {assumptions.restroomCount}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium uppercase text-gray-500">
              Breakrooms
            </p>
            <p className="mt-1 font-medium text-gray-900">
              {assumptions.breakroomCount}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 font-medium text-gray-900">
            <Lightbulb className="h-4 w-4" />
            Traffic Guidance
          </div>
          <p className="text-gray-600">{assumptions.trafficGuidance}</p>
        </div>

        <div>
          <p className="mb-2 font-medium text-gray-900">Common Add-Ons</p>
          <div className="flex flex-wrap gap-2">
            {assumptions.commonAddOns.map((addOn) => (
              <Badge key={addOn} variant="outline">
                {addOn}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 font-medium text-gray-900">Assumptions</p>
          <ul className="list-disc space-y-1 pl-5 text-gray-600">
            {assumptions.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>

        {assumptions.warnings.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 font-medium text-gray-900">
              <AlertTriangle className="h-4 w-4" />
              Warnings to Confirm
            </div>
            <ul className="list-disc space-y-1 pl-5 text-gray-600">
              {assumptions.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
