"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DemoType } from "@/features/demo-proposal/types/demo-proposal";
import {
  SCOPE_TEMPLATE_IDS,
  getScopeTemplate,
  type ScopeTemplate,
  type ScopeTemplateId,
} from "../constants/scope-templates";
import {
  buildQuickProposalGenerateRequest,
  buildQuickProposalSavePayload,
} from "../lib/build-quick-proposal-payload";
import { buildPropertyAssumptionsLite } from "../lib/property-assumptions-lite";
import {
  QUICK_SERVICE_FREQUENCY_OPTIONS,
  QUICK_STEP_ONE_FIELDS,
  getQuickProposalDefaults,
  getQuickProposalFieldErrors,
  type QuickProposalFormData,
} from "../schemas/quick-proposal";
import { PropertyAssumptionsLite } from "./property-assumptions-lite";
import { DesignTemplatePicker } from "./design-template-picker";
import { useUserTier } from "@/features/proposals/hooks/use-user-tier";
import { ANALYTICS_EVENTS, captureEvent } from "@/lib/analytics";

interface QuickProposalFlowProps {
  demoType?: DemoType | string;
  source?: string;
  requestedScopeTemplateId?: string;
  template: ScopeTemplate;
  usedFallback: boolean;
  userId: string;
  /** Initial proposal_templates UUID; the step 2 picker can change it. */
  designTemplateId?: string;
  designTemplateName?: string;
}

const STEP_LABELS = [
  "Property basics",
  "Scope and assumptions",
  "Review draft inputs",
];

const FREQUENCY_LABELS: Record<
  (typeof QUICK_SERVICE_FREQUENCY_OPTIONS)[number],
  string
> = {
  "one-time": "One-time",
  "1x-month": "Monthly",
  "bi-weekly": "Bi-weekly",
  weekly: "Weekly",
  "2x-week": "2x per week",
  "3x-week": "3x per week",
  "5x-week": "5x per week",
  daily: "Daily",
};

function parseOptionalNumber(value: string) {
  if (value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function updateAddOns(
  currentAddOns: string[],
  addOn: string,
  checked: boolean,
) {
  if (checked) {
    return Array.from(new Set([...currentAddOns, addOn]));
  }

  return currentAddOns.filter((current) => current !== addOn);
}

export function QuickProposalFlow({
  demoType,
  source,
  requestedScopeTemplateId,
  template,
  usedFallback,
  userId,
  designTemplateId,
  designTemplateName,
}: QuickProposalFlowProps) {
  const router = useRouter();
  const userTier = useUserTier(userId);
  const [selectedDesignTemplate, setSelectedDesignTemplate] = useState<{
    id?: string;
    name?: string;
  }>({ id: designTemplateId, name: designTemplateName });
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [stepOneError, setStepOneError] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isPreviewStale, setIsPreviewStale] = useState(false);
  const generateInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const quickStartedRef = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof QuickProposalFormData, string>>
  >({});
  const [formData, setFormData] = useState<QuickProposalFormData>(() =>
    getQuickProposalDefaults({
      demoType,
      scopeTemplateId: template.id,
      template,
    }),
  );
  const selectedTemplate =
    getScopeTemplate(formData.scopeTemplateId) ?? template;
  const assumptions = useMemo(
    () => buildPropertyAssumptionsLite(formData),
    [formData],
  );
  const draftGenerateRequest = useMemo(
    () => buildQuickProposalGenerateRequest(formData, selectedDesignTemplate.id),
    [formData, selectedDesignTemplate.id],
  );
  const hasDemoContext = source === "demo" || Boolean(demoType);

  const markQuickProposalStarted = () => {
    if (quickStartedRef.current) return;
    quickStartedRef.current = true;
    captureEvent(ANALYTICS_EVENTS.QUICK_PROPOSAL_STARTED, {
      source: source || "direct",
      demo_type: demoType || "none",
      scope_template_id: formData.scopeTemplateId,
    });
  };

  const setField = <K extends keyof QuickProposalFormData>(
    field: K,
    value: QuickProposalFormData[K],
  ) => {
    markQuickProposalStarted();
    setGenerationError("");
    setSaveError("");
    setStepOneError("");
    // Keep the generated preview (and any manual edits) instead of wiping it;
    // just flag it as possibly out of date with the changed inputs.
    if (generatedContent) {
      setIsPreviewStale(true);
    }
    setFieldErrors((current) => {
      const { [field]: removedFieldError, ...rest } = current;
      void removedFieldError;
      return rest;
    });
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const goToStep = (target: number) => {
    const nextStep = Math.min(3, Math.max(1, target));

    // Leaving Step 1 forward requires its fields to be complete.
    if (step === 1 && nextStep > 1) {
      const allErrors = getQuickProposalFieldErrors(formData);
      const stepOneErrors = Object.fromEntries(
        QUICK_STEP_ONE_FIELDS.filter((field) => allErrors[field]).map(
          (field) => [field, allErrors[field]],
        ),
      ) as typeof allErrors;

      if (Object.keys(stepOneErrors).length > 0) {
        setFieldErrors(stepOneErrors);
        setStepOneError(
          "Please fill in the required fields before continuing.",
        );
        return;
      }
    }

    setStepOneError("");
    setStep(nextStep);
  };

  const selectDesignTemplate = (templateId: string, displayName: string) => {
    if (templateId === selectedDesignTemplate.id) {
      return;
    }

    markQuickProposalStarted();
    // Same contract as the scope-template select: keep the draft, flag it stale.
    if (generatedContent) {
      setIsPreviewStale(true);
    }
    setSelectedDesignTemplate({ id: templateId, name: displayName });
  };

  const applyRecommendedTemplate = () => {
    const recommendedTemplate = getScopeTemplate(
      assumptions.recommendedScopeTemplateId,
    );

    if (!recommendedTemplate) {
      return;
    }

    markQuickProposalStarted();

    if (generatedContent) {
      setIsPreviewStale(true);
    }
    setFormData((current) => ({
      ...current,
      scopeTemplateId: recommendedTemplate.id,
      propertyType: recommendedTemplate.propertyType,
      serviceFrequency: recommendedTemplate.recommendedFrequency,
      addOns: recommendedTemplate.commonAddOns.slice(0, 2),
    }));
  };

  const generateProposalPreview = async () => {
    if (generateInFlightRef.current) {
      return;
    }

    setGenerationError("");
    setSaveError("");
    setGeneratedContent("");
    setIsPreviewStale(false);
    setFieldErrors({});

    const request = buildQuickProposalGenerateRequest(
      formData,
      selectedDesignTemplate.id,
    );

    if (!request.success) {
      setGenerationError(request.error);
      setFieldErrors(request.fieldErrors ?? {});
      return;
    }

    generateInFlightRef.current = true;
    setIsGenerating(true);
    captureEvent(ANALYTICS_EVENTS.PROPOSAL_GENERATION_STARTED, {
      flow: "quick",
      is_regenerate: Boolean(generatedContent),
    });

    try {
      const response = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request.payload),
      });
      const data = (await response.json().catch(() => ({}))) as {
        content?: string;
        error?: string;
      };

      if (!response.ok || !data.content) {
        captureEvent(ANALYTICS_EVENTS.PROPOSAL_GENERATION_FAILED, {
          flow: "quick",
          failure_type: response.ok ? "invalid_response" : "http",
          status_code: response.ok ? undefined : response.status,
        });
        setGenerationError(
          data.error ||
            "We could not generate the proposal preview. Please review the inputs and try again.",
        );
        return;
      }

      setGeneratedContent(data.content);
      setIsPreviewStale(false);
      captureEvent(ANALYTICS_EVENTS.PROPOSAL_GENERATED, {
        flow: "quick",
        is_regenerate: Boolean(generatedContent),
      });
    } catch {
      captureEvent(ANALYTICS_EVENTS.PROPOSAL_GENERATION_FAILED, {
        flow: "quick",
        failure_type: "network",
      });
      setGenerationError(
        "We could not reach the proposal generator. Please try again in a moment.",
      );
    } finally {
      generateInFlightRef.current = false;
      setIsGenerating(false);
    }
  };

  const saveGeneratedProposal = async () => {
    if (saveInFlightRef.current) {
      return;
    }

    setSaveError("");
    setFieldErrors({});

    const result = buildQuickProposalSavePayload(
      formData,
      generatedContent,
      selectedDesignTemplate.id,
    );

    if (!result.success) {
      setSaveError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    captureEvent(ANALYTICS_EVENTS.PROPOSAL_SAVE_STARTED, {
      flow: "quick",
    });

    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.payload),
      });
      const data = (await response.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };

      if (!response.ok || !data.id) {
        captureEvent(ANALYTICS_EVENTS.PROPOSAL_SAVE_FAILED, {
          flow: "quick",
          failure_type: response.ok ? "invalid_response" : "http",
          status_code: response.ok ? undefined : response.status,
        });
        setSaveError(
          data.error ||
            "We could not save this proposal. Please review the inputs and try again.",
        );
        saveInFlightRef.current = false;
        setIsSaving(false);
        return;
      }

      // Keep the saving state active until the redirect unmounts this
      // component so the button doesn't flicker back to "Save Proposal".
      captureEvent(ANALYTICS_EVENTS.PROPOSAL_SAVED, { flow: "quick" });
      captureEvent(ANALYTICS_EVENTS.QUICK_PROPOSAL_COMPLETED, {
        source: source || "direct",
        demo_type: demoType || "none",
        scope_template_id: formData.scopeTemplateId,
      });
      router.push(`/dashboard/proposals/${data.id}`);
    } catch {
      captureEvent(ANALYTICS_EVENTS.PROPOSAL_SAVE_FAILED, {
        flow: "quick",
        failure_type: "network",
      });
      setSaveError(
        "We could not reach the proposal save service. Please try again in a moment.",
      );
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="secondary">Quick Proposal Flow</Badge>
            {hasDemoContext && <Badge variant="outline">Demo context</Badge>}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Create My Real Proposal
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Answer the essentials, confirm the recommended cleaning scope, and
            prepare draft inputs for proposal generation.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/proposals/new">
            Advanced Builder
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {usedFallback && requestedScopeTemplateId && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6 text-sm text-yellow-900">
            The requested scope template &quot;{requestedScopeTemplateId}&quot;
            was not found, so the commercial office template is selected for
            now.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-3">
          {STEP_LABELS.map((label, index) => {
            const stepNumber = index + 1;
            const isActive = step === stepNumber;
            const isComplete = step > stepNumber;

            return (
              <button
                key={label}
                type="button"
                onClick={() => goToStep(stepNumber)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition ${
                  isActive
                    ? "border-blue-600 bg-blue-50 text-blue-950"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border bg-white text-xs font-semibold">
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    stepNumber
                  )}
                </span>
                <span>
                  <span className="block text-xs uppercase text-gray-500">
                    Step {stepNumber}
                  </span>
                  <span className="font-medium">{label}</span>
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 1 && <ClipboardList className="h-5 w-5" />}
              {step === 2 && <Info className="h-5 w-5" />}
              {step === 3 && <FileText className="h-5 w-5" />}
              {STEP_LABELS[step - 1]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-gray-900">
                      Client name*
                    </span>
                    <Input
                      value={formData.clientName}
                      onChange={(event) =>
                        setField("clientName", event.target.value)
                      }
                      placeholder="Client or property contact"
                    />
                    <FieldError message={fieldErrors.clientName} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-gray-900">
                      Company name
                    </span>
                    <Input
                      value={formData.companyName ?? ""}
                      onChange={(event) =>
                        setField("companyName", event.target.value)
                      }
                      placeholder="Optional"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-gray-900">
                      Client email*
                    </span>
                    <Input
                      type="email"
                      value={formData.clientEmail}
                      onChange={(event) =>
                        setField("clientEmail", event.target.value)
                      }
                      placeholder="client@example.com"
                    />
                    <FieldError message={fieldErrors.clientEmail} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-gray-900">
                      Client phone*{" "}
                      <span className="text-gray-500 text-xs">
                        Save & follow-up required
                      </span>
                    </span>
                    <Input
                      type="tel"
                      value={formData.clientPhone ?? ""}
                      onChange={(event) =>
                        setField("clientPhone", event.target.value)
                      }
                      placeholder="Required before save"
                    />
                    <FieldError message={fieldErrors.clientPhone} />
                  </label>
                </div>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-gray-900">
                    Service location*
                  </span>
                  <Input
                    value={formData.serviceLocation}
                    onChange={(event) =>
                      setField("serviceLocation", event.target.value)
                    }
                    placeholder="Street address or city/state"
                  />
                  <FieldError message={fieldErrors.serviceLocation} />
                </label>

                <div className="grid gap-4 sm:grid-cols-3 mt-4">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-gray-900">City*</span>
                    <Input
                      value={formData.city}
                      onChange={(event) => setField("city", event.target.value)}
                      placeholder="Seattle"
                    />
                    <FieldError message={fieldErrors.city} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-gray-900">State*</span>
                    <Input
                      value={formData.state}
                      maxLength={2}
                      onChange={(event) =>
                        setField("state", event.target.value.toUpperCase())
                      }
                      placeholder="WA"
                    />
                    <FieldError message={fieldErrors.state} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-gray-900">
                      Square footage*
                    </span>
                    <Input
                      type="number"
                      min="1"
                      value={formData.squareFootage || ""}
                      onChange={(event) =>
                        setField(
                          "squareFootage",
                          Number(event.target.value) || 0,
                        )
                      }
                      placeholder="12000"
                    />
                    <FieldError message={fieldErrors.squareFootage} />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-gray-900">
                      Property type*
                    </span>
                    <Input
                      value={formData.propertyType}
                      onChange={(event) =>
                        setField("propertyType", event.target.value)
                      }
                      placeholder="Commercial Office"
                    />
                    <FieldError message={fieldErrors.propertyType} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-gray-900">
                      Service frequency*
                    </span>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={formData.serviceFrequency}
                      onChange={(event) =>
                        setField(
                          "serviceFrequency",
                          event.target
                            .value as QuickProposalFormData["serviceFrequency"],
                        )
                      }
                    >
                      {QUICK_SERVICE_FREQUENCY_OPTIONS.map((frequency) => (
                        <option key={frequency} value={frequency}>
                          {FREQUENCY_LABELS[frequency]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <DesignTemplatePicker
                  userTier={userTier}
                  selectedTemplateId={selectedDesignTemplate.id}
                  onSelectTemplate={selectDesignTemplate}
                />

                <div className="border-t pt-5" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-gray-900">
                      Scope template
                    </span>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={formData.scopeTemplateId}
                      onChange={(event) => {
                        markQuickProposalStarted();
                        const nextTemplateId = event.target
                          .value as ScopeTemplateId;
                        const nextTemplate = getScopeTemplate(nextTemplateId);

                        if (generatedContent) {
                          setIsPreviewStale(true);
                        }
                        setFormData((current) => ({
                          ...current,
                          scopeTemplateId: nextTemplateId,
                          propertyType:
                            nextTemplate?.propertyType ?? current.propertyType,
                          serviceFrequency:
                            nextTemplate?.recommendedFrequency ??
                            current.serviceFrequency,
                          addOns:
                            nextTemplate?.commonAddOns.slice(0, 2) ??
                            current.addOns,
                        }));
                      }}
                    >
                      {SCOPE_TEMPLATE_IDS.map((templateId) => {
                        const optionTemplate = getScopeTemplate(templateId);

                        return (
                          <option key={templateId} value={templateId}>
                            {optionTemplate?.label ?? templateId}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-gray-900">
                      Traffic level
                    </span>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={formData.trafficLevel ?? ""}
                      onChange={(event) =>
                        setField(
                          "trafficLevel",
                          (event.target.value || undefined) as
                            | QuickProposalFormData["trafficLevel"]
                            | undefined,
                        )
                      }
                    >
                      <option value="">Use recommendation</option>
                      <option value="light">Light</option>
                      <option value="medium">Medium</option>
                      <option value="heavy">Heavy</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-gray-900">
                      Restroom count
                    </span>
                    <Input
                      type="number"
                      min="0"
                      value={formData.restroomCount ?? ""}
                      onChange={(event) =>
                        setField(
                          "restroomCount",
                          parseOptionalNumber(event.target.value),
                        )
                      }
                      placeholder={`${assumptions.restroomCount}`}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-gray-900">
                      Breakroom count
                    </span>
                    <Input
                      type="number"
                      min="0"
                      value={formData.breakroomCount ?? ""}
                      onChange={(event) =>
                        setField(
                          "breakroomCount",
                          parseOptionalNumber(event.target.value),
                        )
                      }
                      placeholder={`${assumptions.breakroomCount}`}
                    />
                  </label>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">
                      Common add-ons
                    </p>
                    {assumptions.recommendedScopeTemplateId !==
                      formData.scopeTemplateId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyRecommendedTemplate}
                      >
                        Use recommended scope
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedTemplate.commonAddOns.map((addOn) => (
                      <label
                        key={addOn}
                        className="flex items-center gap-2 rounded-lg border p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={formData.addOns.includes(addOn)}
                          onChange={(event) =>
                            setField(
                              "addOns",
                              updateAddOns(
                                formData.addOns,
                                addOn,
                                event.target.checked,
                              ),
                            )
                          }
                        />
                        <span>{addOn}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-gray-900">
                    Cleaning goals
                  </span>
                  <Textarea
                    value={formData.cleaningGoals ?? ""}
                    onChange={(event) =>
                      setField("cleaningGoals", event.target.value)
                    }
                    placeholder="What should this proposal emphasize?"
                  />
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReviewItem label="Client" value={formData.clientName} />
                  <ReviewItem label="Email" value={formData.clientEmail} />
                  <ReviewItem
                    label="Phone"
                    value={formData.clientPhone || "Required before save"}
                  />
                  <ReviewItem
                    label="Location"
                    value={`${formData.city}, ${formData.state}`}
                  />
                  <ReviewItem
                    label="Property"
                    value={`${formData.propertyType} · ${formData.squareFootage.toLocaleString()} sq ft`}
                  />
                  <ReviewItem
                    label="Frequency"
                    value={FREQUENCY_LABELS[formData.serviceFrequency]}
                  />
                  <ReviewItem
                    label="Scope template"
                    value={selectedTemplate.label}
                  />
                  <ReviewItem
                    label="Traffic"
                    value={assumptions.trafficLevel}
                  />
                </div>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-gray-900">Notes</span>
                  <Textarea
                    value={formData.notes}
                    onChange={(event) => setField("notes", event.target.value)}
                    placeholder="Access notes, supply assumptions, exclusions, or follow-up questions"
                  />
                </label>

                <Card className="border-blue-100 bg-blue-50 mt-4">
                  <CardContent className="space-y-2 pt-6 text-sm text-blue-950">
                    <p className="font-medium">Draft inputs ready</p>
                    <p>
                      Generate the proposal below, review or edit the preview,
                      then save it to your proposals.
                    </p>
                    <p className="text-xs">
                      Prepared title:{" "}
                      {draftGenerateRequest.success
                        ? draftGenerateRequest.payload.title
                        : "Complete required fields to prepare the draft"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={step === 1}
                onClick={() => goToStep(step - 1)}
              >
                Back
              </Button>
              {step < 3 ? (
                <Button type="button" onClick={() => goToStep(step + 1)}>
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={generateProposalPreview}
                  disabled={isGenerating}
                >
                  {isGenerating
                    ? "Generating Proposal..."
                    : "Continue to Generate Proposal"}
                </Button>
              )}
            </div>

            {stepOneError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                {stepOneError}
              </div>
            )}

            {generationError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                {generationError}
              </div>
            )}

            {generatedContent && (
              <div className="ph-no-capture space-y-4 rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="text-sm text-green-950">
                  <p className="font-medium">Generated proposal preview</p>
                  <p>
                    Review this generated proposal before saving. Saving uses
                    the existing proposal creation flow.
                  </p>
                </div>
                {isPreviewStale && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Form inputs changed after this preview was generated. You
                    can still edit and save it, or generate again to refresh it
                    with the new inputs.
                  </div>
                )}
                <Textarea
                  className="min-h-[420px] bg-white font-mono text-sm leading-6"
                  value={generatedContent}
                  onChange={(event) => {
                    setSaveError("");
                    setGeneratedContent(event.target.value);
                  }}
                />
                <Button
                  type="button"
                  onClick={saveGeneratedProposal}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving Proposal..." : "Save Proposal"}
                </Button>
                {saveError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                    {saveError}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Demo Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ReviewRow label="Source" value={source || "direct"} />
              <ReviewRow label="Demo type" value={demoType || "none"} />
              <ReviewRow
                label="Scope template ID"
                value={formData.scopeTemplateId}
              />
              {selectedDesignTemplate.name && (
                <ReviewRow
                  label="Design template"
                  value={selectedDesignTemplate.name}
                />
              )}
            </CardContent>
          </Card>

          <PropertyAssumptionsLite assumptions={assumptions} />
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 text-sm">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="ph-no-capture mt-1 font-medium text-gray-900">
        {value || "Not set"}
      </p>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-red-600">{message}</p>;
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
