"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModernCorporateTemplate } from "@/features/templates/components/modern-corporate";
import { LuxuryEliteTemplate } from "@/features/templates/components/luxury-elite";
import {
  DemoTypeSelector,
  DemoPackageSelector,
  DemoActions,
  DemoCTA,
  getDemoTemplateData,
  type DemoType,
  type ResidentialPackageType,
} from "@/features/demo-proposal";
import type { ScopeTemplateId } from "@/features/proposals/quick";

export default function DemoProposalPage() {
  const [selectedType, setSelectedType] = useState<DemoType>("commercial");
  const [selectedPackage, setSelectedPackage] =
    useState<ResidentialPackageType>("recurring");
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const generateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (generateTimeoutRef.current !== null) {
        clearTimeout(generateTimeoutRef.current);
      }
    };
  }, []);

  const handleSelectType = (type: DemoType) => {
    setSelectedType(type);
    setShowPreview(false);
  };

  const handleSelectPackage = (pkg: ResidentialPackageType) => {
    setSelectedPackage(pkg);
    setShowPreview(false);
  };

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setShowPreview(true);

    generateTimeoutRef.current = setTimeout(() => {
      setIsGenerating(false);
      previewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      generateTimeoutRef.current = null;
    }, 300);
  }, []);

  const demoData = getDemoTemplateData(
    selectedType,
    selectedType === "residential" ? selectedPackage : undefined,
  );

  const previewLabel =
    selectedType === "commercial"
      ? "Commercial Janitorial"
      : selectedType === "residential"
        ? "Residential Cleaning"
        : "";
  const quickScopeTemplateId: ScopeTemplateId =
    selectedType === "commercial" ? "commercial_office" : "move_out_turnover";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b border-white/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to home</span>
            <span className="sm:hidden">Home</span>
          </Link>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Free demo · No signup required
          </Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Try a Professional Cleaning Proposal
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose a demo type, generate instantly, and see what your clients
            would receive — in under 3 minutes.
          </p>
        </div>

        {/* Demo type selection */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Choose your demo
          </h2>
          <DemoTypeSelector
            selected={selectedType}
            onSelect={handleSelectType}
            disabled={isGenerating}
          />
        </div>

        {/* Package selector (residential only) */}
        {selectedType === "residential" && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Choose a package
            </h2>
            <DemoPackageSelector
              selected={selectedPackage}
              onSelect={handleSelectPackage}
              disabled={isGenerating}
            />
          </div>
        )}

        {/* Generate button */}
        <div className="flex justify-center mb-12">
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 text-base px-8 py-6 h-auto"
          >
            <Sparkles className="h-5 w-5" />
            {isGenerating ? "Generating…" : "Generate Demo Proposal"}
          </Button>
        </div>

        {/* Preview */}
        {showPreview && (
          <div ref={previewRef} className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Proposal Preview
              </h2>
              <Badge variant="outline" className="text-xs">
                {previewLabel}
              </Badge>
            </div>

            {isGenerating ? (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="space-y-6 p-6 sm:p-8 animate-pulse">
                  <div className="h-32 w-full rounded-xl bg-gray-100" />
                  <div className="h-24 w-full bg-gray-100 rounded" />
                  <div className="h-48 w-full bg-gray-100 rounded" />
                  <div className="h-40 w-full bg-gray-100 rounded" />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Gated action bar */}
                <div className="rounded-t-xl border border-b-0 border-gray-200 bg-white shadow-sm overflow-hidden">
                  <DemoActions />
                </div>

                {/* Real template output */}
                <div className="rounded-b-xl border bg-[#e0e7ff] shadow-sm overflow-hidden -mt-8 pt-0">
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[320px]">
                      {selectedType === "commercial" ? (
                        <ModernCorporateTemplate
                          proposal={demoData.proposal}
                          branding={demoData.branding}
                          pages={demoData.pages}
                          print={true}
                        />
                      ) : (
                        <LuxuryEliteTemplate
                          proposal={demoData.proposal}
                          branding={demoData.branding}
                          pages={demoData.pages}
                          print={true}
                          demoImages={demoData.demoImages}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <DemoCTA
                  demoType={selectedType}
                  scopeTemplateId={quickScopeTemplateId}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
