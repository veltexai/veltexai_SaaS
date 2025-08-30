'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { Loader2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  proposalFormSchema,
  type ProposalFormData,
} from '@/lib/validations/proposal';
import { ClientInfoSection } from './client-info-section';
import { ProposalDetailsSection } from './proposal-details-section';
import { ServiceDetailsSection } from './service-details-section';
import { AttachmentsSection } from './attachments-section';
import { AIContentGenerator } from './ai-content-generator';
import { cn } from '@/lib/utils';

interface ProposalFormProps {
  userId: string;
}

const STEPS = [
  {
    id: 1,
    title: 'Client Info',
    description: 'Client details and contact information',
  },
  {
    id: 2,
    title: 'Proposal Details',
    description: 'Project scope and requirements',
  },
  {
    id: 3,
    title: 'Service Details',
    description: 'Services and specifications',
  },
  {
    id: 4,
    title: 'Attachments',
    description: 'Optional files and generate content',
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
    <div className="mb-8">
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
              <div className="mt-3 text-center max-w-[120px]">
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
  const [generatedContent, setGeneratedContent] = useState('');

  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      client_name: '',
      client_email: '',
      client_company: '',
      contact_phone: '',
      service_location: '',
      title: '',
      budget_range: '',
      timeline: '',
      project_description: '',
      services_offered: '',
      service_frequency: 'monthly',
      square_footage: '',
      desired_start_date: '',
      special_requirements: '',
      attachments: [],
    },
  });

  const validateCurrentStep = async () => {
    const fieldsToValidate = {
      1: [
        'client_name',
        'client_email',
        'client_company',
        'contact_phone',
        'service_location',
      ],
      2: ['title', 'budget_range', 'timeline', 'project_description'],
      3: [
        'services_offered',
        'service_frequency',
        'square_footage',
        'desired_start_date',
      ],
      4: [], // Attachments are optional
    };

    const fields =
      fieldsToValidate[currentStep as keyof typeof fieldsToValidate];
    const isValid = await form.trigger(fields as any);
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

  const onSubmit = async (data: ProposalFormData) => {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      const { data: proposalData, error: insertError } = await supabase
        .from('proposals')
        .insert({
          user_id: userId,
          title: data.title,
          client_name: data.client_name,
          client_email: data.client_email,
          client_company: data.client_company,
          contact_phone: data.contact_phone,
          service_location: data.service_location,
          project_description: data.project_description,
          budget_range: data.budget_range,
          timeline: data.timeline,
          services_offered: data.services_offered,
          service_frequency: data.service_frequency,
          square_footage: data.square_footage,
          desired_start_date: data.desired_start_date,
          special_requirements: data.special_requirements,
          content: generatedContent,
          status: 'draft',
          value: parseFloat(data.budget_range.replace(/[^0-9.-]+/g, '')) || 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Handle file uploads if attachments exist
      const uploadedFiles = [];
      if (data.attachments && data.attachments.length > 0) {
        for (const file of data.attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${proposalData.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('proposal-attachments')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
          } else {
            uploadedFiles.push({
              name: file.name,
              path: fileName,
              size: file.size,
            });
          }
        }

        // Update proposal with attachment URLs
        if (uploadedFiles.length > 0) {
          await supabase
            .from('proposals')
            .update({ attachments: uploadedFiles })
            .eq('id', proposalData.id);
        }
      }

      router.push(`/dashboard/proposals/${proposalData.id}`);
    } catch (error) {
      console.error('Error creating proposal:', error);
      setError('Failed to create proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid grid-cols-1 gap-6">
            <ClientInfoSection form={form} />
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 gap-6">
            <ProposalDetailsSection form={form} />
          </div>
        );
      case 3:
        return (
          <div className="grid grid-cols-1 gap-6">
            <ServiceDetailsSection form={form} />
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <AttachmentsSection form={form} />
            <AIContentGenerator
              form={form.watch()}
              generatedContent={generatedContent}
              onContentGenerated={setGeneratedContent}
              onError={setError}
            />
          </div>
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {renderCurrentStep()}

          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? () => router.back() : prevStep}
              className="flex items-center text-sm"
              size="lg"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={nextStep}
                className="flex items-center text-sm"
                size="lg"
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center"
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
      </div>
    </FormProvider>
  );
}
