import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, PiggyBank, TrendingUp, AlertTriangle, Users, Landmark } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { getDashboardStats, type DashboardStats } from '@/services/dashboard'
import { cn } from '@/utils/cn'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

interface StatCardProps {
  label: string
  value: string
  icon: typeof Wallet
  tone: 'primary' | 'warning' | 'success' | 'danger' | 'info'
}

const toneStyles: Record<StatCardProps['tone'], string> = {
  primary: 'bg-primary-100 text-primary-600',
  warning: 'bg-warning-100 text-warning-600',
  success: 'bg-success-100 text-success-600',
  danger: 'bg-danger-100 text-danger-600',
  info: 'bg-info-100 text-info-700',
}

function StatCard({ label, value, icon: Icon, tone }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', toneStyles[tone])}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-neutral-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-neutral-950">{value}</p>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-surface">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-950">Dashboard</h1>
            <p className="text-sm text-neutral-500">Resumen general de tu cartera</p>
          </div>
          <div className="flex gap-3">
            <Link to="/clientes" className="text-sm font-medium text-accent hover:underline">
              Clientes
            </Link>
            <Link to="/prestamos" className="text-sm font-medium text-accent hover:underline">
              Préstamos
            </Link>
          </div>
        </div>

        {loading || !stats ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Clientes" value={stats.totalClients.toString()} icon={Users} tone="info" />
              <StatCard label="Préstamos activos" value={stats.activeLoans.toString()} icon={Landmark} tone="primary" />
              <StatCard label="Capital prestado" value={formatCOP(stats.capitalLent)} icon={Wallet} tone="primary" />
              <StatCard label="Capital pendiente" value={formatCOP(stats.capitalPending)} icon={PiggyBank} tone="warning" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <StatCard
                label="Cartera vencida"
                value={formatCOP(stats.overdueBalance)}
                icon={AlertTriangle}
                tone="danger"
              />

              <Card className="lg:col-span-2">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-accent" />
                  <p className="text-sm font-semibold text-neutral-950">Próximos pagos (7 días)</p>
                </div>
                {stats.upcomingPayments.length === 0 ? (
                  <p className="text-sm text-neutral-400">No hay pagos programados en los próximos 7 días.</p>
                ) : (
                  <ul className="divide-y divide-neutral-100">
                    {stats.upcomingPayments.map((p, i) => (
                      <li key={i} className="flex items-center justify-between py-2 text-sm">
                        <div>
                          <p className="font-medium text-neutral-950">{p.clientName}</p>
                          <p className="text-xs text-neutral-400">
                            {p.loanNumber} · {new Date(p.dueDate).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                        <p className="font-semibold text-neutral-950">{formatCOP(p.total)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}