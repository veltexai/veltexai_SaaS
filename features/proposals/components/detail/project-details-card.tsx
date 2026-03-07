import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Database } from '@/types/database';

type Proposal = Database['public']['Tables']['proposals']['Row'];

interface ProjectDetailsCardProps {
  proposal: Proposal;
}

export function ProjectDetailsCard({ proposal }: ProjectDetailsCardProps) {
  const pricingData = proposal.pricing_data as { total?: number; subtotal?: number; tax?: number } | null;
  const totalValue = pricingData?.total || 0;
  
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