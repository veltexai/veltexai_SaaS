import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { ProposalFormData } from '@/lib/validations/proposal'

interface ProposalDetailsSectionProps {
  form: UseFormReturn<ProposalFormData>
}

export function ProposalDetailsSection({ form }: ProposalDetailsSectionProps) {
  return (
    <Card>
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
                <Input placeholder="e.g., Office Cleaning Services for ABC Corp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="budget_range"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget Range *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., $5,000 - $10,000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="timeline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timeline *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 4-6 weeks" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="project_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Description *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the project requirements, goals, and expectations..."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}