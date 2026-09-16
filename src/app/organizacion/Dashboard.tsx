import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Landmark,
  PiggyBank,
  Coins,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import {
  getDashboardStats,
  getDashboardKPIs,
  getIngresosYCarteraSeries,
  getLoanStatusDistribution,
  type DashboardStats,
  type DashboardKPIs,
  type StatWithChange,
  type DailySeriesPoint,
  type LoanStatusDistribution,
} from '@/services/dashboard'
import { IngresosYCarteraChart, LoanStatusDonut } from './DashboardCharts'
import { cn } from '@/utils/cn'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

interface StatCardProps {
  label: string
  stat: StatWithChange
  icon: typeof Users
  tone: 'primary' | 'warning' | 'success' | 'danger' | 'info'
  format?: (v: number) => string
}

const toneStyles: Record<StatCardProps['tone'], string> = {
  primary: 'bg-primary-100 text-primary-600',
  warning: 'bg-warning-100 text-warning-600',
  success: 'bg-success-100 text-success-600',
  danger: 'bg-danger-100 text-danger-600',
  info: 'bg-info-100 text-info-700',
}

function StatCard({ label, stat, icon: Icon, tone, format }: StatCardProps) {
  const displayValue = format ? format(stat.value) : stat.value.toLocaleString('es-CO')

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', toneStyles[tone])}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-neutral-500">{label}</p>
          <p className="mt-0.5 truncate text-xl font-bold text-neutral-950">{displayValue}</p>
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

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [series, setSeries] = useState<DailySeriesPoint[]>([])
  const [distribution, setDistribution] = useState<LoanStatusDistribution | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashboardStats(), getDashboardKPIs(), getIngresosYCarteraSeries(30), getLoanStatusDistribution()])
      .then(([s, k, ser, dist]) => {
        setStats(s)
        setKpis(k)
        setSeries(ser)
        setDistribution(dist)
      })
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

        {loading || !stats || !kpis ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Clientes activos" stat={kpis.activeClients} icon={Users} tone="info" />
              <StatCard label="Préstamos activos" stat={kpis.activeLoans} icon={Landmark} tone="primary" />
              <StatCard
                label="Capital pendiente"
                stat={kpis.capitalPending}
                icon={PiggyBank}
                tone="warning"
                format={formatCOP}
              />
              <StatCard
                label="Pagos recibidos (mes)"
                stat={kpis.paymentsThisMonth}
                icon={Coins}
                tone="success"
                format={formatCOP}
              />
              <StatCard label="Clientes en mora" stat={kpis.clientsInArrears} icon={AlertTriangle} tone="danger" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <IngresosYCarteraChart series={series} />
              </div>
              {distribution && <LoanStatusDonut distribution={distribution} />}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card>
                <p className="text-xs text-neutral-400">Cartera vencida</p>
                <p className="mt-1 text-lg font-bold text-danger-600">{formatCOP(stats.overdueBalance)}</p>
              </Card>

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