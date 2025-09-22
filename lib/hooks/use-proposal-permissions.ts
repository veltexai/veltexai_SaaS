import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/use-auth'

interface ProposalPermissions {
  canCreate: boolean
  currentUsage: number
  proposalLimit: number
  remainingProposals: number
  isTrial: boolean
  subscriptionStatus: string
  loading: boolean
  error: string | null
}

export function useProposalPermissions() {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<ProposalPermissions>({
    canCreate: false,
    currentUsage: 0,
    proposalLimit: 0,
    remainingProposals: 0,
    isTrial: false,
    subscriptionStatus: 'trial',
    loading: true,
    error: null
  })

  useEffect(() => {
    if (user) {
      checkPermissions()
    } else {
      setPermissions(prev => ({ ...prev, loading: false }))
    }
  }, [user])

  const checkPermissions = async () => {
    try {
      setPermissions(prev => ({ ...prev, loading: true, error: null }))
      
      const response = await fetch('/api/usage/check')
      if (!response.ok) {
        throw new Error('Failed to check permissions')
      }

      const data = await response.json()
      
      setPermissions({
        canCreate: data.canCreateProposal,
        currentUsage: data.currentUsage,
        proposalLimit: data.proposalLimit,
        remainingProposals: data.remainingProposals,
        isTrial: data.isTrial,
        subscriptionStatus: data.subscriptionStatus,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Error checking proposal permissions:', error)
      setPermissions(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to check permissions'
      }))
    }
  }

  return {
    ...permissions,
    refetch: checkPermissions
  }
}