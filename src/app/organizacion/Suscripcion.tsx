import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useSubscription } from '@/hooks/useSubscription'
import { createPendingInvoice, getWompiCheckoutParams } from '@/services/subscriptions'

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
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-xl font-semibold text-primary">Suscripción</h1>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Estado</p>
            <Badge tone={status.tone} className="mt-1">
              {status.label}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Precio congelado</p>
            <p className="text-lg font-semibold text-primary">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
                subscription.price_at_subscription,
              )}
              <span className="text-sm font-normal text-slate-400"> /mes</span>
            </p>
          </div>
        </div>

        {isTrialing && (
          <p className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
            Te quedan {trialDaysRemaining} día{trialDaysRemaining !== 1 ? 's' : ''} de prueba gratuita.
          </p>
        )}

        {error && <p className="mt-4 text-sm text-status-danger">{error}</p>}

        <Button className="mt-6 w-full" loading={payingLoading} onClick={handlePayNow}>
          Pagar ahora con Wompi
        </Button>

        <button
          onClick={refresh}
          className="mt-3 w-full text-center text-xs text-slate-400 hover:underline"
        >
          Actualizar estado
        </button>
      </Card>
    </div>
  )
}