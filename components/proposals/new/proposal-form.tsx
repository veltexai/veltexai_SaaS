'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  proposalFormSchema,
  type ProposalFormData,
  type ServiceType,
  validateProposalWithServiceData,
  getServiceSpecificSchema,
} from '@/lib/validations/proposal';
import { ServiceTypeSelector } from './service-type-selector';
import { TemplateSelectionSection } from './template-selection-section';
import { GlobalInputsSection } from './global-inputs-section';
import { ServiceSpecificSection } from './service-specific-section';
import { EnhancedFacilitySection } from './enhanced-facility-section';
import { PricingSection } from './pricing-section';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Calculator,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import z from 'zod';

interface ProposalFormProps {
  userId: string;
}

const STEPS = [
  {
    id: 1,
    title: 'Service Type',
    description: 'Select service type',
  },
  {
    id: 2,
    title: 'Template',
    description: 'Choose proposal template',
  },
  {
    id: 3,
    title: 'Client Information',
    description: 'Client details and contact information',
  },
  {
    id: 4,
    title: 'Service Details',
    description: 'Services and specifications',
  },
  {
    id: 5,
    title: 'Facility Details',
    description: 'Enhanced facility information',
  },
  {
    id: 6,
    title: 'Pricing',
    description: 'Pricing configuration',
  },
];

function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: typeof STEPS;
}) {
  return (
    <div className="mb-8 sm:block hidden">
      <div className="relative flex items-center justify-between">
        {/* Background line */}
        <div
          className="absolute top-5 h-0.5 bg-gray-200 left-[50%] translate-x-[-50%]"
          style={{ width: 'calc(100% - 120px)' }}
        />

        {/* Progress line */}
        <div
          className="absolute top-5 h-0.5 bg-green-600 transition-all duration-300 ease-in-out left-[3.75rem]"
          style={{
            width: `calc((100% - 120px) * ${
              (currentStep - 1) / (steps.length - 1)
            })`,
          }}
        />

        {steps.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;

          return (
            <div key={step.id} className="relative flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors bg-white relative z-10',
                  isActive && 'bg-blue-600 border-blue-600 text-white',
                  isCompleted && 'bg-green-600 border-green-600 text-white',
                  !isActive &&
                    !isCompleted &&
                    'bg-white border-gray-300 text-gray-500'
                )}
              >
                {step.id}
              </div>
              <div className="mt-3 text-center max-w-[120px] min-h-[108px]">
                <div
                  className={cn(
                    'text-sm font-medium',
                    isActive && 'text-blue-600',
                    isCompleted && 'text-green-600',
                    !isActive && !isCompleted && 'text-gray-500'
                  )}
                >
                  {step.title}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProposalForm({ userId }: ProposalFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [selectedServiceType, setSelectedServiceType] =
    useState<ServiceType | null>(null);
  const [pricingEnabled, setPricingEnabled] = useState(false);
  const [aiTone, setAiTone] = useState<
    'professional' | 'friendly' | 'formal' | 'casual' | 'technical'
  >('professional');
  const [userTier, setUserTier] = useState<
    'starter' | 'professional' | 'enterprise'
  >('starter');

  const form = useForm({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      title: '',
      service_type: 'residential' as const,
      template_id: undefined,
      global_inputs: {
        client_name: '',
        client_email: '',
        client_company: '',
        contact_phone: '',
        service_location: '',
        facility_size: 0,
        service_frequency: '1x-month' as const,
        regional_location: '',
      },
      service_specific_data: {},
      pricing_enabled: false,
      pricing_data: undefined,
      generated_content: '',
      status: 'draft' as const,
      facility_details: {
        building_age: undefined,
        building_type: undefined,
        accessibility_requirements: [],
        special_areas: [],
        equipment_present: [],
        environmental_concerns: [],
      },
      traffic_analysis: {
        staff_count: undefined,
        visitor_frequency: undefined,
        peak_hours: [],
        special_events: false,
        traffic_level: undefined,
      },
      service_scope: {
        areas_included: [],
        areas_excluded: [],
        special_services: [],
        frequency_details: {},
      },
      special_requirements: {
        security_clearance: false,
        after_hours_access: false,
        special_equipment: [],
        certifications_required: [],
        insurance_requirements: [],
      },
      ai_tone: 'professional' as const,
    },
  });

  // Fetch user subscription tier
  useEffect(() => {
    const fetchUserTier = async () => {
      try {
        const supabase = createClient();
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching user tier:', error);
          return;
        }

        if (profile?.subscription_plan) {
          setUserTier(
            profile.subscription_plan as
              | 'starter'
              | 'professional'
              | 'enterprise'
          );
        }
      } catch (error) {
        console.error('Error fetching user tier:', error);
      }
    };

    fetchUserTier();
  }, [userId]);

  // Watch for service type changes
  const watchedServiceType = form.watch('service_type');

  useEffect(() => {
    if (watchedServiceType !== selectedServiceType) {
      setSelectedServiceType(watchedServiceType);
      // Reset service-specific data when service type changes
      form.setValue(
        'service_specific_data',
        {},
        {
          shouldValidate: false,
          shouldTouch: false,
          shouldDirty: false,
        }
      );
    }
  }, [watchedServiceType, selectedServiceType, form]);

  const handleAiToneChange = (
    tone: 'professional' | 'friendly' | 'formal' | 'casual' | 'technical'
  ) => {
    setAiTone(tone);
    form.setValue('ai_tone', tone, {
      shouldValidate: false,
      shouldTouch: false,
      shouldDirty: false,
    });
  };

  const validateCurrentStep = async () => {
    const fieldsToValidate =
      {
        1: ['service_type', 'title'],
        2: [], // Template selection is optional
        3: [
          'global_inputs.client_name',
          'global_inputs.client_email',
          'global_inputs.contact_phone',
          'global_inputs.service_location',
          'global_inputs.facility_size',
        ],
        4: [], // Service-specific validation handled separately
        5: [], // Facility details are optional
        6: ['generated_content'], // Pricing validation handled separately
      }[currentStep] || [];

    if (currentStep === 4) {
      const serviceType = form.getValues('service_type');
      const serviceSpecificData = form.getValues('service_specific_data');

      try {
        const serviceSchema = getServiceSpecificSchema(serviceType);
        serviceSchema.parse(serviceSpecificData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Set form errors for service-specific fields
          error.errors.forEach((err) => {
            const fieldPath = `service_specific_data.${err.path.join('.')}`;
            form.setError(fieldPath as any, {
              type: 'manual',
              message: err.message,
            });
          });
        }
        return false;
      }
      return true;
    }

    const isValid = await form.trigger(fieldsToValidate as any);

    return isValid;
  };

  const nextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: any) => {
    if (currentStep !== STEPS.length) {
      console.warn('Form submission attempted before reaching final step');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Validate service-specific data
      const validatedData = validateProposalWithServiceData(data);

      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validatedData,
          selected_addons: Array.isArray(data?.selected_addons)
            ? data.selected_addons
            : [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create proposal');
      }

      const proposalData = await response.json();

      toast.success('Proposal created successfully!');
      router.push(`/dashboard/proposals/${proposalData.id}`);
    } catch (error) {
      console.error('Error creating proposal:', error);
      setError('Failed to create proposal. Please try again.');
      toast.error('Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <ServiceTypeSelector />;
      case 2:
        return <TemplateSelectionSection userTier={userTier} />;
      case 3:
        return <GlobalInputsSection />;
      case 4:
        return (
          <ServiceSpecificSection
            serviceType={selectedServiceType || 'residential'}
          />
        );
      case 5:
        return <EnhancedFacilitySection serviceType={selectedServiceType || 'residential'} />;
      case 6:
        return (
          <PricingSection
            serviceType={selectedServiceType || 'residential'}
            enabled={pricingEnabled}
            onEnabledChange={setPricingEnabled}
            currentStep={currentStep}
            onGeneratingChange={setIsGeneratingContent}
            selectedTone={aiTone}
            onToneChange={handleAiToneChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <FormProvider {...form}>
      <div className="max-w-4xl mx-auto">
        <StepIndicator currentStep={currentStep} steps={STEPS} />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 bg-white rounded-2xl p-4"
          >
            {renderCurrentStep()}

            <div className="flex justify-between px-6 gap-6">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 1 ? () => router.back() : prevStep}
                className="flex items-center text-sm flex-1"
                size="lg"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </Button>

              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center text-sm flex-1"
                  size="lg"
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading || !form.watch('generated_content')?.trim()}
                  className="flex items-center flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Create Proposal
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </FormProvider>
  );
}
