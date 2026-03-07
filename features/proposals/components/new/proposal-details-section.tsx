import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface ProposalDetailsSectionProps {
  form: UseFormReturn<ProposalFormData>;
}

export function ProposalDetailsSection({ form }: ProposalDetailsSectionProps) {
  return (
    <>
      <CardHeader>
        <CardTitle>Proposal Details</CardTitle>
        <CardDescription>
          Information about the proposal scope and requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proposal Title *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Office Cleaning Services for ABC Corp"
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
