import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface Proposal {
  pricing_data: {
    total?: number;
    subtotal?: number;
    tax?: number;
  } | null;
  service_frequency: string;
  facility_size: number;
}

interface ProjectDetailsCardProps {
  proposal: Proposal;
}

export function ProjectDetailsCard({ proposal }: ProjectDetailsCardProps) {
  const totalValue = proposal.pricing_data?.total || 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-600">Service Frequency</label>
          <p className="text-sm capitalize">{proposal.service_frequency}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Facility Size</label>
          <p className="text-sm">{proposal.facility_size} sq ft</p>
        </div>
        {totalValue > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-600">Proposal Value</label>
            <p className="text-sm font-semibold">{formatCurrency(totalValue)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}