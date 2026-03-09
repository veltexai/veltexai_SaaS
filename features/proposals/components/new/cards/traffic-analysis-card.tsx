"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProposalFormData } from "@/lib/validations/proposal";
import { Users } from "lucide-react";
import {
  VISITOR_FREQUENCY_OPTIONS,
  TRAFFIC_LEVEL_OPTIONS,
} from "../../../constants/facility-options";

export function TrafficAnalysisCard() {
  const form = useFormContext<ProposalFormData>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Traffic Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="traffic_analysis.staff_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Staff Count</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Number of staff"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={(e) => {
                      const value = e.target.value;
                      field.onChange(
                        value === "" ? undefined : parseInt(value, 10),
                      );
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="traffic_analysis.visitor_frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visitor Frequency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VISITOR_FREQUENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="traffic_analysis.traffic_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Traffic Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select traffic level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TRAFFIC_LEVEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="traffic_analysis.special_events"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Special Events or High-Traffic Periods
                </FormLabel>
                <p className="text-sm text-muted-foreground">
                  Check if the facility hosts special events that require
                  additional cleaning
                </p>
              </div>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
