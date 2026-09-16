import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Landmark, Wallet, AlertTriangle, CheckCircle2, Coins, Wallet2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { relativeTimeLabel } from '@/utils/dateLabels'
import { getClientProfileSummary, type Client, type ClientProfileSummary } from '@/services/clients'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

interface ClientDetailPanelProps {
  client: Client
}

const miniStats = [
  { key: 'loansTotal', label: 'Préstamos totales', icon: Landmark, tone: 'bg-primary-100 text-primary-600' },
  { key: 'loansActive', label: 'Préstamos activos', icon: Wallet, tone: 'bg-success-100 text-success-600' },
  { key: 'loansInArrears', label: 'Préstamos en mora', icon: AlertTriangle, tone: 'bg-danger-100 text-danger-600' },
  { key: 'loansLiquidated', label: 'Préstamos liquidados', icon: CheckCircle2, tone: 'bg-info-100 text-info-700' },
] as const

export function ClientDetailPanel({ client }: ClientDetailPanelProps) {
  const [summary, setSummary] = useState<ClientProfileSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getClientProfileSummary(client.id)
      .then(setSummary)
      .finally(() => setLoading(false))
  }, [client.id])

  return (
    <Card className="sticky top-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-900 text-sm font-semibold text-white">
            {client.full_name
              .split(' ')
              .slice(0, 2)
              .map((n) => n.charAt(0))
              .join('')
              .toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-neutral-950">{client.full_name}</p>
            <p className="text-xs text-neutral-400">
              Cliente desde {new Date(client.created_at).toLocaleDateString('es-CO')}
            </p>
          </div>
        </div>
        <Badge tone={client.status === 'active' ? 'success' : 'neutral'}>
          {client.status === 'active' ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm text-neutral-600">
        {client.identification && (
          <div className="flex items-center gap-2">
            <Wallet2 size={14} className="text-neutral-400" /> {client.identification}
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-neutral-400" /> {client.phone}
          </div>
        )}
        {client.email && (
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-neutral-400" /> {client.email}
          </div>
        )}
        {(client.address || client.city) && (
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-neutral-400" />
            {[client.address, client.city].filter(Boolean).join(', ')}
          </div>
        )}
      </div>

      <Link to={`/clientes/${client.id}`}>
        <Button variant="secondary" className="mt-4 w-full">
          Editar cliente / Ver ficha completa
        </Button>
      </Link>

      {loading || !summary ? (
        <div className="mt-6 flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {miniStats.map(({ key, label, icon: Icon, tone }) => (
              <div key={key} className="rounded-lg border border-neutral-200 p-3">
                <div className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-md ${tone}`}>
                  <Icon size={14} />
                </div>
                <p className="text-xs text-neutral-400">{label}</p>
                <p className="text-sm font-semibold text-neutral-950">{summary[key]}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-neutral-200 p-3">
              <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-warning-100 text-warning-600">
                <AlertTriangle size={14} />
              </div>
              <p className="text-xs text-neutral-400">Saldo pendiente</p>
              <p className="text-sm font-semibold text-neutral-950">{formatCOP(summary.pendingBalance)}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3">
              <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-success-100 text-success-600">
                <Coins size={14} />
              </div>
              <p className="text-xs text-neutral-400">Total pagado</p>
              <p className="text-sm font-semibold text-neutral-950">{formatCOP(summary.totalPaid)}</p>
            </div>
          </div>

          <p className="mb-2 mt-5 text-sm font-semibold text-neutral-950">Última actividad</p>
          {summary.recentActivity.length === 0 ? (
            <p className="text-xs text-neutral-400">Sin actividad todavía.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {summary.recentActivity.map((a, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium text-neutral-950">{a.title}</p>
                    <p className="text-neutral-400">{a.subtitle}</p>
                  </div>
                  <span className="text-neutral-400">{relativeTimeLabel(a.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}