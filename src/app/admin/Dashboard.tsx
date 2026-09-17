import { useEffect, useState } from 'react'
import { Building2, Users, Landmark, Wallet, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import {
  getPlatformSummary,
  getPlatformOrganizations,
  getPlatformRecentSignIns,
  type PlatformSummary,
  type PlatformOrganization,
  type PlatformRecentSignIn,
} from '@/services/platformAdmin'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO')
}

function formatDateTime(value: string | null) {
  if (!value) return 'Nunca'
  return new Date(value).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

const orgStatusTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  suspended: 'danger',
  inactive: 'neutral',
}

const subStatusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  active: 'success',
  trialing: 'info',
  past_due: 'warning',
  expired: 'danger',
  cancelled: 'neutral',
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<PlatformSummary | null>(null)
  const [orgs, setOrgs] = useState<PlatformOrganization[]>([])
  const [signIns, setSignIns] = useState<PlatformRecentSignIn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getPlatformSummary(), getPlatformOrganizations(), getPlatformRecentSignIns(50)])
      .then(([summaryData, orgsData, signInsData]) => {
        setSummary(summaryData)
        setOrgs(orgsData)
        setSignIns(signInsData)
      })
      .catch((err) => setError(err.message ?? 'No se pudo cargar la información'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-neutral-500">Cargando…</div>
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Card className="border-danger-200 bg-danger-50 text-sm text-danger-700">{error}</Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-950">Administración general</h1>
        <p className="text-sm text-neutral-500">Vista consolidada de todas las organizaciones de la plataforma</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <Building2 size={18} />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Organizaciones</p>
            <p className="text-xl font-bold text-neutral-950">{summary?.organizations_count ?? 0}</p>
            <p className="text-xs text-neutral-400">{summary?.active_organizations_count ?? 0} activas</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info-100 text-info-700">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-xs text-neutral-500">En prueba</p>
            <p className="text-xl font-bold text-neutral-950">{summary?.trialing_subscriptions_count ?? 0}</p>
            <p className="text-xs text-neutral-400">suscripciones trialing</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-100 text-success-700">
            <Users size={18} />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Usuarios totales</p>
            <p className="text-xl font-bold text-neutral-950">{summary?.total_users_count ?? 0}</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning-100 text-warning-700">
            <Landmark size={18} />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Préstamos activos</p>
            <p className="text-xl font-bold text-neutral-950">{summary?.active_loans_count ?? 0}</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger-100 text-danger-700">
            <Wallet size={18} />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Cartera activa</p>
            <p className="text-lg font-bold text-neutral-950">{formatCOP(summary?.total_active_portfolio ?? 0)}</p>
          </div>
        </Card>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-950">Organizaciones</h2>
        <Table
          columns={[
            {
              key: 'commercial_name',
              header: 'Organización',
              render: (r: PlatformOrganization) => (
                <div>
                  <p className="font-medium">{r.commercial_name}</p>
                  <p className="text-xs text-neutral-400">Creada {formatDate(r.created_at)}</p>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Estado',
              render: (r: PlatformOrganization) => (
                <Badge tone={orgStatusTone[r.status] ?? 'neutral'}>{r.status}</Badge>
              ),
            },
            {
              key: 'plan',
              header: 'Plan',
              render: (r: PlatformOrganization) =>
                r.plan_name ? (
                  <div>
                    <p>{r.plan_name}</p>
                    {r.subscription_status && (
                      <Badge tone={subStatusTone[r.subscription_status] ?? 'neutral'} className="mt-1">
                        {r.subscription_status}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-neutral-400">Sin suscripción</span>
                ),
            },
            {
              key: 'usage',
              header: 'Uso (clientes / préstamos / usuarios)',
              render: (r: PlatformOrganization) => (
                <span>
                  {r.clients_count}
                  {r.included_clients != null ? `/${r.included_clients}` : ''} ·{' '}
                  {r.loans_count}
                  {r.included_loans != null ? `/${r.included_loans}` : ''} ·{' '}
                  {r.users_count}
                  {r.included_users != null ? `/${r.included_users}` : ''}
                </span>
              ),
            },
          ]}
          data={orgs}
          rowKey={(r) => r.organization_id}
          emptyMessage="Todavía no hay organizaciones registradas"
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-950">Últimos inicios de sesión</h2>
        <Table
          columns={[
            {
              key: 'user',
              header: 'Usuario',
              render: (r: PlatformRecentSignIn) => (
                <div>
                  <p className="font-medium">{r.full_name ?? '—'}</p>
                  <p className="text-xs text-neutral-400">{r.email}</p>
                </div>
              ),
            },
            {
              key: 'organization_name',
              header: 'Organización',
              render: (r: PlatformRecentSignIn) => r.organization_name ?? '—',
            },
            {
              key: 'last_sign_in_at',
              header: 'Último acceso',
              render: (r: PlatformRecentSignIn) => formatDateTime(r.last_sign_in_at),
            },
          ]}
          data={signIns}
          rowKey={(r) => r.user_id}
          emptyMessage="Sin actividad registrada"
        />
      </div>
    </div>
  )
}