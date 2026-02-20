'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  proposalFormSchema,
  type ProposalFormData,
  type ServiceType,
  validateProposalWithServiceData,
  getServiceSpecificSchema,
} from '@/lib/validations/proposal';
import { ServiceTypeSelector } from './service-type-selector';
import { GlobalInputsSection } from '../../../../components/proposals/new/global-inputs-section';
import { ServiceSpecificSection } from '../../../../components/proposals/new/service-specific-section';
import { EnhancedFacilitySection } from '../../../../components/proposals/new/enhanced-facility-section';
import { PricingSection } from '../../../../components/proposals/new/pricing-section';
import { cn } from '@/lib/utils';
import z from 'zod';
import { useUserTier } from '@/features/proposals/hooks/use-user-tier';
import { AiTone } from '@/types/proposal';
import { FieldPath } from 'react-hook-form';
import { scrollToTopOnMobile } from '@/lib/scroll';
import { FormNavigation, TemplateSelectionSection } from '@/features/proposals';

interface ProposalFormProps {
  userId: string;
}

interface Step {
  id: number;
  title: string;
  description: string;
}


const STEPS = [
  {
    id: 1,
    title: 'Facility Intelligence Input',
    description: 'Service type & facility context',
  },
  {
    id: 2,
    title: 'Client-Ready Output Format',
    description: 'Choose proposal template',
  },
  {
    id: 3,
    title: 'Client & Site Context',
    description: 'Client details and contact information',
  },
  {
    id: 4,
    title: 'Scope & Frequency Logic',
    description: 'Services, specs, and frequencies',
  },
  {
    id: 5,
    title: 'Facility Intelligence Detail',
    description: 'Enhanced facility information',
  },
  {
    id: 6,
    title: 'Labor + Margin Modeling',
    description: 'Pricing from labor and margin rules',
  },
];

const STEP_VALIDATION_FIELDS: Record<number, string[]> = {
  1: ['service_type', 'title'],
  2: [],
  3: [
    'global_inputs.client_name',
    'global_inputs.client_email',
    'global_inputs.contact_phone',
    'global_inputs.service_location',
    'global_inputs.facility_size',
  ],
  4: [],
  5: [],
  6: ['generated_content'],
};

function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: Step[];
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
  const [selectedServiceType, setSelectedServiceType] =
    useState<ServiceType | null>(null);
  const [pricingEnabled, setPricingEnabled] = useState(false);
  const userTier = useUserTier(userId);

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
        city: '',
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

  const aiTone = form.watch('ai_tone') as AiTone;
  const handleAiToneChange = (tone: AiTone) => {
    form.setValue('ai_tone', tone, {
      shouldValidate: false,
      shouldTouch: false,
      shouldDirty: false,
    });
  };

  const validateCurrentStep = async () => {
    const fieldsToValidate = STEP_VALIDATION_FIELDS[currentStep] ?? [];

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
            form.setError(fieldPath as FieldPath<ProposalFormData>, {
              type: 'manual',
              message: err.message,
            });
          });
        }
        return false;
      }
      return true;
    }

    // If no fields to validate for this step, skip trigger entirely.
    // Calling form.trigger([]) validates ALL fields, which can cause
    // the form to enter a fully-valid state and auto-submit on re-render.
    if (fieldsToValidate.length === 0) {
      return true;
    }

    const isValid = await form.trigger(fieldsToValidate as any);

    return isValid;
  };

  const nextStep = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      scrollToTopOnMobile();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      scrollToTopOnMobile();
    }
  };

  const onSubmit = async (data: ProposalFormData): Promise<void> => {
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


  const resolvedServiceType: ServiceType = selectedServiceType ?? 'residential';

  const STEP_COMPONENTS: Record<number, React.ReactNode> = {
    1: <ServiceTypeSelector />,
    2: <TemplateSelectionSection userTier={userTier} />,
    3: <GlobalInputsSection />,
    4: <ServiceSpecificSection serviceType={resolvedServiceType} />,
    5: <EnhancedFacilitySection serviceType={resolvedServiceType} />,
    6: (
      <PricingSection
        serviceType={resolvedServiceType}
        enabled={pricingEnabled}
        onEnabledChange={setPricingEnabled}
        currentStep={currentStep}
        selectedTone={aiTone}
        onToneChange={handleAiToneChange}
      />
    ),
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
            {STEP_COMPONENTS[currentStep] ?? null}

            <FormNavigation
              currentStep={currentStep}
              totalSteps={STEPS.length}
              isLoading={loading}
              isSubmitDisabled={!form.formState.isValid}
              onNext={nextStep}
              onBack={prevStep}
              onCancel={() => router.push('/dashboard/proposals')}
            />
          </form>
        </Card>
      </div>
    </FormProvider>
  );
}
