'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth/use-auth'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, Edit, Download, Send, Loader2, FileText } from 'lucide-react'

interface Proposal {
  id: string
  title: string
  client_name: string
  client_email: string
  project_description: string
  budget_range: string
  timeline: string
  company_name: string
  services_offered: string
  content: string
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

export default function ProposalViewPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (user && params.id) {
      fetchProposal()
    }
  }, [user, params.id])

  const fetchProposal = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user?.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Proposal not found')
        } else {
          throw error
        }
      } else {
        setProposal(data)
      }
    } catch (error) {
      console.error('Error fetching proposal:', error)
      setError('Failed to load proposal')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: Proposal['status']) => {
    if (!proposal) return

    setUpdating(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('proposals')
        .update({ status })
        .eq('id', proposal.id)
        .eq('user_id', user?.id)

      if (error) throw error
      
      setProposal(prev => prev ? { ...prev, status } : null)
    } catch (error) {
      console.error('Error updating proposal status:', error)
      setError('Failed to update proposal status')
    } finally {
      setUpdating(false)
    }
  }

  const [exporting, setExporting] = useState(false)

  const exportToPDF = async () => {
    if (!proposal) return

    setExporting(true)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !proposal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error || 'Proposal not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Proposal Content */}
          <Card>
            <CardHeader>
              <CardTitle>Proposal Content</CardTitle>
            </CardHeader>
            <CardContent>
              {proposal.content ? (
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {proposal.content}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>No content generated yet</p>
                  <p className="text-sm mt-1">Edit this proposal to add or generate content</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="text-sm">{proposal.client_name}</p>
              </div>
              {proposal.client_email && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-sm">{proposal.client_email}</p>
                </div>
              )}
              {proposal.company_name && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Company</label>
                  <p className="text-sm">{proposal.company_name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Details */}
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

          {/* Project Description */}
          <Card>
            <CardHeader>
              <CardTitle>Project Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{proposal.project_description}</p>
            </CardContent>
          </Card>

          {proposal.services_offered && (
            <Card>
              <CardHeader>
                <CardTitle>Services Offered</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{proposal.services_offered}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}