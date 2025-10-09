import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { ProposalFormData } from '@/lib/validations/proposal';

interface ServiceDetailsSectionProps {
  form: UseFormReturn<ProposalFormData>;
}

export function ServiceDetailsSection({ form }: ServiceDetailsSectionProps) {
  return (
    <>
      <CardHeader>
        <CardTitle>Service Details</CardTitle>
        <CardDescription>
          Specific information about the services to be provided
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Services offered field removed - not in schema */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="global_inputs.service_frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Frequency *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl className="w-full">
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="1x-month">Monthly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                    <SelectItem value="2x-week">2x per week</SelectItem>
                    <SelectItem value="3x-week">3x per week</SelectItem>
                    <SelectItem value="5x-week">5x per week</SelectItem>
                    <SelectItem value="one-time">One-time</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
                    placeholder="e.g., 5000"
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
        </div>

        {/* Desired start date and special requirements fields removed - not in schema */}
      </CardContent>
    </>
  );
}
