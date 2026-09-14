import { Link } from 'react-router-dom'
import { useSubscription } from '@/hooks/useSubscription'

export function TrialBanner() {
  const { isTrialing, isBlocked, trialDaysRemaining } = useSubscription()

  if (isBlocked) {
    return (
      <div className="flex items-center justify-between bg-status-danger/10 px-4 py-2 text-sm text-status-danger">
        <span>Tu prueba gratuita terminó y no tienes una suscripción activa. Algunas funciones están bloqueadas.</span>
        <Link to="/suscripcion" className="font-medium underline">
          Suscribirme ahora
        </Link>
      </div>
    )
  }

  if (!isTrialing) return null

  return (
    <div className="flex items-center justify-between bg-accent/10 px-4 py-2 text-sm text-accent">
      <span>
        Te quedan <strong>{trialDaysRemaining}</strong> día{trialDaysRemaining !== 1 ? 's' : ''} de prueba gratuita.
      </span>
      <Link to="/suscripcion" className="font-medium underline">
        Ver planes
      </Link>
    </div>
  )
}