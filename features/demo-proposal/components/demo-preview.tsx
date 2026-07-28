"use client";

import { toast } from "sonner";
import {
  Building2,
  Download,
  FileText,
  Home,
  MapPin,
  Ruler,
  Send,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DemoProposalData } from "../types/demo-proposal";
import { getDemoAccent } from "../lib/demo-accent";
import { DemoSectionBlock } from "./demo-section";
import { DemoCTA } from "./demo-cta";

const GATED_MESSAGE =
  "Create a free account to save, download, or send your proposal.";

interface DemoPreviewProps {
  data: DemoProposalData;
  isLoading?: boolean;
}

function GatedActionBar({ onGatedClick }: { onGatedClick: () => void }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-6">
      <Button variant="outline" size="sm" onClick={onGatedClick}>
        <Save className="h-4 w-4" />
        Save Proposal
      </Button>
      <Button variant="outline" size="sm" onClick={onGatedClick}>
        <Download className="h-4 w-4" />
        Download PDF
      </Button>
      <Button variant="outline" size="sm" onClick={onGatedClick}>
        <Send className="h-4 w-4" />
        Send Proposal
      </Button>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-36 w-full" />
    </div>
  );
}

export function DemoPreview({ data, isLoading = false }: DemoPreviewProps) {
  const accent = getDemoAccent(data.type);
  const Icon = data.type === "commercial" ? Building2 : Home;

  const handleGatedClick = () => {
    toast.info(GATED_MESSAGE, {
      duration: 5000,
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <PreviewSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Cover header */}
        <div className={accent.coverHeader}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium opacity-90 mb-1">
                Veltex Demo Cleaning Co.
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                {data.type === "commercial"
                  ? "Janitorial Services Proposal"
                  : "Residential Deep Cleaning Proposal"}
              </h2>
              <p className="text-lg opacity-95">{data.clientName}</p>
            </div>
            <Badge
              variant="secondary"
              className="w-fit bg-white/20 text-white border-white/30 hover:bg-white/20"
            >
              {data.scopeTemplateName}
            </Badge>
          </div>
        </div>

        <GatedActionBar onGatedClick={handleGatedClick} />

        {/* Property summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-5 bg-gray-50 border-b border-gray-100">
          <div className="flex items-start gap-2">
            <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Property</p>
              <p className="text-sm font-medium text-gray-900">
                {data.propertyType}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium text-gray-900">{data.city}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Ruler className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Size</p>
              <p className="text-sm font-medium text-gray-900">
                {data.estimatedSize}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 col-span-2 sm:col-span-1">
            <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Investment</p>
              <p className="text-sm font-medium text-gray-900">
                {data.samplePriceRange}
              </p>
            </div>
          </div>
        </div>

        {/* Detail chips */}
        <div className="flex flex-wrap gap-2 px-6 py-4 border-b border-gray-100">
          <Badge variant="outline">{data.serviceType}</Badge>
          <Badge variant="outline">{data.cleaningFrequency}</Badge>
          {data.restrooms != null && (
            <Badge variant="outline">{data.restrooms} Restrooms</Badge>
          )}
          {data.breakrooms != null && (
            <Badge variant="outline">{data.breakrooms} Breakroom</Badge>
          )}
          {data.bedrooms != null && (
            <Badge variant="outline">{data.bedrooms} Bedrooms</Badge>
          )}
          {data.bathrooms != null && (
            <Badge variant="outline">{data.bathrooms} Bathrooms</Badge>
          )}
        </div>

        {/* Sections */}
        <div className="px-6 py-8 sm:px-10 space-y-8">
          {data.sections.map((section, index) => (
            <DemoSectionBlock
              key={section.id}
              section={section}
              index={index}
              variant={data.type}
            />
          ))}
        </div>
      </div>

      <DemoCTA
        demoType={data.type}
        scopeTemplateId={data.scopeTemplateId || "commercial_office"}
      />
    </div>
  );
}
