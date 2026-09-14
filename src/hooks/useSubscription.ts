import { useEffect, useState, useCallback } from 'react'
import { getMySubscription, daysRemaining, type Subscription } from '@/services/subscriptions'
import { useAuth } from '@/contexts/AuthContext'

interface UseSubscriptionResult {
  subscription: Subscription | null
  loading: boolean
  isTrialing: boolean
  isActive: boolean
  isBlocked: boolean // expired/cancelled/past_due sin acceso
  trialDaysRemaining: number
  refresh: () => Promise<void>
}

export function useSubscription(): UseSubscriptionResult {
  const { profile } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!profile?.organization_id) {
      setSubscription(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const sub = await getMySubscription()
    setSubscription(sub)
    setLoading(false)
  }, [profile?.organization_id])

  useEffect(() => {
    refresh()
  }, [refresh])

  const isTrialing = subscription?.status === 'trialing'
  const isActive = subscription?.status === 'active'
  const isBlocked =
    subscription?.status === 'expired' ||
    subscription?.status === 'cancelled' ||
    subscription?.status === 'past_due'

  return {
    subscription,
    loading,
    isTrialing,
    isActive,
    isBlocked,
    trialDaysRemaining: daysRemaining(subscription?.trial_end ?? null),
    refresh,
  }
}