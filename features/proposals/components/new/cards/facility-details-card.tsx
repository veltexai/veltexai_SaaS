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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ProposalFormData,
  ServiceType,
} from "@/lib/validations/proposal";
import { Building2 } from "lucide-react";
import {
  BUILDING_TYPE_OPTIONS,
  SPECIAL_AREAS_OPTIONS,
  EQUIPMENT_OPTIONS,
  ENVIRONMENTAL_CONCERNS,
  ACCESSIBILITY_OPTIONS,
  SERVICE_TYPE_FEATURES,
} from "../../../constants/facility-options";
import { CheckboxFieldGroup } from "../checkbox-field-group";

interface FacilityDetailsCardProps {
  serviceType: ServiceType;
}

export function FacilityDetailsCard({ serviceType }: FacilityDetailsCardProps) {
  const form = useFormContext<ProposalFormData>();
  const isResidential = serviceType === "residential";
  const { showFacilityDetails } = SERVICE_TYPE_FEATURES[serviceType];

  const buildingTypeOptions = BUILDING_TYPE_OPTIONS[serviceType];
  const specialAreasOptions = SPECIAL_AREAS_OPTIONS[serviceType];
  const equipmentOptions = EQUIPMENT_OPTIONS[serviceType];
  const environmentalConcerns = ENVIRONMENTAL_CONCERNS[serviceType];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>
            {isResidential ? "Property Information" : "Facility Information"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="facility_details.building_age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isResidential
                    ? "Home Age (years)"
                    : "Building Age (years)"}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder={
                      isResidential ? "Enter home age" : "Enter building age"
                    }
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
            name="facility_details.building_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isResidential ? "Property Type" : "Building Type"}
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          isResidential
                            ? "Select property type"
                            : "Select building type"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {buildingTypeOptions.map((option) => (
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

        {showFacilityDetails && (
          <CheckboxFieldGroup
            name="facility_details.accessibility_requirements"
            label="Accessibility Requirements"
            options={ACCESSIBILITY_OPTIONS}
            hasDivider
          />
        )}

        <CheckboxFieldGroup
          name="facility_details.special_areas"
          label="Areas Requiring Special Attention"
          description="Select areas that need extra care or have special requirements"
          options={specialAreasOptions}
          hasDivider
        />

        <CheckboxFieldGroup
          name="facility_details.equipment_present"
          label="Equipment Present"
          options={equipmentOptions}
          hasDivider
        />

        <CheckboxFieldGroup
          name="facility_details.environmental_concerns"
          label="Environmental Concerns"
          options={environmentalConcerns}
        />
      </CardContent>
    </Card>
  );
}
