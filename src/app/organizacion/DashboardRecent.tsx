import { Link } from 'react-router-dom'
import { UserPlus, Landmark, Wallet, FileText } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { relativeTimeLabel } from '@/utils/dateLabels'
import type { RecentClient, RecentLoan, ActivityItem } from '@/services/dashboard'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

const clientStatusTone: Record<string, 'success' | 'neutral'> = {
  active: 'success',
  inactive: 'neutral',
}

const loanStatusTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  liquidated: 'neutral',
  cancelled: 'danger',
  refinanced: 'warning',
  restructured: 'warning',
  draft: 'neutral',
}

const activityIcons: Record<ActivityItem['type'], typeof UserPlus> = {
  cliente: UserPlus,
  prestamo: Landmark,
  pago: Wallet,
  documento: FileText,
}

const activityTones: Record<ActivityItem['type'], string> = {
  cliente: 'bg-info-100 text-info-700',
  prestamo: 'bg-primary-100 text-primary-600',
  pago: 'bg-success-100 text-success-600',
  documento: 'bg-warning-100 text-warning-600',
}

export function RecentClientsCard({ clients }: { clients: RecentClient[] }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-950">Clientes recientes</p>
        <Link to="/clientes" className="text-xs font-medium text-accent hover:underline">
          Ver todos
        </Link>
      </div>
      {clients.length === 0 ? (
        <p className="text-sm text-neutral-400">Aún no tienes clientes registrados.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {clients.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <UserPlus size={13} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-950">{c.full_name}</p>
                  <p className="truncate text-xs text-neutral-400">{c.phone || c.identification || '—'}</p>
                </div>
              </div>
              <Badge tone={clientStatusTone[c.status] ?? 'neutral'}>
                {c.status === 'active' ? 'Activo' : 'Inactivo'}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function RecentLoansCard({ loans }: { loans: RecentLoan[] }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-950">Préstamos recientes</p>
        <Link to="/prestamos" className="text-xs font-medium text-accent hover:underline">
          Ver todos
        </Link>
      </div>
      {loans.length === 0 ? (
        <p className="text-sm text-neutral-400">Aún no tienes préstamos registrados.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {loans.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-2.5 text-sm">
              <Link to={`/prestamos/${l.id}`} className="min-w-0 flex-1 hover:underline">
                <p className="truncate font-medium text-neutral-950">{l.client_name}</p>
                <p className="text-xs text-neutral-400">{formatCOP(l.principal)}</p>
              </Link>
              <Badge tone={loanStatusTone[l.status] ?? 'neutral'}>{l.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function RecentActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <p className="mb-3 text-sm font-semibold text-neutral-950">Actividad reciente</p>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-400">Sin actividad reciente todavía.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item, i) => {
            const Icon = activityIcons[item.type]
            return (
              <li key={i} className="flex items-start gap-3 text-sm">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${activityTones[item.type]}`}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-950">{item.title}</p>
                  <p className="truncate text-xs text-neutral-500">{item.subtitle}</p>
                </div>
                <span className="shrink-0 text-xs text-neutral-400">{relativeTimeLabel(item.timestamp)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}