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
  Card,
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
    <Card>
      <CardHeader>
        <CardTitle>Service Details</CardTitle>
        <CardDescription>
          Specific information about the services to be provided
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="services_offered"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Services Offered *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="List the specific services you will provide..."
                  className="min-h-[80px]"
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
            name="service_frequency"
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
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="square_footage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Square Footage / Facility Size *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 5,000 sq ft" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="desired_start_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Desired Start Date *</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="special_requirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Requirements/Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any special requirements, notes, or additional information..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
