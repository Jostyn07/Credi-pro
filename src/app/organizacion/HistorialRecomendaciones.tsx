import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { getRecommendationHistory, type LoanRecommendationRecord } from '@/services/loanRecommendations'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO')
}

const riskTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  bajo: 'success',
  medio: 'warning',
  alto: 'danger',
  sin_historial: 'neutral',
}
const riskLabel: Record<string, string> = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto', sin_historial: 'Sin historial' }

const decisionTone: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  aprobado: 'success',
  ajustado: 'info',
  rechazado: 'danger',
  en_revision: 'warning',
}
const decisionLabel: Record<string, string> = {
  aprobado: 'Aprobado',
  ajustado: 'Ajustado',
  rechazado: 'Rechazado',
  en_revision: 'En revisión',
}

const PAGE_SIZE = 8

export default function HistorialRecomendaciones() {
  const [records, setRecords] = useState<LoanRecommendationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('todos')
  const [decisionFilter, setDecisionFilter] = useState('todos')
  const [page, setPage] = useState(1)

  useEffect(() => {
    getRecommendationHistory()
      .then(setRecords)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => setPage(1), [search, riskFilter, decisionFilter])

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (riskFilter !== 'todos' && r.risk_level !== riskFilter) return false
        if (decisionFilter !== 'todos' && r.decision !== decisionFilter) return false
        if (search && !(r.clients?.full_name ?? '').toLowerCase().includes(search.toLowerCase())) return false
        return true
      }),
    [records, search, riskFilter, decisionFilter],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleExport() {
    const header = ['Fecha', 'Cliente', 'Monto solicitado', 'Monto sugerido', 'Plazo sugerido', 'Riesgo', 'Decisión']
    const rows = filtered.map((r) => [
      formatDate(r.created_at),
      r.clients?.full_name ?? '',
      r.requested_amount,
      r.suggested_amount,
      `${r.suggested_term_months} meses`,
      riskLabel[r.risk_level] ?? r.risk_level,
      decisionLabel[r.decision] ?? r.decision,
    ])
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historial-recomendaciones-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Historial de recomendaciones</h1>
          <p className="text-sm text-neutral-500">Consulta las evaluaciones y recomendaciones generadas</p>
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-primary hover:bg-neutral-100 disabled:opacity-50"
        >
          <Download size={16} /> Exportar
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] max-w-xs flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente..."
            className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-primary placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <select
          className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
        >
          <option value="todos">Todos los riesgos</option>
          <option value="bajo">Bajo</option>
          <option value="medio">Medio</option>
          <option value="alto">Alto</option>
        </select>
        <select
          className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
          value={decisionFilter}
          onChange={(e) => setDecisionFilter(e.target.value)}
        >
          <option value="todos">Todas las decisiones</option>
          <option value="aprobado">Aprobado</option>
          <option value="ajustado">Ajustado</option>
          <option value="rechazado">Rechazado</option>
          <option value="en_revision">En revisión</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-sm text-neutral-400">No hay recomendaciones para este filtro.</Card>
      ) : (
        <>
          <Table
            columns={[
              { key: 'fecha', header: 'Fecha', render: (r: LoanRecommendationRecord) => formatDate(r.created_at) },
              {
                key: 'cliente',
                header: 'Cliente',
                render: (r: LoanRecommendationRecord) => (
                  <Link to={`/score/${r.client_id}`} className="font-medium text-primary hover:text-accent">
                    {r.clients?.full_name ?? '—'}
                  </Link>
                ),
              },
              { key: 'solicitado', header: 'Monto solicitado', render: (r: LoanRecommendationRecord) => formatCOP(r.requested_amount) },
              { key: 'sugerido', header: 'Monto sugerido', render: (r: LoanRecommendationRecord) => formatCOP(r.suggested_amount) },
              { key: 'plazo', header: 'Plazo sugerido', render: (r: LoanRecommendationRecord) => `${r.suggested_term_months} meses` },
              {
                key: 'riesgo',
                header: 'Riesgo',
                render: (r: LoanRecommendationRecord) => <Badge tone={riskTone[r.risk_level] ?? 'neutral'}>{riskLabel[r.risk_level] ?? r.risk_level}</Badge>,
              },
              {
                key: 'decision',
                header: 'Decisión',
                render: (r: LoanRecommendationRecord) => <Badge tone={decisionTone[r.decision] ?? 'neutral'}>{decisionLabel[r.decision] ?? r.decision}</Badge>,
              },
              {
                key: 'acciones',
                header: '',
                render: (r: LoanRecommendationRecord) => (
                  <Link to={`/score/${r.client_id}`} className="text-accent hover:underline">
                    Ver cliente
                  </Link>
                ),
              },
            ]}
            data={pageRows}
            rowKey={(r) => r.id}
          />

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