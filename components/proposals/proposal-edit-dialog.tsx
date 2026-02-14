'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { type Database } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Loader2,
  Save,
  FileText,
  User,
  Settings,
  Building2,
  DollarSign,
} from 'lucide-react';
import {
  proposalFormSchema,
  ServiceType,
} from '@/lib/validations/proposal';
import { ServiceTypeSelector } from '@/features/proposals/components/new/service-type-selector';
import { GlobalInputsSection } from '@/components/proposals/new/global-inputs-section';
import { ServiceSpecificSection } from '@/components/proposals/new/service-specific-section';
import { PricingSection } from '@/components/proposals/new/pricing-section';
import { EnhancedFacilitySection } from '@/components/proposals/new/enhanced-facility-section';
import { validateProposalWithServiceData } from '@/lib/validations/proposal';
import { getValidationMessage } from '@/features/proposals';

type Proposal = Database['public']['Tables']['proposals']['Row'];

interface ProposalEditDialogProps {
  proposal: Proposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProposalUpdated: (proposal: Proposal) => void;
}

export function ProposalEditDialog({
  proposal,
  open,
  onOpenChange,
  onProposalUpdated,
}: ProposalEditDialogProps) {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [pricingEnabled, setPricingEnabled] = useState(false);
  const [aiTone, setAiTone] = useState<'professional' | 'friendly' | 'formal' | 'casual' | 'technical'>('professional');
  const supabase = createClient();

  const form = useForm({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      title: '',
      service_type: 'residential',
      global_inputs: {
        client_name: '',
        client_email: '',
        client_company: '',
        contact_phone: '',
        service_location: '',
        facility_size: 0,
        service_frequency: 'one-time',
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
        special_notes: '',
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

  // Initialize form with proposal data
  useEffect(() => {
    if (proposal && open) {
      // Set pricing enabled state - auto-enable if proposal has pricing data
      const hasExistingPricing = proposal.pricing_data && 
        typeof proposal.pricing_data === 'object' && 
        proposal.pricing_data !== null &&
        Object.keys(proposal.pricing_data).length > 0;
      
      setPricingEnabled(hasExistingPricing || proposal.pricing_enabled || false);
      
      // Set AI tone from proposal data or default
      const proposalAiTone = (proposal.ai_tone as 'professional' | 'friendly' | 'formal' | 'casual' | 'technical') ?? 'professional';
      setAiTone(proposalAiTone);

      form.reset({
        title: proposal.title,
        service_type: proposal.service_type as ServiceType,
        template_id: proposal.template_id ?? undefined,
        global_inputs: {
          client_name: proposal.client_name || '',
          client_email: proposal.client_email || '',
          client_company: proposal.client_company || '',
          contact_phone: proposal.contact_phone || '',
          service_location: proposal.service_location || '',
          facility_size: proposal.facility_size || 0,
          service_frequency:
            (proposal.service_frequency as
              | 'one-time'
              | '1x-month'
              | 'bi-weekly'
              | 'weekly'
              | '2x-week'
              | '3x-week'
              | '5x-week'
              | 'daily') || 'one-time',
          regional_location: proposal.regional_location || '',
        },
        service_specific_data:
          (proposal.service_specific_data as Record<string, any>) || {},
        pricing_enabled: proposal.pricing_enabled || false,
        pricing_data: (proposal.pricing_data as any) || undefined,
        generated_content: proposal.generated_content || '',
        status: proposal.status || 'draft',
        facility_details: proposal.facility_details
          ? (proposal.facility_details as any)
          : {
              building_age: undefined,
              building_type: undefined,
              accessibility_requirements: [],
              special_areas: [],
              equipment_present: [],
              environmental_concerns: [],
            },
        traffic_analysis: proposal.traffic_analysis
          ? (proposal.traffic_analysis as any)
          : {
              staff_count: undefined,
              visitor_frequency: undefined,
              peak_hours: [],
              special_events: false,
              traffic_level: undefined,
            },
        service_scope: (() => {
          // Handle case where service_scope might be an array or invalid format
          if (
            proposal.service_scope &&
            typeof proposal.service_scope === 'object' &&
            !Array.isArray(proposal.service_scope)
          ) {
            const scope = proposal.service_scope as any;
            return {
              areas_included: Array.isArray(scope.areas_included)
                ? scope.areas_included
                : [],
              areas_excluded: Array.isArray(scope.areas_excluded)
                ? scope.areas_excluded
                : [],
              special_services: Array.isArray(scope.special_services)
                ? scope.special_services
                : [],
              frequency_details:
                scope.frequency_details &&
                typeof scope.frequency_details === 'object'
                  ? scope.frequency_details
                  : {},
              special_notes:
                typeof scope.special_notes === 'string' ? scope.special_notes : '',
            };
          }
          // Default fallback
          return {
            areas_included: [],
            areas_excluded: [],
            special_services: [],
            frequency_details: {},
            special_notes: '',
          };
        })(),
        special_requirements: proposal.special_requirements
          ? (proposal.special_requirements as any)
          : {
              security_clearance: false,
              after_hours_access: false,
              special_equipment: [],
              certifications_required: [],
              insurance_requirements: [],
            },
        ai_tone: proposalAiTone,
      });
    }
  }, [proposal, open, form]);

  const onSubmit = async (data: any) => {
    console.log('Data submitted:', data);
    try {
      setSaving(true);

      let validatedData;
      try {
        // Try to validate service-specific data
        validatedData = validateProposalWithServiceData(data);
        console.log('Validated data:', validatedData);
      } catch (validationError) {
        console.warn('Validation failed, using raw data:', validationError);
        // Fallback to using the raw data with basic structure
        validatedData = {
          ...data,
          service_specific_data: data.service_specific_data || {},
          facility_details: data.facility_details || {},
          traffic_analysis: data.traffic_analysis || {},
          service_scope: data.service_scope || {},
          special_requirements: data.special_requirements || {},
        };
      }

      // Prepare base update payload with only guaranteed fields (keep proposal's template)
      const updatePayload: any = {
        title: validatedData.title,
        service_type: validatedData.service_type,
        template_id: proposal.template_id ?? undefined,
        client_name: validatedData.global_inputs?.client_name,
        client_email: validatedData.global_inputs?.client_email,
        client_company: validatedData.global_inputs?.client_company,
        contact_phone: validatedData.global_inputs?.contact_phone,
        service_location: validatedData.global_inputs?.service_location,
        facility_size: validatedData.global_inputs?.facility_size,
        service_frequency: validatedData.global_inputs?.service_frequency,
        global_inputs: validatedData.global_inputs,
        service_specific_data: validatedData.service_specific_data,
        pricing_enabled: validatedData.pricing_enabled,
        pricing_data: validatedData.pricing_data,
        generated_content: validatedData.generated_content,
        status: validatedData.status,
        updated_at: new Date().toISOString(),
      };

      // Add enhanced fields only if they exist in the current proposal (indicating the migration was applied)
      if (proposal.facility_details !== undefined) {
        updatePayload.facility_details = validatedData.facility_details;
      }
      if (proposal.traffic_analysis !== undefined) {
        updatePayload.traffic_analysis = validatedData.traffic_analysis;
      }
      if (proposal.service_scope !== undefined) {
        updatePayload.service_scope = validatedData.service_scope;
      }
      if (proposal.special_requirements !== undefined) {
        updatePayload.special_requirements = validatedData.special_requirements;
      }
      if (proposal.regional_location !== undefined) {
        updatePayload.regional_location =
          validatedData.global_inputs?.regional_location;
      }

      // Ensure JSON fields are properly serialized
      console.log('Validating JSON fields before update...');
      try {
        if (updatePayload.global_inputs) {
          JSON.stringify(updatePayload.global_inputs);
        }
        if (updatePayload.service_specific_data) {
          JSON.stringify(updatePayload.service_specific_data);
        }
        if (updatePayload.pricing_data) {
          JSON.stringify(updatePayload.pricing_data);
        }
        if (updatePayload.facility_details) {
          JSON.stringify(updatePayload.facility_details);
        }
        if (updatePayload.traffic_analysis) {
          JSON.stringify(updatePayload.traffic_analysis);
        }
        if (updatePayload.service_scope) {
          JSON.stringify(updatePayload.service_scope);
        }
        if (updatePayload.special_requirements) {
          JSON.stringify(updatePayload.special_requirements);
        }
        console.log('All JSON fields are valid');
      } catch (jsonError) {
        console.error('Invalid JSON data:', jsonError);
        toast.error('Invalid data format. Please check your inputs.');
        return;
      }

      console.log('Update payload:', updatePayload);
      console.log('Proposal ID:', proposal.id);

      // Check current user for debugging
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        toast.error('Authentication error');
        return;
      }
      console.log('Current user:', user?.id);

      // First, verify the proposal exists and we can access it
      const { data: existingProposal, error: fetchError } = await supabase
        .from('proposals')
        .select('id, user_id, status')
        .eq('id', proposal.id)
        .single();

      if (fetchError) {
        console.error('Error fetching existing proposal:', fetchError);
        toast.error(`Failed to fetch proposal: ${fetchError.message}`);
        return;
      }

      if (!existingProposal) {
        console.error('Proposal not found with ID:', proposal.id);
        toast.error('Proposal not found');
        return;
      }

      console.log('Existing proposal found:', existingProposal);

      // Update proposal in database
      const { data: updatedProposals, error } = await supabase
        .from('proposals')
        .update(updatePayload)
        .eq('id', proposal.id)
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        toast.error(`Failed to update proposal: ${error.message}`);
        return;
      }

      if (!updatedProposals || updatedProposals.length === 0) {
        console.error('No proposal was updated');
        toast.error('Failed to update proposal: No records updated');
        return;
      }

      const updatedProposal = updatedProposals[0];
      console.log('Updated proposal:', updatedProposal);
      toast.success('Proposal updated successfully');
      onProposalUpdated(updatedProposal);
      onOpenChange(false);
    } catch (error) {
      console.error('Validation or other error:', error);
      toast.error(
        `Failed to update proposal: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedServiceType = form.watch('service_type');

  // Reset service-specific data when service type changes
  useEffect(() => {
    form.setValue('service_specific_data', {});
  }, [selectedServiceType, form]);

  const handlePricingEnabledChange = (enabled: boolean) => {
    setPricingEnabled(enabled);
    form.setValue('pricing_enabled', enabled, {
      shouldValidate: false,
      shouldTouch: false,
      shouldDirty: false,
    });
  };

  const handleAiToneChange = (tone: 'professional' | 'friendly' | 'formal' | 'casual' | 'technical') => {
    setAiTone(tone);
    form.setValue('ai_tone', tone, {
      shouldValidate: false,
      shouldTouch: false,
      shouldDirty: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-h-[90vh] h-full overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Proposal</DialogTitle>
          <DialogDescription>
            Update the proposal details, service requirements, and pricing.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              const firstError = Object.keys(errors)[0];
              const message = firstError
                ? getValidationMessage(errors, firstError)
                : 'Please fix the errors in the form.';
              toast.error(message);
              // Switch to the tab that likely contains the first error
              if (firstError?.startsWith('global_inputs')) setActiveTab('client');
              else if (firstError === 'title' || firstError === 'service_type') setActiveTab('basic');
              else if (firstError === 'service_specific_data') setActiveTab('service');
              else if (firstError?.startsWith('facility_') || firstError?.startsWith('traffic_') || firstError?.startsWith('service_scope') || firstError?.startsWith('special_requirements')) setActiveTab('facility');
              else if (firstError?.startsWith('pricing')) setActiveTab('pricing');
            })}
            className="space-y-6"
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              <TabsList className="flex w-full flex-nowrap overflow-x-auto gap-1 p-1 md:grid md:grid-cols-5 md:overflow-visible">
                <TabsTrigger
                  value="basic"
                  className="flex shrink-0 items-center gap-1.5 md:flex-1"
                  title="Basic Info"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">Basic Info</span>
                </TabsTrigger>
                <TabsTrigger
                  value="client"
                  className="flex shrink-0 items-center gap-1.5 md:flex-1"
                  title="Client Details"
                >
                  <User className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">Client Details</span>
                </TabsTrigger>
                <TabsTrigger
                  value="service"
                  className="flex shrink-0 items-center gap-1.5 md:flex-1"
                  title="Service Details"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">Service Details</span>
                </TabsTrigger>
                <TabsTrigger
                  value="facility"
                  className="flex shrink-0 items-center gap-1.5 md:flex-1"
                  title="Facility Details"
                >
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">Facility Details</span>
                </TabsTrigger>
                <TabsTrigger
                  value="pricing"
                  className="flex shrink-0 items-center gap-1.5 md:flex-1"
                  title="Pricing"
                >
                  <DollarSign className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">Pricing</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposal Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter proposal title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <ServiceTypeSelector />
              </TabsContent>

              <TabsContent value="client">
                <GlobalInputsSection />
              </TabsContent>

              <TabsContent value="service">
                <ServiceSpecificSection serviceType={selectedServiceType} />
              </TabsContent>

              <TabsContent value="facility">
                <EnhancedFacilitySection proposalId={proposal.id} serviceType={selectedServiceType} />
              </TabsContent>

              <TabsContent value="pricing" className='min-h-[calc(100vh-300px)]'>
                <PricingSection
                  proposalId={proposal.id}
                  serviceType={selectedServiceType}
                  enabled={pricingEnabled}
                  onEnabledChange={handlePricingEnabledChange}
                  selectedTone={aiTone}
                  onToneChange={handleAiToneChange}
                  existingPricingData={proposal.pricing_data}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-initial"
                  onClick={() => {
                    if (activeTab === 'basic') return;
                    const tabs = [
                      'basic',
                      'client',
                      'service',
                      'facility',
                      'pricing',
                    ];
                    const currentIndex = tabs.indexOf(activeTab);
                    setActiveTab(tabs[currentIndex - 1]);
                  }}
                  disabled={activeTab === 'basic'}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-initial"
                  onClick={() => {
                    if (activeTab === 'pricing') return;
                    const tabs = [
                      'basic',
                      'client',
                      'service',
                      'facility',
                      'pricing',
                    ];
                    const currentIndex = tabs.indexOf(activeTab);
                    setActiveTab(tabs[currentIndex + 1]);
                  }}
                  disabled={activeTab === 'pricing'}
                >
                  Next
                </Button>
              </div>

              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-initial"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 sm:flex-initial"
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
