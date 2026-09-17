import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Wallet, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getPortfolioReport, getMonthlyEvolution, type PortfolioRow, type PortfolioStatus } from '@/services/reports'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

const statusTone: Record<PortfolioStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  vigente: 'success',
  en_gracia: 'warning',
  en_mora: 'danger',
  liquidado: 'neutral',
}
const statusLabel: Record<PortfolioStatus, string> = {
  vigente: 'Vigente',
  en_gracia: 'En gracia',
  en_mora: 'En mora',
  liquidado: 'Liquidado',
}
const statusColor: Record<PortfolioStatus, string> = {
  vigente: '#16803C',
  en_gracia: '#D97706',
  en_mora: '#DC2626',
  liquidado: '#94A3B8',
}

const PAGE_SIZE = 8

export default function ReporteCartera() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState<'todos' | PortfolioStatus>('todos')
  const [rows, setRows] = useState<PortfolioRow[]>([])
  const [summary, setSummary] = useState({ totalCartera: 0, carteraVigente: 0, carteraMora: 0, carteraGracia: 0 })
  const [topClients, setTopClients] = useState<{ clientName: string; balance: number }[]>([])
  const [evolution, setEvolution] = useState<{ month: string; programado: number; recibido: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    Promise.all([getPortfolioReport(asOfDate), getMonthlyEvolution(6)])
      .then(([report, evo]) => {
        setRows(report.rows)
        setSummary(report.summary)
        setTopClients(report.topClients)
        setEvolution(evo)
      })
      .finally(() => setLoading(false))
  }, [asOfDate])

  useEffect(() => setPage(1), [statusFilter])

  const filtered = statusFilter === 'todos' ? rows : rows.filter((r) => r.status === statusFilter)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const byStatus = useMemo(() => {
    const map = new Map<PortfolioStatus, number>()
    for (const r of rows) map.set(r.status, (map.get(r.status) ?? 0) + r.currentBalance)
    return (['vigente', 'en_mora', 'en_gracia', 'liquidado'] as PortfolioStatus[])
      .map((s) => ({ status: s, value: map.get(s) ?? 0 }))
      .filter((d) => d.value > 0)
  }, [rows])

  function handleExport() {
    const header = ['Cliente', 'Préstamo', 'Préstamos del cliente', 'Monto original', 'Saldo actual', 'Días mora', 'Estado', 'Registrado por']
    const csvRows = filtered.map((r) => [
      r.clientName,
      r.loanNumber,
      r.loansCount,
      r.originalAmount,
      r.currentBalance,
      r.daysOverdue,
      statusLabel[r.status],
      r.registeredBy ?? '',
    ])
    const csv = [header, ...csvRows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-cartera-${asOfDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <Link to="/reportes" className="text-sm text-accent hover:underline">
        ← Reportes
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Reporte de cartera</h1>
          <p className="text-sm text-neutral-500">Estado actual de la cartera de préstamos</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-primary hover:bg-neutral-100"
        >
          <Download size={16} /> Exportar
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-neutral-500">Fecha de corte</label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="mt-1 block h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
          />
        </div>
        <select
          className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="todos">Todos los estados</option>
          <option value="vigente">Vigente</option>
          <option value="en_gracia">En gracia</option>
          <option value="en_mora">En mora</option>
          <option value="liquidado">Liquidado</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <Wallet size={18} />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Total de cartera</p>
                <p className="text-lg font-bold text-neutral-950">{formatCOP(summary.totalCartera)}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-100 text-success-700">
                <TrendingUp size={18} />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Cartera vigente</p>
                <p className="text-lg font-bold text-success-700">{formatCOP(summary.carteraVigente)}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger-100 text-danger-700">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Cartera en mora</p>
                <p className="text-lg font-bold text-danger-700">{formatCOP(summary.carteraMora)}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning-100 text-warning-700">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Cartera en gracia</p>
                <p className="text-lg font-bold text-warning-700">{formatCOP(summary.carteraGracia)}</p>
              </div>
            </Card>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <p className="mb-1 text-sm font-semibold text-primary">Programado vs. recibido (últimos 6 meses)</p>
              <p className="mb-3 text-xs text-neutral-400">
                No hay historial de saldos guardado día a día, así que en vez de inventar una curva de "evolución del
                saldo", esto compara lo real: cuánto se programó cobrar cada mes contra cuánto se recibió.
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={evolution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => formatCOP(v)} width={80} />
                  <Tooltip formatter={(v: number) => formatCOP(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="programado" name="Programado" stroke="#94A3B8" strokeWidth={2} />
                  <Line type="monotone" dataKey="recibido" name="Recibido" stroke="#16803C" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <p className="mb-3 text-sm font-semibold text-primary">Cartera por estado</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="status" innerRadius={50} outerRadius={75}>
                    {byStatus.map((d) => (
                      <Cell key={d.status} fill={statusColor[d.status]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCOP(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-col gap-1">
                {byStatus.map((d) => (
                  <div key={d.status} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor[d.status] }} />
                      {statusLabel[d.status]}
                    </span>
                    <span className="text-neutral-500">{formatCOP(d.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="mb-6">
            <p className="mb-3 text-sm font-semibold text-primary">Top 5 clientes con mayor cartera</p>
            <ol className="flex flex-col gap-2">
              {topClients.map((c, i) => (
                <li key={c.clientName} className="flex items-center justify-between text-sm">
                  <span className="text-primary">
                    {i + 1}. {c.clientName}
                  </span>
                  <span className="font-medium text-primary">{formatCOP(c.balance)}</span>
                </li>
              ))}
            </ol>
          </Card>

          <p className="mb-3 text-sm font-semibold text-primary">Detalle de cartera</p>
          <div className="overflow-x-auto rounded-card border border-neutral-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-100 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Cliente</th>
                  <th className="px-4 py-2 font-medium">Préstamo</th>
                  <th className="px-4 py-2 font-medium">Monto original</th>
                  <th className="px-4 py-2 font-medium">Saldo actual</th>
                  <th className="px-4 py-2 font-medium">Días mora</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Registrado por</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {pageRows.map((r) => (
                  <tr key={r.loanId}>
                    <td className="px-4 py-2 text-primary">{r.clientName}</td>
                    <td className="px-4 py-2">
                      <Link to={`/prestamos/${r.loanId}`} className="text-accent hover:underline">
                        {r.loanNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-primary">{formatCOP(r.originalAmount)}</td>
                    <td className="px-4 py-2 font-medium text-primary">{formatCOP(r.currentBalance)}</td>
                    <td className="px-4 py-2 text-primary">{r.daysOverdue > 0 ? r.daysOverdue : '—'}</td>
                    <td className="px-4 py-2">
                      <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
                    </td>
                    <td className="px-4 py-2 text-neutral-500">{r.registeredBy ?? '—'}</td>
                    <td className="px-4 py-2" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
            <span>
              Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filtered.length)} de{' '}
              {filtered.length} registros
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-8 w-8 rounded-lg text-sm ${
                    p === page ? 'bg-accent text-white' : 'border border-neutral-300 text-primary hover:bg-neutral-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}