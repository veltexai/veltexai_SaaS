'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import {
  ProposalFormData,
  proposalFormSchema,
  ServiceType,
} from '@/lib/validations/proposal';
import { ServiceTypeSelector } from '@/components/proposals/new/service-type-selector';
import { GlobalInputsSection } from '@/components/proposals/new/global-inputs-section';
import { ServiceSpecificSection } from '@/components/proposals/new/service-specific-section';
import { PricingSection } from '@/components/proposals/new/pricing-section';
import { validateProposalWithServiceData } from '@/lib/validations/proposal';

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
  const supabase = createClientComponentClient<Database>();

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
        property_type: undefined,
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
    },
  });

  // Initialize form with proposal data
  useEffect(() => {
    if (proposal && open) {
      form.reset({
        title: proposal.title,
        service_type: proposal.service_type as ServiceType,
        global_inputs: {
          client_name: proposal.client_name || '',
          client_email: proposal.client_email || '',
          client_company: proposal.client_company || '',
          contact_phone: proposal.contact_phone || '',
          service_location: proposal.service_location || '',
          facility_size: proposal.facility_size || 0,
          service_frequency: (proposal.service_frequency as "one-time" | "1x-month" | "bi-weekly" | "weekly" | "2x-week" | "3x-week" | "5x-week" | "daily") || 'one-time',
          regional_location: proposal.regional_location || '',
          property_type: (proposal.property_type as "office" | "restaurant" | "warehouse" | "daycare" | "medical" | "church" | "retail" | "school") || undefined,
        },
        service_specific_data:
          (proposal.service_specific_data as Record<string, any>) || {},
        pricing_enabled: proposal.pricing_enabled || false,
        pricing_data: (proposal.pricing_data as any) || undefined,
        generated_content: proposal.generated_content || '',
        status: proposal.status || 'draft',
        facility_details: (proposal.facility_details as any) || {
          building_age: undefined,
          building_type: undefined,
          accessibility_requirements: [],
          special_areas: [],
          equipment_present: [],
          environmental_concerns: [],
        },
        traffic_analysis: (proposal.traffic_analysis as any) || {
          staff_count: undefined,
          visitor_frequency: undefined,
          peak_hours: [],
          special_events: false,
          traffic_level: undefined,
        },
        service_scope: (proposal.service_scope as any) || {
          areas_included: [],
          areas_excluded: [],
          special_services: [],
          frequency_details: {},
        },
        special_requirements: (proposal.special_requirements as any) || {
          security_clearance: false,
          after_hours_access: false,
          special_equipment: [],
          certifications_required: [],
          insurance_requirements: [],
        },
      });
    }
  }, [proposal, open, form]);

  const onSubmit = async (data: any) => {
    try {
      setSaving(true);

      // Validate service-specific data
      const validatedData = validateProposalWithServiceData(data);

      // Update proposal in database
      const { data: updatedProposal, error } = await supabase
        .from('proposals')
        .update({
          title: validatedData.title,
          service_type: validatedData.service_type,
          client_name: validatedData.global_inputs.client_name,
          client_email: validatedData.global_inputs.client_email,
          client_company: validatedData.global_inputs.client_company,
          contact_phone: validatedData.global_inputs.contact_phone,
          service_location: validatedData.global_inputs.service_location,
          facility_size: validatedData.global_inputs.facility_size,
          service_frequency: validatedData.global_inputs.service_frequency,
          service_specific_data: validatedData.service_specific_data,
          pricing_enabled: validatedData.pricing_enabled,
          pricing_data: validatedData.pricing_data,
          generated_content: validatedData.generated_content,
          status: validatedData.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating proposal:', error);
        toast.error('Failed to update proposal');
        return;
      }

      toast.success('Proposal updated successfully');
      onProposalUpdated(updatedProposal);
    } catch (error) {
      console.error('Error updating proposal:', error);
      toast.error('Failed to update proposal');
    } finally {
      setSaving(false);
    }
  };

  const selectedServiceType = form.watch('service_type');

  // Reset service-specific data when service type changes
  useEffect(() => {
    form.setValue('service_specific_data', {});
  }, [selectedServiceType, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Proposal</DialogTitle>
          <DialogDescription>
            Update the proposal details, service requirements, and pricing.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="client">Client Details</TabsTrigger>
                <TabsTrigger value="service">Service Details</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
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

              <TabsContent value="pricing">
                <PricingSection
                  serviceType={selectedServiceType}
                  enabled={true}
                  onEnabledChange={() => {}}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (activeTab === 'basic') return;
                    const tabs = ['basic', 'client', 'service', 'pricing'];
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
                  onClick={() => {
                    if (activeTab === 'pricing') return;
                    const tabs = ['basic', 'client', 'service', 'pricing'];
                    const currentIndex = tabs.indexOf(activeTab);
                    setActiveTab(tabs[currentIndex + 1]);
                  }}
                  disabled={activeTab === 'pricing'}
                >
                  Next
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
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
