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
import { type ProposalFormData } from '@/lib/validations/proposal';
import { User, Mail, Building, Phone, MapPin, Ruler } from 'lucide-react';

const serviceFrequencyOptions = [
  { value: 'one-time', label: 'One-time Service' },
  { value: '1x-month', label: 'Once per Month' },
  { value: 'bi-weekly', label: 'Bi-weekly (Every 2 weeks)' },
  { value: 'weekly', label: 'Weekly' },
  { value: '2x-week', label: '2x Week' },
  { value: '3x-week', label: '3x Week' },
  { value: '5x-week', label: '5x Week' },
  { value: '6x-week', label: '6x Week' },
  { value: 'daily', label: 'Daily' },
];

const propertyTypeOptions = [
  { value: 'office', label: 'Office Building' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'daycare', label: 'Daycare Center' },
  { value: 'medical', label: 'Medical Facility' },
  { value: 'church', label: 'Church/Religious' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'school', label: 'School/Educational' },
];

export function GlobalInputsSection() {
  const form = useFormContext<ProposalFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Client Information</h2>
        <p className="text-muted-foreground">
          Enter the client's contact details and basic service requirements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Contact Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="global_inputs.client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter client's full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="global_inputs.client_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="client@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="global_inputs.client_company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="global_inputs.contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Service Location &amp; Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="global_inputs.service_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Address *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Full address where service will be performed"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="global_inputs.facility_size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility Size (sq ft) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter square footage"
                      value={field.value || ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const digits = raw.replace(/[^\d]/g, '');
                        const sanitized = digits.replace(/^0+(?!$)/, '');
                        field.onChange(
                          sanitized === '' ? undefined : parseInt(sanitized, 10)
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="global_inputs.service_frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Frequency *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceFrequencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
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
              name="global_inputs.regional_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Regional Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Seattle, WA"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="global_inputs.property_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {propertyTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
