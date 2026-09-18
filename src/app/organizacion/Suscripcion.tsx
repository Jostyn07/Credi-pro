import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PlanCard } from '@/components/ui/PlanCard'
import { useSubscription } from '@/hooks/useSubscription'
import { createPendingInvoice, getWompiCheckoutParams, getPlans, type Plan } from '@/services/subscriptions'

const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY

const statusLabels: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' }> = {
  trialing: { label: 'En prueba', tone: 'info' },
  active: { label: 'Activa', tone: 'success' },
  past_due: { label: 'Pago pendiente', tone: 'warning' },
  expired: { label: 'Vencida', tone: 'danger' },
  cancelled: { label: 'Cancelada', tone: 'danger' },
  paused: { label: 'Pausada', tone: 'warning' },
}

export default function Suscripcion() {
  const { subscription, loading, isTrialing, trialDaysRemaining, refresh } = useSubscription()
  const [payingLoading, setPayingLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    getPlans()
      .then(setPlans)
      .finally(() => setLoadingPlans(false))
  }, [])

  async function handlePayNow() {
    setError(null)
    setPayingLoading(true)
    try {
      const invoice = await createPendingInvoice()
      const checkout = await getWompiCheckoutParams(invoice.id)

      const params = new URLSearchParams({
        'public-key': WOMPI_PUBLIC_KEY,
        currency: checkout.currency,
        'amount-in-cents': String(checkout.amountInCents),
        reference: checkout.reference,
        'signature:integrity': checkout.signature,
        'redirect-url': `${window.location.origin}/suscripcion`,
      })

      window.location.href = `https://checkout.wompi.co/p/?${params.toString()}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago')
      setPayingLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="p-8">
        <Card>No se encontró ninguna suscripción para esta organización.</Card>
      </div>
    )
  }

  const status = statusLabels[subscription.status] ?? { label: subscription.status, tone: 'info' as const }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-xl font-semibold text-primary">Suscripción</h1>

      <Card className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">Estado</p>
            <Badge tone={status.tone} className="mt-1">
              {status.label}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-500">Precio congelado</p>
            <p className="text-lg font-semibold text-primary">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
                subscription.price_at_subscription,
              )}
              <span className="text-sm font-normal text-neutral-400"> /mes</span>
            </p>
          </div>
        </div>

        {isTrialing && (
          <p className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
            Te quedan {trialDaysRemaining} día{trialDaysRemaining !== 1 ? 's' : ''} de prueba gratuita.
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-700">
            {error}
            {error.includes('Edge Function') && (
              <span className="mt-1 block text-xs text-danger-600">
                Esto suele significar que la función de pagos (Wompi) todavía no está desplegada en Supabase.
              </span>
            )}
          </p>
        )}

        <Button className="mt-6 w-full" loading={payingLoading} onClick={handlePayNow}>
          Pagar ahora con Wompi
        </Button>

        <button onClick={refresh} className="mt-3 w-full text-center text-xs text-neutral-400 hover:underline">
          Actualizar estado
        </button>
      </Card>

      <h2 className="mb-4 mt-10 text-lg font-semibold text-neutral-950">Planes disponibles</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Tu plan actual está resaltado. Para cambiar de plan, escríbenos a{' '}
        <a href="mailto:soporte@credipro.cloud" className="text-accent hover:underline">
          soporte@credipro.cloud
        </a>
        .
      </p>

      {loadingPlans ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard key={plan.key} plan={plan} isCurrent={plan.id === subscription.plan_id} />
          ))}
        </div>
      )}
    </div>
  )
}