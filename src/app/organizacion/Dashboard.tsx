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
  Rocket,
  Crown,
  Headphones,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  getDashboardStats,
  getDashboardKPIs,
  getIngresosYCarteraSeries,
  getLoanStatusDistribution,
  getRecentClients,
  getRecentLoans,
  getRecentActivity,
  type DashboardStats,
  type DashboardKPIs,
  type StatWithChange,
  type DailySeriesPoint,
  type LoanStatusDistribution,
  type RecentClient,
  type RecentLoan,
  type ActivityItem,
} from '@/services/dashboard'
import { IngresosYCarteraChart, LoanStatusDonut } from './DashboardCharts'
import { RecentClientsCard, RecentLoansCard, RecentActivityCard } from './DashboardRecent'
import { relativeDayLabel } from '@/utils/dateLabels'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuth } from '@/contexts/AuthContext'
import { getOrganizationUsage } from '@/services/organization'
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
  const [recentClients, setRecentClients] = useState<RecentClient[]>([])
  const [recentLoans, setRecentLoans] = useState<RecentLoan[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [planName, setPlanName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const { isTrialing, isBlocked, trialDaysRemaining, subscription } = useSubscription()

  useEffect(() => {
    if (!profile?.organization_id || !profile.id) return
    getOrganizationUsage(profile.organization_id, profile.id).then((u) => setPlanName(u.planName))
  }, [profile?.organization_id, profile?.id])

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getDashboardKPIs(),
      getIngresosYCarteraSeries(30),
      getLoanStatusDistribution(),
      getRecentClients(5),
      getRecentLoans(5),
      getRecentActivity(8),
    ])
      .then(([s, k, ser, dist, clients, loans, act]) => {
        setStats(s)
        setKpis(k)
        setSeries(ser)
        setDistribution(dist)
        setRecentClients(clients)
        setRecentLoans(loans)
        setActivity(act)
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
                          <p className="text-xs text-neutral-400">{p.loanNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-neutral-950">{formatCOP(p.total)}</p>
                          <p className="text-xs text-accent">{relativeDayLabel(p.dueDate)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <RecentClientsCard clients={recentClients} />
              <RecentLoansCard loans={recentLoans} />
              <RecentActivityCard items={activity} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="bg-primary-100/40 border-primary-200">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
                    <Rocket size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">Saca el máximo provecho de CrediPro</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Explora nuestras guías interactivas y aprende a utilizar cada módulo.
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                      <Button size="sm">Comenzar guía</Button>
                      <span className="text-xs font-medium text-neutral-500">Ahora no</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-success-100/40 border-success-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-600 text-white">
                      <Crown size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">
                        Tu plan: <span className="font-semibold text-neutral-950">{planName || '—'}</span>
                      </p>
                      {isTrialing ? (
                        <p className="text-sm font-semibold text-success-700">
                          {trialDaysRemaining} día{trialDaysRemaining !== 1 ? 's' : ''} gratis restantes
                        </p>
                      ) : isBlocked ? (
                        <p className="text-sm font-semibold text-danger-600">Suscripción vencida</p>
                      ) : (
                        <p className="text-sm font-semibold text-success-700">Suscripción activa</p>
                      )}
                    </div>
                  </div>
                  <Link to="/suscripcion">
                    <Button size="sm" variant="secondary">
                      Ver detalles
                    </Button>
                  </Link>
                </div>
                {isTrialing && (
                  <>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
                      <div
                        className="h-full bg-success-600"
                        style={{ width: `${Math.max(0, 100 - (trialDaysRemaining / 15) * 100)}%` }}
                      />
                    </div>
                    {subscription?.trial_end && (
                      <p className="mt-2 text-xs text-neutral-500">
                        Vence: {new Date(subscription.trial_end).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}
                      </p>
                    )}
                  </>
                )}
              </Card>

              <Card className="bg-danger-100/40 border-danger-100">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger-600 text-white">
                    <Headphones size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">¿Necesitas ayuda?</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Nuestro equipo está listo para apoyarte.
                    </p>
                    <a href="mailto:soporte@credipro.cloud" className="mt-3 inline-block">
                      <Button size="sm" variant="danger">
                        Contactar soporte
                      </Button>
                    </a>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}