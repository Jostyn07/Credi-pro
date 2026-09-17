import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Wallet, Hash, TrendingUp, Users } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getPaymentsReport, type PaymentsReportRow } from '@/services/reports'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO')
}

const METHOD_COLORS = ['#1D5F8C', '#16803C', '#7C3AED', '#DC2626', '#94A3B8']
const TYPE_COLORS = ['#16803C', '#DC2626']

const PAGE_SIZE = 8

export default function ReportePagos() {
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)

  const [fromDate, setFromDate] = useState(monthAgo.toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(today)
  const [methodFilter, setMethodFilter] = useState('todos')
  const [rows, setRows] = useState<PaymentsReportRow[]>([])
  const [summary, setSummary] = useState({ total: 0, count: 0, average: 0, uniqueClients: 0 })
  const [byDay, setByDay] = useState<{ day: string; amount: number }[]>([])
  const [byMethod, setByMethod] = useState<{ method: string; amount: number }[]>([])
  const [byType, setByType] = useState<{ type: string; amount: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    getPaymentsReport(fromDate, toDate)
      .then((r) => {
        setRows(r.rows)
        setSummary(r.summary)
        setByDay(r.byDay)
        setByMethod(r.byMethod)
        setByType(r.byType)
      })
      .finally(() => setLoading(false))
  }, [fromDate, toDate])

  useEffect(() => setPage(1), [methodFilter])

  const filtered = methodFilter === 'todos' ? rows : rows.filter((r) => r.payment_method === methodFilter)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const methods = Array.from(new Set(rows.map((r) => r.payment_method).filter(Boolean))) as string[]

  function handleExport() {
    const header = ['Fecha', 'Cliente', 'Préstamo', 'Monto', 'Método', 'Tipo', 'Registrado por']
    const csvRows = filtered.map((r) => [
      formatDate(r.payment_date),
      r.clientName,
      r.loanNumber,
      r.amount,
      r.payment_method ?? '',
      r.is_liquidation ? 'Liquidación' : 'Pago normal',
      r.registeredByName ?? '',
    ])
    const csv = [header, ...csvRows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-pagos-${fromDate}-a-${toDate}.csv`
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
          <h1 className="text-2xl font-bold text-neutral-950">Reporte de pagos</h1>
          <p className="text-sm text-neutral-500">Consulta los pagos recibidos en un período de tiempo</p>
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
          <label className="text-xs font-medium text-neutral-500">Desde</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1 block h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary" />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-500">Hasta</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1 block h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary" />
        </div>
        <select className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
          <option value="todos">Todos los métodos</option>
          {methods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
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
                <p className="text-xs text-neutral-400">Total de pagos</p>
                <p className="text-lg font-bold text-neutral-950">{formatCOP(summary.total)}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info-100 text-info-700">
                <Hash size={18} />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Número de pagos</p>
                <p className="text-lg font-bold text-neutral-950">{summary.count}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-100 text-success-700">
                <TrendingUp size={18} />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Pago promedio</p>
                <p className="text-lg font-bold text-neutral-950">{formatCOP(summary.average)}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning-100 text-warning-700">
                <Users size={18} />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Clientes que pagaron</p>
                <p className="text-lg font-bold text-neutral-950">{summary.uniqueClients}</p>
              </div>
            </Card>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <p className="mb-3 text-sm font-semibold text-primary">Pagos por día</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={10} tickFormatter={(d) => d.slice(8, 10)} />
                  <YAxis fontSize={10} tickFormatter={(v) => formatCOP(v)} width={70} />
                  <Tooltip formatter={(v: number) => formatCOP(v)} labelFormatter={(d) => formatDate(d as string)} />
                  <Bar dataKey="amount" fill="#1D5F8C" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <p className="mb-3 text-sm font-semibold text-primary">Pagos por método</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={byMethod} dataKey="amount" nameKey="method" innerRadius={40} outerRadius={65}>
                    {byMethod.map((_, i) => (
                      <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCOP(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-col gap-1">
                {byMethod.map((m, i) => (
                  <div key={m.method} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: METHOD_COLORS[i % METHOD_COLORS.length] }} />
                      {m.method}
                    </span>
                    <span className="text-neutral-500">{formatCOP(m.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <p className="mb-3 text-sm font-semibold text-primary">Pagos por tipo</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={byType} dataKey="amount" nameKey="type" innerRadius={40} outerRadius={65}>
                    {byType.map((_, i) => (
                      <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCOP(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-col gap-1">
                {byType.map((t, i) => (
                  <div key={t.type} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                      {t.type}
                    </span>
                    <span className="text-neutral-500">{formatCOP(t.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <p className="mb-3 text-sm font-semibold text-primary">Pagos registrados</p>
          <div className="overflow-x-auto rounded-card border border-neutral-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-100 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Cliente</th>
                  <th className="px-4 py-2 font-medium">Préstamo</th>
                  <th className="px-4 py-2 font-medium">Monto</th>
                  <th className="px-4 py-2 font-medium">Método</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Registrado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {pageRows.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 text-primary">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-2 text-primary">{p.clientName}</td>
                    <td className="px-4 py-2">
                      <Link to={`/prestamos/${p.loan_id}`} className="text-accent hover:underline">
                        {p.loanNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-medium text-primary">{formatCOP(p.amount)}</td>
                    <td className="px-4 py-2 text-neutral-500">{p.payment_method ?? '—'}</td>
                    <td className="px-4 py-2">
                      <Badge tone={p.is_liquidation ? 'danger' : 'success'}>{p.is_liquidation ? 'Liquidación' : 'Pago'}</Badge>
                    </td>
                    <td className="px-4 py-2 text-neutral-500">{p.registeredByName ?? '—'}</td>
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