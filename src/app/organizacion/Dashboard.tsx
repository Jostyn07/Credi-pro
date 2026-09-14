import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { TrialBanner } from '@/components/ui/TrialBanner'
import { getDashboardStats, type DashboardStats } from '@/services/dashboard'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === 'danger' ? 'text-status-danger' : 'text-primary'}`}>
        {value}
      </p>
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
      <TrialBanner />

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-primary">Dashboard</h1>
            <p className="text-sm text-slate-500">Resumen general de tu cartera</p>
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
              <StatCard label="Clientes" value={stats.totalClients.toString()} />
              <StatCard label="Préstamos activos" value={stats.activeLoans.toString()} />
              <StatCard label="Capital prestado" value={formatCOP(stats.capitalLent)} />
              <StatCard label="Capital pendiente" value={formatCOP(stats.capitalPending)} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <StatCard label="Cartera vencida" value={formatCOP(stats.overdueBalance)} tone="danger" />

              <Card className="lg:col-span-2">
                <p className="mb-3 text-sm font-medium text-primary">Próximos pagos (7 días)</p>
                {stats.upcomingPayments.length === 0 ? (
                  <p className="text-sm text-slate-400">No hay pagos programados en los próximos 7 días.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {stats.upcomingPayments.map((p, i) => (
                      <li key={i} className="flex items-center justify-between py-2 text-sm">
                        <div>
                          <p className="font-medium text-primary">{p.clientName}</p>
                          <p className="text-xs text-slate-400">
                            {p.loanNumber} · {new Date(p.dueDate).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                        <p className="font-medium text-primary">{formatCOP(p.total)}</p>
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