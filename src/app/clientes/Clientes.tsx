import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  UserCheck,
  AlertTriangle,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  getClients,
  getClientStats,
  getClientLoanSummaries,
  type Client,
  type ClientStats,
  type ClientLoanSummary,
} from '@/services/clients'
import { supabase } from '@/lib/supabaseClient'
import { ClientDetailPanel } from './ClientDetailPanel'
import type { StatWithChange } from '@/services/dashboard'
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

type SortKey = 'full_name' | 'identification' | 'city' | 'status' | 'loanCount' | 'pendingBalance'

const columns: { key: SortKey; header: string }[] = [
  { key: 'full_name', header: 'Nombre' },
  { key: 'identification', header: 'Identificación' },
  { key: 'city', header: 'Ciudad' },
  { key: 'status', header: 'Estado' },
  { key: 'loanCount', header: 'Préstamos' },
  { key: 'pendingBalance', header: 'Saldo pendiente' },
]

const PAGE_SIZE = 10

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [loanSummaries, setLoanSummaries] = useState<Map<string, ClientLoanSummary>>(new Map())
  const [clientIdsWithLoans, setClientIdsWithLoans] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [filterCiudad, setFilterCiudad] = useState('todas')
  const [filterPrestamos, setFilterPrestamos] = useState('todos')
  const [filterFecha, setFilterFecha] = useState('todas')

  const [sortKey, setSortKey] = useState<SortKey>('full_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    Promise.all([getClients(), getClientStats(), getClientLoanSummaries(), supabase.from('loans').select('client_id')])
      .then(([c, s, summaries, loansResult]) => {
        setClients(c)
        setStats(s)
        setLoanSummaries(summaries)
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

  const sortedClients = useMemo(() => {
    const withSummary = filteredClients.map((c) => ({
      ...c,
      loanCount: loanSummaries.get(c.id)?.loanCount ?? 0,
      pendingBalance: loanSummaries.get(c.id)?.pendingBalance ?? 0,
    }))

    withSummary.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })

    return withSummary
  }, [filteredClients, loanSummaries, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedClients.length / PAGE_SIZE))
  const pageClients = sortedClients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => setPage(1), [search, filterEstado, filterCiudad, filterPrestamos, filterFecha])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function limpiarFiltros() {
    setSearch('')
    setFilterEstado('todos')
    setFilterCiudad('todas')
    setFilterPrestamos('todos')
    setFilterFecha('todas')
  }

  function exportarCSV() {
    const headers = ['Nombre', 'Identificación', 'Teléfono', 'Ciudad', 'Estado', 'Préstamos', 'Saldo pendiente']
    const rows = sortedClients.map((c) => [
      c.full_name,
      c.identification ?? '',
      c.phone ?? '',
      c.city ?? '',
      c.status === 'active' ? 'Activo' : 'Inactivo',
      c.loanCount,
      c.pendingBalance,
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
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

          <div className={cn('grid grid-cols-1 gap-6', selectedClient && 'lg:grid-cols-3')}>
            <div className={cn(selectedClient && 'lg:col-span-2')}>
              <Card className="mb-4">
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, identificación o teléfono..."
                    className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-primary placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
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

              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-neutral-950">Clientes ({sortedClients.length})</p>
                  <Button variant="secondary" size="sm" onClick={exportarCSV}>
                    <Download size={14} /> Exportar
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-card border border-neutral-200">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-neutral-100 text-xs uppercase text-neutral-500">
                      <tr>
                        {columns.map((col) => (
                          <th key={col.key} className="px-4 py-2 font-medium">
                            <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-primary">
                              {col.header}
                              <ArrowUpDown size={12} className={sortKey === col.key ? 'text-accent' : 'text-neutral-300'} />
                            </button>
                          </th>
                        ))}
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {pageClients.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedClient(c)}
                          className={cn(
                            'cursor-pointer hover:bg-neutral-50',
                            selectedClient?.id === c.id && 'bg-accent/5',
                          )}
                        >
                          <td className="px-4 py-2.5 font-medium text-primary">{c.full_name}</td>
                          <td className="px-4 py-2.5 text-primary">{c.identification || '—'}</td>
                          <td className="px-4 py-2.5 text-primary">{c.city || '—'}</td>
                          <td className="px-4 py-2.5">
                            <Badge tone={c.status === 'active' ? 'success' : 'neutral'}>
                              {c.status === 'active' ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-primary">{c.loanCount}</td>
                          <td className="px-4 py-2.5 text-primary">{formatCOP(c.pendingBalance)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <Link
                              to={`/clientes/${c.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-accent hover:underline"
                            >
                              Ver
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {pageClients.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                            Ningún cliente coincide con los filtros.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <p className="text-xs text-neutral-400">
                      Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, sortedClients.length)} de{' '}
                      {sortedClients.length} resultados
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="rounded-lg border border-neutral-300 p-1.5 disabled:opacity-40"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                        .map((n, i, arr) => (
                          <span key={n} className="flex items-center">
                            {i > 0 && arr[i - 1] !== n - 1 && <span className="px-1 text-neutral-300">…</span>}
                            <button
                              onClick={() => setPage(n)}
                              className={cn(
                                'h-7 w-7 rounded-lg text-xs font-medium',
                                n === page ? 'bg-accent text-white' : 'text-neutral-500 hover:bg-neutral-100',
                              )}
                            >
                              {n}
                            </button>
                          </span>
                        ))}
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="rounded-lg border border-neutral-300 p-1.5 disabled:opacity-40"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {selectedClient && (
              <div>
                <ClientDetailPanel client={selectedClient} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}