import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BillingRecord } from '@/types/subscription'

interface BillingHistoryTableProps {
  billingHistory: BillingRecord[]
}

export function BillingHistoryTable({ billingHistory }: BillingHistoryTableProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      canceled: 'destructive',
      past_due: 'secondary',
      incomplete: 'outline'
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Billing History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {billingHistory.slice(0, 20).map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.user_email || 'N/A'}</TableCell>
                <TableCell className="font-mono text-sm">{record.stripe_invoice_id}</TableCell>
                <TableCell>{formatCurrency(record.amount)}</TableCell>
                <TableCell>{getStatusBadge(record.status)}</TableCell>
                <TableCell>{formatDate(record.invoice_date)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}