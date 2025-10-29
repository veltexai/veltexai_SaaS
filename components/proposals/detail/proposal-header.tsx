'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { Database } from '@/types/database'

type Proposal = Database['public']['Tables']['proposals']['Row']

interface ProposalHeaderProps {
  proposal: Proposal
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
}

const statusLabels = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected'
}

export function ProposalHeader({ proposal }: ProposalHeaderProps) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{proposal.title}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Created {formatDate(proposal.created_at)} • Last updated {formatDate(proposal.updated_at)}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[proposal.status]}`}>
          {statusLabels[proposal.status]}
        </span>
      </div>
    </div>
  )
}