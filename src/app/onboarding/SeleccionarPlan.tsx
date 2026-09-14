import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { PlanCard } from '@/components/ui/PlanCard'
import { getPlans, startSubscription, type Plan } from '@/services/subscriptions'

export default function SeleccionarPlan() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPlans()
      .then(setPlans)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los planes'))
      .finally(() => setLoadingPlans(false))
  }, [])

  async function handleSelect(planKey: string) {
    setError(null)
    setSelecting(planKey)
    try {
      await startSubscription(planKey)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la suscripción')
    } finally {
      setSelecting(null)
    }
  }

  if (loadingPlans) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-16">
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="text-2xl font-semibold text-primary">Elige tu plan</h1>
        <p className="mt-2 text-sm text-slate-500">
          15 días gratis en cualquier plan. Sin tarjeta inicial. Cancela cuando quieras.
        </p>

        {error && (
          <Card className="mx-auto mt-6 max-w-md border-status-danger/30 bg-red-50 text-status-danger">
            {error}
          </Card>
        )}

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              highlighted={plan.key === 'profesional'}
              loading={selecting === plan.key}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </div>
  )
}