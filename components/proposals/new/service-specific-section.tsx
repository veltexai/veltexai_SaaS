'use client';

import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  type ProposalFormData,
  type ServiceType,
} from '@/lib/validations/proposal';
import {
  Home,
  Building,
  Brush,
  Square,
  Grid3X3,
  Plus,
  X,
  Layers,
} from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { InfoCard } from '@/components/ui/info-card';

interface ServiceSpecificSectionProps {
  serviceType: ServiceType;
}

export function ServiceSpecificSection({
  serviceType,
}: ServiceSpecificSectionProps) {
  const form = useFormContext<ProposalFormData>();
  const [newItem, setNewItem] = useState('');

  const addArrayItem = (fieldName: string, item: string) => {
    if (!item.trim()) return;

    const currentData = form.getValues('service_specific_data') || {};
    const currentArray = currentData[fieldName] || [];

    form.setValue('service_specific_data', {
      ...currentData,
      [fieldName]: [...currentArray, item.trim()],
    });
    setNewItem('');
  };

  const removeArrayItem = (fieldName: string, index: number) => {
    const currentData = form.getValues('service_specific_data') || {};
    const currentArray = currentData[fieldName] || [];

    form.setValue('service_specific_data', {
      ...currentData,
      [fieldName]: currentArray.filter((_: any, i: number) => i !== index),
    });
  };

  const renderResidentialForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="service_specific_data.home_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Home Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl className="w-full h-full">
                  <SelectTrigger>
                    <SelectValue placeholder="Select home type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service_specific_data.bedrooms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Bedrooms</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(
                      value === '' ? undefined : parseInt(value, 10) || 1
                    );
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="service_specific_data.bathrooms"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Number of Bathrooms</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="1"
                max="10"
                value={field.value || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(
                    value === '' ? undefined : parseInt(value, 10) || 1
                  );
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="service_specific_data.pets"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <InfoCard
                  title="Pets in Home"
                  description="Check if there are pets that need special consideration during cleaning"
                  imageSrc="/illustrations/Adopt_a_pet-rafiki.svg"
                  imageAlt="Pets"
                  isSelected={field.value}
                  onClick={() => field.onChange(!field.value)}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="service_specific_data.cleaning_supplies_provided"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <InfoCard
                  title="Client Provides Cleaning Supplies"
                  description="Client will provide all necessary cleaning supplies and equipment"
                  imageSrc="/illustrations/cleaning-supplies.svg"
                  imageAlt="Cleaning Supplies"
                  isSelected={field.value}
                  onClick={() => field.onChange(!field.value)}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {form.watch('service_specific_data.pets') && (
        <FormField
          control={form.control}
          name="service_specific_data.pet_details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pet Details</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe pets (type, number, special considerations)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="service_specific_data.special_instructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Special Instructions</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Any special instructions or requirements"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderCommercialForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="service_specific_data.business_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Type</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Office, Retail, Restaurant"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service_specific_data.employee_count"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Employees</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value) || 1)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="service_specific_data.operating_hours"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Operating Hours</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Monday-Friday 9AM-5PM" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="service_specific_data.cleaning_schedule_preference"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cleaning Schedule Preference</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select preference" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="before_hours">
                  Before Business Hours
                </SelectItem>
                <SelectItem value="after_hours">
                  After Business Hours
                </SelectItem>
                <SelectItem value="during_hours">
                  During Business Hours
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="service_specific_data.security_requirements"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Security Requirements</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Access codes, key procedures, security protocols"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderCarpetForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="service_specific_data.carpet_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Carpet Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select carpet type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="wool">Wool</SelectItem>
                  <SelectItem value="nylon">Nylon</SelectItem>
                  <SelectItem value="polyester">Polyester</SelectItem>
                  <SelectItem value="olefin">Olefin</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service_specific_data.carpet_age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Carpet Age</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select carpet age" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="new">New (Less than 1 year)</SelectItem>
                  <SelectItem value="1-3_years">1-3 Years</SelectItem>
                  <SelectItem value="3-5_years">3-5 Years</SelectItem>
                  <SelectItem value="5+_years">5+ Years</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="service_specific_data.pet_odors"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Pet Odors Present</FormLabel>
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="service_specific_data.protection_treatment"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Apply Protection Treatment</FormLabel>
            </div>
          </FormItem>
        )}
      />
    </div>
  );

  const renderWindowForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="service_specific_data.window_count"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Windows</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value) || 1)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service_specific_data.story_height"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Building Height</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select height" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="single">Single Story</SelectItem>
                  <SelectItem value="two">Two Story</SelectItem>
                  <SelectItem value="three_plus">Three+ Stories</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="service_specific_data.screen_cleaning"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Include Screen Cleaning</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service_specific_data.sill_cleaning"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Include Sill Cleaning</FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="service_specific_data.exterior_access"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Exterior Access</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select access type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="ground_level">Ground Level Only</SelectItem>
                <SelectItem value="ladder_required">Ladder Required</SelectItem>
                <SelectItem value="lift_required">Lift Required</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderFloorForm = () => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="service_specific_data.floor_condition"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Floor Condition</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="service_specific_data.furniture_moving"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Furniture Moving Required</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service_specific_data.drying_time_preference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Drying Time Preference</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="quick_dry">Quick Dry</SelectItem>
                  <SelectItem value="overnight">Overnight</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const getServiceIcon = () => {
    switch (serviceType) {
      case 'residential':
        return Home;
      case 'commercial':
        return Building;
      case 'carpet':
        return Layers;
      case 'window':
        return Square;
      case 'floor':
        return Grid3X3;
      default:
        return Home;
    }
  };

  const getServiceTitle = () => {
    switch (serviceType) {
      case 'residential':
        return 'Residential Cleaning Details';
      case 'commercial':
        return 'Commercial Cleaning Details';
      case 'carpet':
        return 'Carpet Cleaning Details';
      case 'window':
        return 'Window Cleaning Details';
      case 'floor':
        return 'Floor Care Details';
      default:
        return 'Service Details';
    }
  };

  const renderServiceForm = () => {
    switch (serviceType) {
      case 'residential':
        return renderResidentialForm();
      case 'commercial':
        return renderCommercialForm();
      case 'carpet':
        return renderCarpetForm();
      case 'window':
        return renderWindowForm();
      case 'floor':
        return renderFloorForm();
      default:
        return null;
    }
  };

  const ServiceIcon = getServiceIcon();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">{getServiceTitle()}</h2>
        <p className="text-muted-foreground">
          Provide specific details for the {serviceType} service to generate
          accurate proposals.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ServiceIcon className="h-5 w-5" />
            <span>Service-Specific Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>{renderServiceForm()}</CardContent>
      </Card>
    </div>
  );
}
