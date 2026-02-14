'use client';

import { useFormContext } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import {
  type ProposalFormData,
  type ServiceType,
} from '@/lib/validations/proposal';
import { Building, Home, Brush, Square, Grid3X3 } from 'lucide-react';

const serviceTypes = [
  {
    value: 'residential' as ServiceType,
    label: 'Residential Cleaning',
    description: 'Houses, apartments, condos, and townhouses',
    icon: Home,
  },
  {
    value: 'commercial' as ServiceType,
    label: 'Commercial Cleaning',
    description: 'Offices, retail spaces, and business facilities',
    icon: Building,
  },
  {
    value: 'carpet' as ServiceType,
    label: 'Carpet Cleaning',
    description: 'Deep cleaning and stain removal for carpets',
    icon: Brush,
  },
  {
    value: 'window' as ServiceType,
    label: 'Window Cleaning',
    description: 'Interior and exterior window cleaning services',
    icon: Square,
  },
  {
    value: 'floor' as ServiceType,
    label: 'Floor Care',
    description: 'Hardwood, tile, and specialty floor treatments',
    icon: Grid3X3,
  },
];

export function ServiceTypeSelector() {
  const form = useFormContext<ProposalFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Select Service Type</h2>
        <p className="text-muted-foreground">
          Choose the primary service type for this proposal. This will determine
          the specific fields and options available.
        </p>
      </div>

      <FormField
        control={form.control}
        name="service_type"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {serviceTypes.map((serviceType) => {
                  const Icon = serviceType.icon;
                  return (
                    <FormItem key={serviceType.value}>
                      <FormControl>
                        <RadioGroupItem
                          value={serviceType.value}
                          id={serviceType.value}
                          className="sr-only"
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor={serviceType.value}
                        className="cursor-pointer"
                      >
                        <Card
                          className={`transition-all hover:shadow-md ${
                            field.value === serviceType.value
                              ? 'ring-2 ring-primary border-primary'
                              : 'hover:border-primary/50'
                          }`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center space-x-3">
                              <Icon className="h-6 w-6 text-primary" />
                              <CardTitle className="text-lg">
                                {serviceType.label}
                              </CardTitle>
                            </div>
                            <CardDescription>
                              {serviceType.description}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </FormLabel>
                    </FormItem>
                  );
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Proposal Title *</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter a descriptive title for this proposal"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
