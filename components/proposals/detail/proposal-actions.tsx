'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { Edit, Download, Send, Loader2 } from 'lucide-react'

interface Proposal {
  id: string
  title: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
}

interface ProposalActionsProps {
  proposal: Proposal
}

export function ProposalActions({ proposal }: ProposalActionsProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const updateStatus = async (status: Proposal['status']) => {
    setUpdating(true)
    setError('')
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('proposals')
        .update({ status })
        .eq('id', proposal.id)

      if (error) throw error
      
      router.refresh()
    } catch (error) {
      console.error('Error updating proposal status:', error)
      setError('Failed to update proposal status')
    } finally {
      setUpdating(false)
    }
  }

  const exportToPDF = async () => {
    setExporting(true)
    setError('')
    
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          template: 'modern',
          includeCompanyInfo: true 
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to export PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${proposal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_proposal.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      setError('Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/proposals/${proposal.id}/edit`}>
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
        
        <Button variant="outline" onClick={exportToPDF} disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {exporting ? 'Exporting...' : 'Export PDF'}
        </Button>
        
        {proposal.status === 'draft' && (
          <Button 
            onClick={() => updateStatus('sent')}
            disabled={updating}
          >
            {updating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Mark as Sent
          </Button>
        )}
        
        {proposal.status === 'sent' && (
          <>
            <Button 
              onClick={() => updateStatus('accepted')}
              disabled={updating}
              className="bg-green-600 hover:bg-green-700"
            >
              {updating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Mark Accepted'
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={() => updateStatus('rejected')}
              disabled={updating}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              {updating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Mark Rejected'
              )}
            </Button>
          </>
        )}
      </div>
    </>
  )
}