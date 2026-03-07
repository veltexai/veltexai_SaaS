'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, Building2 } from 'lucide-react';
import {
  useCompanyProfile,
  type CompanyProfileUpdate,
} from '@/hooks/use-company-profile';
import { useImageUpload } from '@/hooks/use-image-upload';
import { toast } from 'sonner';

// Validation schema for company profile
const companyProfileSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(255),
  contact_info: z.object({
    primary_contact: z.string().optional(),
    phone: z.string().optional(),
    email: z
      .string()
      .email('Invalid email format')
      .optional()
      .or(z.literal('')),
    address: z.string().optional(),
    billing_contact: z.string().optional(),
    emergency_contact: z.string().optional(),
  }),
  logo_url: z.string().url().optional().or(z.literal('')).or(z.null()),
  company_background: z.string().optional(),
  service_references: z.array(
    z.object({
      client_name: z.string().optional(),
      service_type: z.string().optional(),
      duration: z.string().optional(),
      contact_info: z.string().optional(),
      testimonial: z.string().optional(),
    })
  ),
});

type CompanyProfileFormData = z.infer<typeof companyProfileSchema>;

export function CompanyProfileSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [savedUrl, setSavedUrl] = useState<string>('');
  const {
    fetchCompanyProfile,
    updateCompanyProfile,
    createCompanyProfile,
    isUpdating,
  } = useCompanyProfile();
  const {
    uploadImage,
    isUploading,
    logoPreview: preview,
    resetToSaved,
  } = useImageUpload({
    initialUrl: savedUrl || null,
    bucket: 'company-logos',
    folder: 'company-profiles',
  });

  const form = useForm<CompanyProfileFormData>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      company_name: '',
      contact_info: {
        primary_contact: '',
        phone: '',
        email: '',
        address: '',
        billing_contact: '',
        emergency_contact: '',
      },
      logo_url: '',
      company_background: '',
      service_references: [],
    },
  });

  const { watch, setValue, getValues } = form;
  const serviceReferences = watch('service_references');

  // Load existing company profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await fetchCompanyProfile();
        if (profile) {
          form.reset({
            company_name: profile.company_name || '',
            contact_info: {
              primary_contact: profile.contact_info?.primary_contact || '',
              phone: profile.contact_info?.phone || '',
              email: profile.contact_info?.email || '',
              address: profile.contact_info?.address || '',
              billing_contact: profile.contact_info?.billing_contact || '',
              emergency_contact: profile.contact_info?.emergency_contact || '',
            },
            logo_url: profile.logo_url || '',
            company_background: profile.company_background || '',
            service_references: profile.service_references || [],
          });
          setSavedUrl(profile.logo_url || '');
        }
      } catch (error) {
        console.error('Failed to load company profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [fetchCompanyProfile, form, setSavedUrl]);

  // Handle logo upload
  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const uploadedUrl = await uploadImage(file);
      if (uploadedUrl) {
        setValue('logo_url', uploadedUrl);
        setSavedUrl(uploadedUrl);
      }
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo');
    }
  };

  // Add new service reference
  const addServiceReference = () => {
    const currentReferences = getValues('service_references');
    setValue('service_references', [
      ...currentReferences,
      {
        client_name: '',
        service_type: '',
        duration: '',
        contact_info: '',
        testimonial: '',
      },
    ]);
  };

  // Remove service reference
  const removeServiceReference = (index: number) => {
    const currentReferences = getValues('service_references');
    setValue(
      'service_references',
      currentReferences.filter((_, i) => i !== index)
    );
  };

  // Handle form submission
  const onSubmit = async (data: CompanyProfileFormData) => {
    try {
      const profileData: CompanyProfileUpdate = {
        ...data,
        logo_url: savedUrl || data.logo_url || null,
      };

      // Try to update first, create if doesn't exist
      const result = await updateCompanyProfile(profileData);
      if (!result) {
        // If update failed, try creating
        await createCompanyProfile(profileData);
      }
    } catch (error) {
      console.error('Failed to save company profile:', error);
      toast.error('Failed to save company profile');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Profile
          </CardTitle>
          <CardDescription>Loading company profile...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Profile
        </CardTitle>
        <CardDescription>
          Manage your company information and service references for
          professional proposals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  {...form.register('company_name')}
                  placeholder="Enter company name"
                />
                {form.formState.errors.company_name && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.company_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary_contact">Primary Contact</Label>
                <Input
                  id="primary_contact"
                  {...form.register('contact_info.primary_contact')}
                  placeholder="Primary contact person"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_background">Company Background</Label>
              <Textarea
                id="company_background"
                {...form.register('company_background')}
                placeholder="Brief description of your company, services, and expertise..."
                rows={4}
              />
            </div>
          </div>

          <Separator />

          {/* Company Logo */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Company Logo</h3>

            <div className="flex items-center gap-4">
              {(preview || savedUrl) && (
                <div className="relative">
                  <img
                    src={preview || savedUrl}
                    alt="Company logo"
                    className="h-20 w-20 object-contain border rounded-lg"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="logo_upload">Upload Logo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="logo_upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {isUploading && (
                    <Badge variant="secondary">Uploading...</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Recommended: PNG or JPG, max 2MB
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...form.register('contact_info.phone')}
                  placeholder="Company phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('contact_info.email')}
                  placeholder="company@example.com"
                />
                {form.formState.errors.contact_info?.email && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.contact_info.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                {...form.register('contact_info.address')}
                placeholder="Company address"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_contact">Billing Contact</Label>
                <Input
                  id="billing_contact"
                  {...form.register('contact_info.billing_contact')}
                  placeholder="Billing contact person"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  {...form.register('contact_info.emergency_contact')}
                  placeholder="Emergency contact information"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Service References */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Service References</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addServiceReference}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Reference
              </Button>
            </div>

            {serviceReferences.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No service references added yet. Add references to showcase your
                experience.
              </p>
            ) : (
              <div className="space-y-4">
                {serviceReferences.map((_, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Reference #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeServiceReference(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`client_name_${index}`}>
                          Client Name
                        </Label>
                        <Input
                          id={`client_name_${index}`}
                          {...form.register(
                            `service_references.${index}.client_name`
                          )}
                          placeholder="Client company name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`service_type_${index}`}>
                          Service Type
                        </Label>
                        <Input
                          id={`service_type_${index}`}
                          {...form.register(
                            `service_references.${index}.service_type`
                          )}
                          placeholder="Type of service provided"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`duration_${index}`}>Duration</Label>
                        <Input
                          id={`duration_${index}`}
                          {...form.register(
                            `service_references.${index}.duration`
                          )}
                          placeholder="e.g., 6 months, 2 years"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`contact_info_${index}`}>
                          Contact Info
                        </Label>
                        <Input
                          id={`contact_info_${index}`}
                          {...form.register(
                            `service_references.${index}.contact_info`
                          )}
                          placeholder="Reference contact information"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Label htmlFor={`testimonial_${index}`}>
                        Testimonial
                      </Label>
                      <Textarea
                        id={`testimonial_${index}`}
                        {...form.register(
                          `service_references.${index}.testimonial`
                        )}
                        placeholder="Client testimonial or project description..."
                        rows={3}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isUpdating || isUploading}
              className="min-w-[120px]"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}