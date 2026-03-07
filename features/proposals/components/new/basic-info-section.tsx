import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ProposalForm {
  title: string
  client_name: string
  client_email: string
  company_name: string
  project_description: string
  budget_range: string
  timeline: string
  services_offered: string
}

interface BasicInfoSectionProps {
  form: ProposalForm
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function BasicInfoSection({ form, onChange }: BasicInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>
          Essential details about your proposal and client
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="title">Proposal Title *</Label>
          <Input
            id="title"
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="e.g., Website Redesign for ABC Company"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="client_name">Client Name *</Label>
          <Input
            id="client_name"
            name="client_name"
            value={form.client_name}
            onChange={onChange}
            placeholder="e.g., John Smith"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="client_email">Client Email</Label>
          <Input
            id="client_email"
            name="client_email"
            type="email"
            value={form.client_email}
            onChange={onChange}
            placeholder="client@company.com"
          />
        </div>
        
        <div>
          <Label htmlFor="company_name">Client Company</Label>
          <Input
            id="company_name"
            name="company_name"
            value={form.company_name}
            onChange={onChange}
            placeholder="e.g., ABC Company"
          />
        </div>
      </CardContent>
    </Card>
  )
}