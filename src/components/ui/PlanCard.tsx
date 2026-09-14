import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Plan } from '@/services/subscriptions'

interface PlanCardProps {
  plan: Plan
  highlighted?: boolean
  loading?: boolean
  onSelect: (planKey: string) => void
}

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

export function PlanCard({ plan, highlighted, loading, onSelect }: PlanCardProps) {
  const version = plan.subscription_plan_versions[0]
  if (!version) return null

  return (
    <div
      className={cn(
        'flex flex-col rounded-card border bg-surface-card p-6 shadow-sm',
        highlighted ? 'border-accent ring-2 ring-accent/20' : 'border-slate-100',
      )}
    >
      {highlighted && (
        <Badge tone="info" className="mb-3 w-fit">
          Más popular
        </Badge>
      )}
      <h3 className="text-lg font-semibold text-primary">{plan.name}</h3>
      <p className="mt-1 text-2xl font-bold text-primary">
        {formatCOP(version.price)} <span className="text-sm font-normal text-slate-400">/mes</span>
      </p>

      <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
        <li>{version.included_users} usuario{version.included_users > 1 ? 's' : ''} incluido{version.included_users > 1 ? 's' : ''}</li>
        <li>{version.included_clients.toLocaleString('es-CO')} clientes</li>
        <li>{version.included_loans.toLocaleString('es-CO')} préstamos activos</li>
        {version.features.ia && <li>✅ Score + recomendación con IA</li>}
        {version.features.cobranza_avanzada && <li>✅ Cobranza avanzada</li>}
        {version.features.api && <li>✅ Acceso a API</li>}
      </ul>

      <Button
        className="mt-6 w-full"
        variant={highlighted ? 'primary' : 'secondary'}
        loading={loading}
        onClick={() => onSelect(plan.key)}
      >
        Elegir {plan.name}
      </Button>
    </div>
  )
}