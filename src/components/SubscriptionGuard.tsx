import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/Button'

interface SubscriptionGuardProps {
  children: ReactNode
  // Si en el futuro quieres bloquear una función específica según el plan
  // (ej. "ia", "api"), se valida aquí contra subscription_plan_versions.features
  requiredFeature?: string
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { isBlocked, loading } = useSubscription()
  const navigate = useNavigate()

  if (loading) return null

  if (isBlocked) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-lg font-semibold text-primary">Has alcanzado el límite de tu plan</h2>
        <p className="max-w-sm text-sm text-slate-500">
          Tu suscripción no está activa. Actualiza tu plan para seguir usando esta función.
        </p>
        <Button onClick={() => navigate('/suscripcion')}>Actualizar plan</Button>
      </div>
    )
  }

  return <>{children}</>
}