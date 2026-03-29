"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServiceType } from "@/lib/validations/proposal";
import { AREA_FREQUENCY_OPTIONS } from "@/features/proposals/constants/area-frequency";
import { Clock, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AREAS_INCLUDED_OPTIONS,
  DEFAULT_AREA_FREQUENCY,
} from "../../../constants/facility-options";
import { useAreaFrequency } from "../../../hooks/use-area-frequency";

interface ServiceScopeCardProps {
  serviceType: ServiceType;
}

export function ServiceScopeCard({ serviceType }: ServiceScopeCardProps) {
  const areasIncludedOptions = AREAS_INCLUDED_OPTIONS[serviceType];
  const {
    areasIncluded,
    frequencyDetails,
    areaNotes,
    handleToggleArea,
    handleAreaFrequencyChange,
    handleAreaNoteChange,
    handleRemoveArea,
    handleAddCustomArea,
    setShowCustomAreaInput,
    setCustomAreaInput,
    showCustomAreaInput,
    customAreaInput,
    handleSelectAll,
    handleClearAll,
  } = useAreaFrequency();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Service Scope</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div>
            <FormLabel>Areas Included in Service</FormLabel>
            <p className="text-xs text-muted-foreground mt-1">
              Select areas and assign a cleaning frequency for each
            </p>
          </div>

          <div className="flex gap-2 w-full justify-center">
            <button
              type="button"
              onClick={() => handleSelectAll(areasIncludedOptions)}
              className="flex-1 px-3 py-2 text-xs font-medium rounded-md border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => handleClearAll(areasIncludedOptions)}
              className="flex-1 px-3 py-2 text-xs font-medium rounded-md border border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {areasIncludedOptions.map((area) => {
              const isSelected = areasIncluded.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`Toggle area: ${area}`}
                  onClick={() => handleToggleArea(area)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full border transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border",
                  )}
                >
                  {area}
                </button>
              );
            })}
          </div>

          {areasIncluded.length > 0 && (
            <div className="space-y-2">
              {areasIncluded.map((area) => (
                <div
                  key={area}
                  className="flex flex-col gap-2 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm font-medium">{area}</span>
                    <Select
                      value={frequencyDetails[area] ?? DEFAULT_AREA_FREQUENCY}
                      onValueChange={(value) =>
                        handleAreaFrequencyChange(area, value)
                      }
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AREA_FREQUENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveArea(area)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Add notes for this area (e.g. Disinfect fixtures, replenish supplies)"
                    value={areaNotes[area] ?? ""}
                    onChange={(e) => handleAreaNoteChange(area, e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              ))}
            </div>
          )}

          {showCustomAreaInput ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter area name"
                value={customAreaInput}
                onChange={(e) => setCustomAreaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomArea();
                  }
                }}
                className="flex-1"
                autoFocus
              />
              <Button type="button" size="sm" onClick={handleAddCustomArea}>
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCustomAreaInput(false);
                  setCustomAreaInput("");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCustomAreaInput(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Area
            </Button>
          )}
        </div>

        <FormField
          name="service_scope.areas_excluded"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Areas Excluded</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="List areas that should be excluded from cleaning"
                  className="min-h-[80px]"
                  value={field.value?.join("\n") || ""}
                  onChange={(e) => {
                    const lines = e.target.value
                      .split("\n")
                      .filter((line: string) => line.trim());
                    field.onChange(lines);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
