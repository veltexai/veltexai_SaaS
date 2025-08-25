import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/use-auth'
import { createClient } from '@supabase/supabase-js'
import { getStripeJs } from '@/lib/stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  status: string
  plan_name: string
  current_period_start: string
  current_period_end: string
  canceled_at?: string
}

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchSubscription()
    } else {
      setSubscription(null)
      setLoading(false)
    }
  }, [user])

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setSubscription(data)
    } catch (err) {
      console.error('Error fetching subscription:', err)
      setError('Failed to fetch subscription')
    } finally {
      setLoading(false)
    }
  }

  const createCheckoutSession = async (plan: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()
      const stripe = await getStripeJs()

      if (!stripe) {
        throw new Error('Stripe not loaded')
      }

      const { error } = await stripe.redirectToCheckout({ sessionId })

      if (error) {
        throw error
      }
    } catch (err) {
      console.error('Error creating checkout session:', err)
      setError('Failed to start checkout process')
    } finally {
      setLoading(false)
    }
  }

  const createPortalSession = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (err) {
      console.error('Error creating portal session:', err)
      setError('Failed to open billing portal')
    } finally {
      setLoading(false)
    }
  }

  const isSubscribed = subscription && subscription.status === 'active'
  const isPro = isSubscribed && ['professional', 'enterprise'].includes(subscription.plan_name)
  const isEnterprise = isSubscribed && subscription.plan_name === 'enterprise'

  return {
    subscription,
    loading,
    error,
    isSubscribed,
    isPro,
    isEnterprise,
    createCheckoutSession,
    createPortalSession,
    refetch: fetchSubscription,
  }
}