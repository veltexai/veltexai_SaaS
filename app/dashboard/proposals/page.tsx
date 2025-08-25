'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth/use-auth'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Plus, FileText, Eye, Edit, Trash2, Loader2, Download } from 'lucide-react'

interface Proposal {
  id: string
  title: string
  client_name: string
  client_email: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  value: number
  created_at: string
  updated_at: string
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

export default function ProposalsPage() {
  const { user } = useAuth()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchProposals()
    }
  }, [user])

  const fetchProposals = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProposals(data || [])
    } catch (error) {
      console.error('Error fetching proposals:', error)
      setError('Failed to load proposals')
    } finally {
      setLoading(false)
    }
  }

  const deleteProposal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this proposal?')) {
      return
    }

    setDeletingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) throw error
      
      setProposals(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Error deleting proposal:', error)
      setError('Failed to delete proposal')
    } finally {
      setDeletingId(null)
    }
  }

  const updateStatus = async (id: string, status: Proposal['status']) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('proposals')
        .update({ status })
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) throw error
      
      setProposals(prev => 
        prev.map(p => p.id === id ? { ...p, status } : p)
      )
    } catch (error) {
      console.error('Error updating proposal status:', error)
      setError('Failed to update proposal status')
    }
  }

  const exportToPDF = async (proposal: Proposal) => {
    setExportingId(proposal.id)
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
      setExportingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Proposals</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your business proposals and track their status.
          </p>
        </div>
        <Link href="/dashboard/proposals/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Proposal
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No proposals yet
            </h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              Create your first proposal to get started with winning new clients.
            </p>
            <Link href="/dashboard/proposals/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Proposal
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {proposals.map((proposal) => (
            <Card key={proposal.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{proposal.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Client: {proposal.client_name}
                      {proposal.client_email && ` (${proposal.client_email})`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[proposal.status]}`}>
                      {statusLabels[proposal.status]}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Value:</span> {formatCurrency(proposal.value)}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(proposal.created_at)}
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span> {formatDate(proposal.updated_at)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Status Update Buttons */}
                    {proposal.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(proposal.id, 'sent')}
                      >
                        Mark as Sent
                      </Button>
                    )}
                    {proposal.status === 'sent' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(proposal.id, 'accepted')}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          Mark Accepted
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(proposal.id, 'rejected')}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          Mark Rejected
                        </Button>
                      </>
                    )}
                    
                    {/* Action Buttons */}
                    <Link href={`/dashboard/proposals/${proposal.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/proposals/${proposal.id}/edit`}>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportToPDF(proposal)}
                      disabled={exportingId === proposal.id}
                    >
                      {exportingId === proposal.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteProposal(proposal.id)}
                      disabled={deletingId === proposal.id}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      {deletingId === proposal.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}