"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";
import { ModernCorporateTemplate } from "@/features/templates/components/modern-corporate";
import { LuxuryEliteTemplate } from "@/features/templates/components/luxury-elite";
import {
  DemoTypeSelector,
  DemoPackageSelector,
  DemoShell,
  DemoStepper,
  DemoGeneratingOverlay,
  DemoResultLayout,
  getDemoTemplateData,
  type DemoType,
  type ResidentialPackageType,
} from "@/features/demo-proposal";
import type { ScopeTemplateId } from "@/features/proposals/quick";
import { ANALYTICS_EVENTS, captureEvent } from "@/lib/analytics";

/** Length of the generating choreography — keep in sync with DemoGeneratingOverlay. */
const GENERATION_DURATION_MS = 2800;

type DemoStep = "service" | "package" | "generate";

const STEP_LABELS: Record<DemoStep, string> = {
  service: "Service Selection",
  package: "Package Selection",
  generate: "Generate Proposal",
};

export default function DemoProposalPage() {
  const [selectedType, setSelectedType] = useState<DemoType>("commercial");
  const [selectedPackage, setSelectedPackage] =
    useState<ResidentialPackageType>("recurring");
  const [step, setStep] = useState<DemoStep>("service");
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

  // Residential adds a package step: Service → Package → Generate → Preview.
  // Commercial skips it: Service → Generate → Preview.
  const isResidential = selectedType === "residential";
  const totalSteps = isResidential ? 4 : 3;
  const stepIndex: Record<DemoStep, number> = {
    service: 1,
    package: 2,
    generate: isResidential ? 3 : 2,
  };

  const handleSelectType = (type: DemoType) => {
    setSelectedType(type);
    setShowPreview(false);
    setStep(type === "residential" ? "package" : "generate");
  };

  const handleSelectPackage = (pkg: ResidentialPackageType) => {
    setSelectedPackage(pkg);
    setShowPreview(false);
    setStep("generate");
  };

  const handleBack = () => {
    setShowPreview(false);
    setStep((current) => {
      if (current === "generate") return isResidential ? "package" : "service";
      if (current === "package") return "service";
      return current;
    });
  };

  const handleStartOver = () => {
    setShowPreview(false);
    setStep("service");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setShowPreview(true);

    generateTimeoutRef.current = setTimeout(() => {
      setIsGenerating(false);
      captureEvent(ANALYTICS_EVENTS.DEMO_STARTED, {
        demo_type: selectedType,
        package_type:
          selectedType === "residential" ? selectedPackage : undefined,
      });
      previewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      generateTimeoutRef.current = null;
    }, GENERATION_DURATION_MS);
  }, [selectedPackage, selectedType]);

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

  if (isGenerating) {
    return (
      <DemoShell>
        <DemoGeneratingOverlay durationMs={GENERATION_DURATION_MS} />
      </DemoShell>
    );
  }

  if (showPreview) {
    return (
      <DemoShell>
        <div ref={previewRef}>
          <DemoResultLayout
            proposal={demoData.proposal}
            demoType={selectedType}
            scopeTemplateId={quickScopeTemplateId}
            previewLabel={previewLabel}
            onStartOver={handleStartOver}
          >
            {/* Real template output — rendered exactly as before. */}
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
                images={demoData.images}
              />
            )}
          </DemoResultLayout>
        </div>
      </DemoShell>
    );
  }

  return (
    <DemoShell>
      <main className="flex-grow py-8">
        {/* Hero */}
        <section className="mx-auto mb-16 max-w-4xl px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-demo-secondary/20 bg-demo-secondary-container/10 px-3 py-1 text-demo-secondary">
            <ShieldCheck className="size-4" />
            <span className="text-demo-label-sm">No Signup Required</span>
          </div>
          <h1 className="mb-6 text-demo-display-sm tracking-tight text-demo-on-surface md:text-demo-display-lg">
            Try a Professional{" "}
            <span className="text-demo-primary">Cleaning Proposal</span>
          </h1>
          <p className="mx-auto max-w-2xl text-demo-body-lg text-demo-on-surface-variant">
            Experience the precision of AI-engineered bidding. Select a service
            below to generate a high-fidelity document in seconds.
          </p>
        </section>

        <div className="mx-auto max-w-[1280px] px-4 md:px-10">
          <DemoStepper
            currentStep={stepIndex[step]}
            totalSteps={totalSteps}
            label={STEP_LABELS[step]}
            onBack={step === "service" ? undefined : handleBack}
          />

          {step === "service" && (
            <div className="demo-animate-fade-in">
              <DemoTypeSelector
                selected={selectedType}
                onSelect={handleSelectType}
              />
            </div>
          )}

          {step === "package" && (
            <div className="demo-animate-fade-in">
              <DemoPackageSelector
                selected={selectedPackage}
                onSelect={handleSelectPackage}
              />
            </div>
          )}

          {step === "generate" && (
            <div className="demo-animate-fade-in mx-auto max-w-xl py-10 text-center">
              <h3 className="mb-4 text-demo-headline-md text-demo-on-surface">
                Ready to build your {previewLabel.toLowerCase()} proposal
              </h3>
              <p className="mb-8 text-demo-body-md text-demo-on-surface-variant">
                We&apos;ll assemble the scope, pricing and branded document so
                you can see exactly what your client would receive.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-demo-primary py-4 text-demo-headline-md text-demo-on-primary transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <Sparkles className="size-6 fill-current" />
                Generate Demo Proposal
              </button>
            </div>
          )}
        </div>
      </main>
    </DemoShell>
  );
}
