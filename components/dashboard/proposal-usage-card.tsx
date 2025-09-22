'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, AlertCircle, Gift, CreditCard } from 'lucide-react'
import { useProposalPermissions } from '@/lib/hooks/use-proposal-permissions'
import Link from 'next/link'

export function ProposalUsageCard() {
  const {
    canCreate,
    currentUsage,
    proposalLimit,
    remainingProposals,
    isTrial,
    subscriptionStatus,
    loading
  } = useProposalPermissions()

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const usagePercentage = proposalLimit > 0 ? (currentUsage / proposalLimit) * 100 : 0
  const isNearLimit = proposalLimit > 0 && usagePercentage > 80

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isTrial ? 'Trial Proposals' : 'Proposals Used'}
          </CardTitle>
          {isTrial ? (
            <Gift className="h-4 w-4 text-blue-600" />
          ) : (
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {currentUsage}
            {proposalLimit > 0 && (
              <span className="text-sm text-muted-foreground"> / {proposalLimit}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {proposalLimit === -1 ? 'Unlimited' : `${remainingProposals} remaining`}
          </p>
          {proposalLimit > 0 && (
            <Progress value={usagePercentage} className="mt-2" />
          )}
          <div className="mt-2">
            <Badge variant={isTrial ? 'secondary' : 'default'}>
              {isTrial ? 'Free Trial' : subscriptionStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Warning when near limit */}
      {isNearLimit && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You've used {Math.round(usagePercentage)}% of your {isTrial ? 'trial' : 'monthly'} proposals.
            {isTrial ? (
              <Link href="/dashboard/billing" className="ml-1 underline font-medium">
                Choose a plan to continue
              </Link>
            ) : (
              <Link href="/dashboard/billing" className="ml-1 underline font-medium">
                Upgrade your plan
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* No proposals remaining */}
      {!canCreate && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {isTrial 
              ? "You've used all your trial proposals. Choose a plan to continue creating proposals."
              : "You've reached your monthly proposal limit. Upgrade your plan or wait for next billing cycle."
            }
            <div className="mt-2">
              <Link href="/dashboard/billing">
                <Button size="sm" variant="outline">
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isTrial ? 'Choose Plan' : 'Upgrade Plan'}
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}