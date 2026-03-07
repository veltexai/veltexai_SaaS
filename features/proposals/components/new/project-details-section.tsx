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

interface ProjectDetailsSectionProps {
  form: ProposalForm
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function ProjectDetailsSection({ form, onChange }: ProjectDetailsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
        <CardDescription>
          Information about the project scope and requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="budget_range">Budget Range</Label>
          <Input
            id="budget_range"
            name="budget_range"
            value={form.budget_range}
            onChange={onChange}
            placeholder="e.g., $5,000 - $10,000"
          />
        </div>
        
        <div>
          <Label htmlFor="timeline">Timeline</Label>
          <Input
            id="timeline"
            name="timeline"
            value={form.timeline}
            onChange={onChange}
            placeholder="e.g., 4-6 weeks"
          />
        </div>
        
        <div>
          <Label htmlFor="services_offered">Services Offered</Label>
          <textarea
            id="services_offered"
            name="services_offered"
            value={form.services_offered}
            onChange={onChange}
            placeholder="e.g., Web design, development, SEO optimization"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </CardContent>
    </Card>
  )
}