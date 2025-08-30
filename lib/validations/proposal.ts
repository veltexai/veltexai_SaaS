import { z } from 'zod';

export const proposalFormSchema = z.object({
  // Client Information
  client_name: z.string().min(1, 'Client name is required'),
  client_email: z.string().email('Valid email is required'),
  client_company: z.string().min(1, 'Client company is required'),
  contact_phone: z.string().min(1, 'Contact phone is required'),
  service_location: z.string().min(1, 'Service location is required'),

  // Proposal Details
  title: z.string().min(1, 'Proposal title is required'),
  budget_range: z.string().min(1, 'Budget range is required'),
  timeline: z.string().min(1, 'Timeline is required'),
  project_description: z
    .string()
    .min(10, 'Project description must be at least 10 characters'),

  // Service Details
  services_offered: z.string().min(1, 'Services offered is required'),
  service_frequency: z.enum(['daily', 'weekly', 'monthly'], {
    required_error: 'Service frequency is required',
  }),
  square_footage: z.string().min(1, 'Square footage is required'),
  desired_start_date: z.string().min(1, 'Desired start date is required'),
  special_requirements: z.string().optional(),

  // Attachments (optional)
  attachments: z
    .array(typeof File !== 'undefined' ? z.instanceof(File) : z.any())
    .optional(),
});

export type ProposalFormData = z.infer<typeof proposalFormSchema>;
