import { supabase } from '@/lib/supabaseClient'

export interface PlanVersion {
  id: string
  plan_id: number
  version: number
  price: number
  currency: string
  included_users: number
  included_clients: number
  included_loans: number
  extra_user_price: number
  features: Record<string, boolean>
}

export interface Plan {
  id: number
  key: string
  name: string
  sort_order: number
  subscription_plan_versions: PlanVersion[]
}

export interface Subscription {
  id: string
  organization_id: string
  plan_id: number
  plan_version_id: string
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'paused'
  price_at_subscription: number
  trial_start: string | null
  trial_end: string | null
  current_period_start: string | null
  current_period_end: string | null
}

// Trae los planes activos junto con su versión de precio vigente
export async function getPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id, key, name, sort_order, subscription_plan_versions(*)')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw error

  // Nos quedamos solo con la versión activa más reciente de cada plan
  return (data as unknown as Plan[]).map((plan) => ({
    ...plan,
    subscription_plan_versions: plan.subscription_plan_versions
      .filter((v) => v)
      .sort((a, b) => b.version - a.version)
      .slice(0, 1),
  }))
}

// Crea la suscripción en trial para la organización del usuario autenticado
export async function startSubscription(planKey: string): Promise<Subscription> {
  const { data, error } = await supabase.rpc('start_subscription', { p_plan_key: planKey })
  if (error) throw error
  return data as unknown as Subscription
}

export interface Invoice {
  id: string
  invoice_number: string
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'failed' | 'void'
  due_date: string
}

// Crea (o reutiliza) la factura pendiente de la organización actual
export async function createPendingInvoice(): Promise<Invoice> {
  const { data, error } = await supabase.rpc('create_pending_invoice')
  if (error) throw error
  return data as unknown as Invoice
}

export async function getMySubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase.from('subscriptions').select('*').maybeSingle()
  if (error) throw error
  return data as Subscription | null
}

// Pide a la Edge Function la firma de integridad para abrir el Web Checkout de Wompi
export async function getWompiCheckoutParams(invoiceId: string) {
  const { data, error } = await supabase.functions.invoke('wompi-signature', {
    body: { invoiceId },
  })
  if (error) throw error
  return data as { reference: string; amountInCents: number; currency: string; signature: string }
}

export function daysRemaining(trialEnd: string | null): number {
  if (!trialEnd) return 0
  const diffMs = new Date(trialEnd).getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}