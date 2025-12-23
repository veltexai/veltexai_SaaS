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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      {/* Back button and title section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          size="sm"
          className="w-fit"
        >
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 break-words">
              {proposal.title}
            </h1>
            {/* Status badge - inline on mobile */}
            <span className={`sm:hidden px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[proposal.status]}`}>
              {statusLabels[proposal.status]}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-gray-600">
            <span className="inline-block">Created {formatDate(proposal.created_at)}</span>
            <span className="mx-1 sm:mx-2">•</span>
            <span className="inline-block">Updated {formatDate(proposal.updated_at)}</span>
          </p>
        </div>
      </div>
      
      {/* Status badge - separate on desktop */}
      <div className="hidden sm:flex items-center flex-shrink-0">
        <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${statusColors[proposal.status]}`}>
          {statusLabels[proposal.status]}
        </span>
      </div>
    </div>
  )
}