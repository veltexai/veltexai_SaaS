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

interface ProjectDescriptionSectionProps {
  form: ProposalForm
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function ProjectDescriptionSection({ form, onChange }: ProjectDescriptionSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Description *</CardTitle>
        <CardDescription>
          Describe the project requirements, goals, and any specific details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <textarea
          id="project_description"
          name="project_description"
          value={form.project_description}
          onChange={onChange}
          placeholder="Describe the project in detail. Include goals, requirements, target audience, and any specific features or functionality needed."
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          required
        />
      </CardContent>
    </Card>
  )
}