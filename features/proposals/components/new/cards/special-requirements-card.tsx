"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  ProposalFormData,
  ServiceType,
} from "@/lib/validations/proposal";
import { AlertTriangle } from "lucide-react";
import {
  SPECIAL_EQUIPMENT_OPTIONS,
  CERTIFICATION_OPTIONS,
  INSURANCE_OPTIONS,
  SERVICE_TYPE_FEATURES,
} from "../../../constants/facility-options";
import { CheckboxFieldGroup } from "../checkbox-field-group";

interface SpecialRequirementsCardProps {
  serviceType: ServiceType;
}

export function SpecialRequirementsCard({
  serviceType,
}: SpecialRequirementsCardProps) {
  const form = useFormContext<ProposalFormData>();
  const { showFacilityDetails } = SERVICE_TYPE_FEATURES[serviceType];

  const specialEquipmentOptions = SPECIAL_EQUIPMENT_OPTIONS[serviceType];
  const certificationOptions = CERTIFICATION_OPTIONS[serviceType];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Special Requirements</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showFacilityDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="special_requirements.security_clearance"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Security Clearance Required</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="special_requirements.after_hours_access"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>After Hours Access Required</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
        )}

        <CheckboxFieldGroup
          name="special_requirements.special_equipment"
          label="Special Equipment Required"
          options={specialEquipmentOptions}
          hasDivider
        />

        <CheckboxFieldGroup
          name="special_requirements.certifications_required"
          label="Certifications Required"
          options={certificationOptions}
          hasDivider
        />

        <CheckboxFieldGroup
          name="special_requirements.insurance_requirements"
          label="Insurance Requirements"
          options={INSURANCE_OPTIONS}
        />
      </CardContent>
    </Card>
  );
}
