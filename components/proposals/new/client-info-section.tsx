import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
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

interface ClientInfoSectionProps {
  form: UseFormReturn<ProposalFormData>;
}

export function ClientInfoSection({ form }: ClientInfoSectionProps) {
  return (
    <>
      <CardHeader>
        <CardTitle>Client Information</CardTitle>
        <CardDescription>
          Essential details about your client and contact information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="client_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Email *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-4">
          <FormField
            control={form.control}
            name="client_name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Client Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., John Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="client_company"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Client Company *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., ABC Corporation" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="contact_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Point of Contact Phone *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., (555) 123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service_location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Location Address *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., 123 Main St, City, State 12345"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </>
  );
}
