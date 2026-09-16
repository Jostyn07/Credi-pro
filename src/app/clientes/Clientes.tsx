import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserCheck, AlertTriangle, UserPlus, TrendingUp, TrendingDown } from 'lucide-react'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getClients, getClientStats, type Client, type ClientStats } from '@/services/clients'
import type { StatWithChange } from '@/services/dashboard'
import { cn } from '@/utils/cn'

interface StatCardProps {
  label: string
  stat: StatWithChange
  icon: typeof Users
  tone: 'primary' | 'success' | 'danger' | 'info'
}

const toneStyles: Record<StatCardProps['tone'], string> = {
  primary: 'bg-primary-100 text-primary-600',
  success: 'bg-success-100 text-success-600',
  danger: 'bg-danger-100 text-danger-600',
  info: 'bg-info-100 text-info-700',
}

function StatCard({ label, stat, icon: Icon, tone }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', toneStyles[tone])}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm text-neutral-500">{label}</p>
          <p className="mt-0.5 text-xl font-bold text-neutral-950">{stat.value.toLocaleString('es-CO')}</p>
        </div>
      </div>
      {stat.changePct !== null && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {stat.changePct >= 0 ? (
            <TrendingUp size={14} className="text-success-600" />
          ) : (
            <TrendingDown size={14} className="text-danger-600" />
          )}
          <span className={stat.changePct >= 0 ? 'font-medium text-success-600' : 'font-medium text-danger-600'}>
            {stat.changePct >= 0 ? '+' : ''}
            {stat.changePct}%
          </span>
          <span className="text-neutral-400">vs. mes anterior</span>
        </div>
      )}
    </Card>
  )
}

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getClients(), getClientStats()])
      .then(([c, s]) => {
        setClients(c)
        setStats(s)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Clientes</h1>
          <p className="text-sm text-neutral-500">Administra todas las personas a las que tu empresa ha otorgado préstamos.</p>
        </div>
        <Link to="/clientes/nuevo">
          <Button>+ Nuevo cliente</Button>
        </Link>
      </div>

      {loading || !stats ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total de clientes" stat={stats.total} icon={Users} tone="info" />
            <StatCard label="Clientes activos" stat={stats.active} icon={UserCheck} tone="success" />
            <StatCard label="Clientes en mora" stat={stats.inArrears} icon={AlertTriangle} tone="danger" />
            <StatCard label="Nuevos este mes" stat={stats.newThisMonth} icon={UserPlus} tone="primary" />
          </div>

          <Table
            columns={[
              { key: 'full_name', header: 'Nombre' },
              { key: 'identification', header: 'Identificación' },
              { key: 'phone', header: 'Teléfono' },
              { key: 'city', header: 'Ciudad', render: (row) => row.city || '—' },
              {
                key: 'status',
                header: 'Estado',
                render: (row) => (
                  <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>
                    {row.status === 'active' ? 'Activo' : 'Inactivo'}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: '',
                render: (row) => (
                  <Link to={`/clientes/${row.id}`} className="text-accent hover:underline">
                    Ver
                  </Link>
                ),
              },
            ]}
            data={clients}
            rowKey={(row) => row.id}
            emptyMessage="Aún no tienes clientes registrados."
          />
        </>
      )}
    </div>
  )
}