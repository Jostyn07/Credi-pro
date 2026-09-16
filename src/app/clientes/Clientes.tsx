import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserCheck, AlertTriangle, UserPlus, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getClients, getClientStats, type Client, type ClientStats } from '@/services/clients'
import { supabase } from '@/lib/supabaseClient'
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

const dateRangeOptions = [
  { value: 'todas', label: 'Todas' },
  { value: 'mes', label: 'Este mes' },
  { value: 'trimestre', label: 'Últimos 3 meses' },
  { value: 'anio', label: 'Este año' },
]

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [clientIdsWithLoans, setClientIdsWithLoans] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [filterCiudad, setFilterCiudad] = useState('todas')
  const [filterPrestamos, setFilterPrestamos] = useState('todos')
  const [filterFecha, setFilterFecha] = useState('todas')

  useEffect(() => {
    Promise.all([getClients(), getClientStats(), supabase.from('loans').select('client_id')])
      .then(([c, s, loansResult]) => {
        setClients(c)
        setStats(s)
        setClientIdsWithLoans(new Set(((loansResult.data ?? []) as any[]).map((l) => l.client_id)))
      })
      .finally(() => setLoading(false))
  }, [])

  const ciudades = useMemo(
    () => Array.from(new Set(clients.map((c) => c.city).filter(Boolean))).sort() as string[],
    [clients],
  )

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    const now = new Date()

    return clients.filter((c) => {
      if (q) {
        const matches =
          c.full_name.toLowerCase().includes(q) ||
          (c.identification ?? '').toLowerCase().includes(q) ||
          (c.phone ?? '').toLowerCase().includes(q)
        if (!matches) return false
      }
      if (filterEstado !== 'todos' && c.status !== filterEstado) return false
      if (filterCiudad !== 'todas' && c.city !== filterCiudad) return false
      if (filterPrestamos !== 'todos') {
        const hasLoans = clientIdsWithLoans.has(c.id)
        if (filterPrestamos === 'si' && !hasLoans) return false
        if (filterPrestamos === 'no' && hasLoans) return false
      }
      if (filterFecha !== 'todas') {
        const created = new Date(c.created_at)
        const monthsDiff = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth())
        if (filterFecha === 'mes' && monthsDiff > 0) return false
        if (filterFecha === 'trimestre' && monthsDiff > 2) return false
        if (filterFecha === 'anio' && created.getFullYear() !== now.getFullYear()) return false
      }
      return true
    })
  }, [clients, search, filterEstado, filterCiudad, filterPrestamos, filterFecha, clientIdsWithLoans])

  function limpiarFiltros() {
    setSearch('')
    setFilterEstado('todos')
    setFilterCiudad('todas')
    setFilterPrestamos('todos')
    setFilterFecha('todas')
  }

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

          <Card className="mb-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, identificación o teléfono..."
                  className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-primary placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="text-xs font-medium text-neutral-500">Estado</label>
                <select
                  className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm text-primary"
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Ciudad</label>
                <select
                  className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm text-primary"
                  value={filterCiudad}
                  onChange={(e) => setFilterCiudad(e.target.value)}
                >
                  <option value="todas">Todas</option>
                  {ciudades.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Tiene préstamos</label>
                <select
                  className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm text-primary"
                  value={filterPrestamos}
                  onChange={(e) => setFilterPrestamos(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Fecha de registro</label>
                <select
                  className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm text-primary"
                  value={filterFecha}
                  onChange={(e) => setFilterFecha(e.target.value)}
                >
                  {dateRangeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-neutral-400">
                {filteredClients.length} de {clients.length} clientes
              </p>
              <button onClick={limpiarFiltros} className="text-xs font-medium text-accent hover:underline">
                Limpiar filtros
              </button>
            </div>
          </Card>

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
            data={filteredClients}
            rowKey={(row) => row.id}
            emptyMessage="Ningún cliente coincide con los filtros."
          />
        </>
      )}
    </div>
  )
}