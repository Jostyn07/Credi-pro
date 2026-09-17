import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Sparkles, TrendingUp, TrendingDown, Minus, Users, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { getLatestScores, generateClientScore, type LatestScoreRow } from '@/services/clientScore'
import { getClients, type Client } from '@/services/clients'
import { useAuth } from '@/contexts/AuthContext'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO')
}

const riskTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  bajo: 'success',
  medio: 'warning',
  alto: 'danger',
  sin_historial: 'neutral',
}
const riskLabel: Record<string, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
  sin_historial: 'Sin historial',
}

const PAGE_SIZE = 8

export default function Score() {
  const { profile } = useAuth()
  const [scores, setScores] = useState<LatestScoreRow[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const loadData = useCallback(async () => {
    const [scoresData, clientsData] = await Promise.all([getLatestScores(), getClients()])
    setScores(scoresData)
    setClients(clientsData)
  }, [])

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [loadData])

  useEffect(() => setPage(1), [search])

  const analyzedClientIds = new Set(scores.map((s) => s.client_id))
  const pendingClients = clients.filter((c) => !analyzedClientIds.has(c.id))

  const stats = useMemo(() => {
    const bajo = scores.filter((s) => s.risk_level === 'bajo').length
    const medio = scores.filter((s) => s.risk_level === 'medio').length
    const alto = scores.filter((s) => s.risk_level === 'alto').length
    const total = scores.length
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
    return { total, bajo, medio, alto, pctBajo: pct(bajo), pctMedio: pct(medio), pctAlto: pct(alto) }
  }, [scores])

  const filtered = scores.filter((s) => (s.clients?.full_name ?? '').toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Analiza a todos los clientes que todavía no tienen ningún análisis
  // guardado. Para volver a analizar a alguien que ya tiene uno, se hace
  // desde su ficha de detalle ("+ Nueva evaluación").
  async function handleGenerateAnalysis() {
    if (!profile?.organization_id || pendingClients.length === 0) return
    setGenerating(true)
    try {
      for (const c of pendingClients) {
        await generateClientScore(c.id, profile.organization_id)
      }
      await loadData()
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Score de clientes</h1>
          <p className="text-sm text-neutral-500">Analiza el comportamiento y riesgo de tu cartera</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/score/historial" className="text-sm font-medium text-accent hover:underline">
            Historial de recomendaciones
          </Link>
          <Button onClick={handleGenerateAnalysis} loading={generating} disabled={pendingClients.length === 0}>
            <Sparkles size={16} /> Generar análisis {pendingClients.length > 0 && `(${pendingClients.length})`}
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <Users size={18} />
          </div>
          <div>
            <p className="text-xl font-bold text-neutral-950">{stats.total}</p>
            <p className="text-xs text-neutral-400">Clientes analizados</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-100 text-success-700">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-xl font-bold text-neutral-950">{stats.bajo}</p>
            <p className="text-xs text-neutral-400">Riesgo bajo ({stats.pctBajo}%)</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning-100 text-warning-700">
            <ShieldAlert size={18} />
          </div>
          <div>
            <p className="text-xl font-bold text-neutral-950">{stats.medio}</p>
            <p className="text-xs text-neutral-400">Riesgo medio ({stats.pctMedio}%)</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger-100 text-danger-700">
            <ShieldX size={18} />
          </div>
          <div>
            <p className="text-xl font-bold text-neutral-950">{stats.alto}</p>
            <p className="text-xs text-neutral-400">Riesgo alto ({stats.pctAlto}%)</p>
          </div>
        </Card>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente por nombre, identificación o teléfono..."
          className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-primary placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : scores.length === 0 ? (
        <Card className="text-sm text-neutral-500">
          Todavía no hay ningún análisis generado.{' '}
          {pendingClients.length > 0 && 'Usa "Generar análisis" para analizar a tus clientes.'}
        </Card>
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'cliente',
                header: 'Cliente',
                render: (r: LatestScoreRow) => (
                  <Link to={`/score/${r.client_id}`} className="font-medium text-primary hover:text-accent">
                    {r.clients?.full_name ?? '—'}
                  </Link>
                ),
              },
              { key: 'id', header: 'Identificación', render: (r: LatestScoreRow) => r.clients?.identification ?? '—' },
              { key: 'score', header: 'Score', render: (r: LatestScoreRow) => (r.risk_level === 'sin_historial' ? '—' : r.score) },
              {
                key: 'riesgo',
                header: 'Riesgo',
                render: (r: LatestScoreRow) => <Badge tone={riskTone[r.risk_level]}>{riskLabel[r.risk_level]}</Badge>,
              },
              {
                key: 'tendencia',
                header: 'Tendencia',
                render: (r: LatestScoreRow) => {
                  if (r.previousScore === null) return <Minus size={14} className="text-neutral-300" />
                  if (r.score > r.previousScore) return <TrendingUp size={14} className="text-success-600" />
                  if (r.score < r.previousScore) return <TrendingDown size={14} className="text-danger-600" />
                  return <Minus size={14} className="text-neutral-400" />
                },
              },
              { key: 'fecha', header: 'Último análisis', render: (r: LatestScoreRow) => formatDate(r.computed_at) },
              {
                key: 'acciones',
                header: '',
                render: (r: LatestScoreRow) => (
                  <Link to={`/score/${r.client_id}`} className="text-accent hover:underline">
                    Ver detalle
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