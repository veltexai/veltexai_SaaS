"use client";

import type { ServiceType } from "@/lib/validations/proposal";
import {
  SERVICE_TYPE_LABELS,
  SERVICE_TYPE_FEATURES,
} from "../../constants/facility-options";
import {
  FacilityDetailsCard,
  TrafficAnalysisCard,
  ServiceScopeCard,
  AddonServicesCard,
  SpecialRequirementsCard,
} from "./cards";

interface EnhancedFacilitySectionProps {
  proposalId?: string;
  serviceType?: ServiceType;
}

export function EnhancedFacilitySection({
  proposalId,
  serviceType = "commercial",
}: EnhancedFacilitySectionProps) {
  const { title, description } = SERVICE_TYPE_LABELS[serviceType];
  const { showTrafficAnalysis } = SERVICE_TYPE_FEATURES[serviceType];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <FacilityDetailsCard serviceType={serviceType} />

      {showTrafficAnalysis && <TrafficAnalysisCard />}

      <ServiceScopeCard serviceType={serviceType} />

      <AddonServicesCard proposalId={proposalId} />

      <SpecialRequirementsCard serviceType={serviceType} />
    </div>
  );
}
