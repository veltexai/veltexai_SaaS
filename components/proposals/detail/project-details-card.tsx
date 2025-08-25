import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface Proposal {
  budget_range: string
  timeline: string
  value: number
}

interface ProjectDetailsCardProps {
  proposal: Proposal
}

export function ProjectDetailsCard({ proposal }: ProjectDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {proposal.budget_range && (
          <div>
            <label className="text-sm font-medium text-gray-600">Budget Range</label>
            <p className="text-sm">{proposal.budget_range}</p>
          </div>
        )}
        {proposal.timeline && (
          <div>
            <label className="text-sm font-medium text-gray-600">Timeline</label>
            <p className="text-sm">{proposal.timeline}</p>
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-gray-600">Proposal Value</label>
          <p className="text-sm font-semibold">{formatCurrency(proposal.value)}</p>
        </div>
      </CardContent>
    </Card>
  )
}