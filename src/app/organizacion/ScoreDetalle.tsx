import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Sparkles, Phone, Wallet2, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getClient, getClientProfileSummary, getClientEvaluationMetrics, type Client, type ClientProfileSummary, type ClientEvaluationMetrics } from '@/services/clients'
import { generateClientScore, getScoreHistory, type ClientScoreSnapshot } from '@/services/clientScore'
import { computeClientRisk, type ClientRisk } from '@/utils/clientRisk'
import { getLoansByClient, type Loan } from '@/services/loans'
import { getPaymentsByClient, type Payment } from '@/services/payments'
import { getCollectionActions, type CollectionAction } from '@/services/collection'
import { useAuth } from '@/contexts/AuthContext'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO')
}
function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n.charAt(0)).join('').toUpperCase()
}

const riskGaugeColor: Record<ClientRisk['tone'], string> = {
  neutral: '#94A3B8',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
}

const loanStatusTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  liquidated: 'neutral',
  cancelled: 'danger',
  refinanced: 'warning',
  restructured: 'warning',
  draft: 'neutral',
}

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'factores', label: 'Factores' },
  { key: 'historial', label: 'Historial' },
  { key: 'recomendaciones', label: 'Recomendaciones' },
  { key: 'prestamos', label: 'Préstamos' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'cobranza', label: 'Cobranza' },
] as const
type TabKey = (typeof TABS)[number]['key']

export default function ScoreDetalle() {
  const { clientId } = useParams<{ clientId: string }>()
  const { profile } = useAuth()
  const [tab, setTab] = useState<TabKey>('resumen')

  const [client, setClient] = useState<Client | null>(null)
  const [summary, setSummary] = useState<ClientProfileSummary | null>(null)
  const [metrics, setMetrics] = useState<ClientEvaluationMetrics | null>(null)
  const [history, setHistory] = useState<ClientScoreSnapshot[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [actions, setActions] = useState<CollectionAction[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const loadData = useCallback(async () => {
    if (!clientId) return
    const [c, s, m, h, l, p, a] = await Promise.all([
      getClient(clientId),
      getClientProfileSummary(clientId),
      getClientEvaluationMetrics(clientId),
      getScoreHistory(clientId),
      getLoansByClient(clientId),
      getPaymentsByClient(clientId),
      getCollectionActions(clientId),
    ])
    setClient(c)
    setSummary(s)
    setMetrics(m)
    setHistory(h)
    setLoans(l)
    setPayments(p)
    setActions(a)
  }, [clientId])

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [loadData])

  async function handleNewEvaluation() {
    if (!clientId || !profile?.organization_id) return
    setGenerating(true)
    try {
      await generateClientScore(clientId, profile.organization_id)
      await loadData()
    } finally {
      setGenerating(false)
    }
  }

  if (loading || !client || !summary || !metrics) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const risk = computeClientRisk(summary)
  const latest = history[history.length - 1] ?? null
  const chartData = history.map((h) => ({ date: formatDate(h.computed_at), score: h.score }))
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-5xl">
        <Link to="/score" className="text-sm text-accent hover:underline">
          ← Volver al listado
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-900 text-sm font-semibold text-white">
              {initials(client.full_name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-neutral-950">{client.full_name}</h1>
                <Badge tone={client.status === 'active' ? 'success' : 'neutral'}>
                  {client.status === 'active' ? 'Cliente activo' : 'Cliente inactivo'}
                </Badge>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
                {client.identification && (
                  <span className="flex items-center gap-1">
                    <Wallet2 size={12} /> CC {client.identification}
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {client.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link to={`/clientes/${client.id}`}>
              <Button variant="secondary">Ver ficha del cliente</Button>
            </Link>
            <Button onClick={handleNewEvaluation} loading={generating}>
              <Sparkles size={16} /> Nueva evaluación
            </Button>
          </div>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-neutral-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key ? 'border-accent text-accent' : 'border-transparent text-neutral-500 hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'resumen' && (
            <div className="flex flex-col gap-6">
              {!latest ? (
                <Card className="text-sm text-neutral-500">
                  Este cliente todavía no tiene ningún análisis. Usa "Nueva evaluación" para generar el primero.
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-3">
                  <Card className="flex flex-col items-center justify-center text-center">
                    <div
                      className="relative flex h-28 w-28 items-center justify-center rounded-full"
                      style={{ background: `conic-gradient(${riskGaugeColor[risk.tone]} ${risk.score * 3.6}deg, #E4E7EC 0deg)` }}
                    >
                      <div className="flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full bg-white">
                        <span className="text-2xl font-bold text-primary">{risk.level === 'sin_historial' ? '—' : latest.score}</span>
                        <span className="text-[10px] text-neutral-400">/100</span>
                      </div>
                    </div>
                    <Badge tone={risk.tone} className="mt-3">
                      {risk.label}
                    </Badge>
                    <p className="mt-2 text-xs text-neutral-400">Último análisis: {formatDate(latest.computed_at)}</p>
                  </Card>

                  <Card className="md:col-span-2">
                    <p className="mb-3 text-sm font-semibold text-primary">Interpretación del score</p>
                    <p className="mb-3 text-sm text-neutral-600">
                      {risk.level === 'bajo'
                        ? 'El cliente presenta un buen comportamiento de pago, con puntualidad consistente y sin mora reciente.'
                        : risk.level === 'medio'
                          ? 'El cliente presenta un comportamiento de pago irregular, con algunas cuotas atrasadas.'
                          : risk.level === 'alto'
                            ? 'El cliente presenta mora reciente o un historial de pagos problemático.'
                            : 'El cliente todavía no tiene préstamos previos para evaluar su comportamiento de pago.'}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {latest.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-primary">
                          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success-600" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              )}

              {chartData.length > 1 && (
                <Card>
                  <p className="mb-3 text-sm font-semibold text-primary">Evolución del score</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis domain={[0, 100]} fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#1D5F8C" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}

              <Card>
                <p className="mb-3 text-sm font-semibold text-primary">Resumen financiero</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <div>
                    <p className="text-xs text-neutral-400">Préstamos totales</p>
                    <p className="text-lg font-bold text-primary">{summary.loansTotal}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Liquidados</p>
                    <p className="text-lg font-bold text-primary">{summary.loansLiquidated}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Activos</p>
                    <p className="text-lg font-bold text-primary">{summary.loansActive}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Total pagado</p>
                    <p className="text-lg font-bold text-success-700">{formatCOP(totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Días prom. atraso</p>
                    <p className="text-lg font-bold text-primary">{metrics.avgDaysLate ?? '—'}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {tab === 'factores' && (
            <Card>
              <p className="mb-3 text-sm font-semibold text-primary">Factores considerados en el último análisis</p>
              {!latest ? (
                <p className="text-sm text-neutral-400">Sin análisis todavía.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {latest.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-primary">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success-600" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === 'historial' && (
            <div className="flex flex-col gap-2">
              {history.length === 0 ? (
                <Card className="text-sm text-neutral-400">Sin análisis registrados.</Card>
              ) : (
                [...history].reverse().map((h) => (
                  <Card key={h.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-primary">{formatDate(h.computed_at)}</p>
                      <p className="text-xs text-neutral-400">{h.reasons[0] ?? ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-primary">{h.risk_level === 'sin_historial' ? '—' : h.score}</span>
                      <Badge tone={h.risk_level === 'bajo' ? 'success' : h.risk_level === 'medio' ? 'warning' : h.risk_level === 'alto' ? 'danger' : 'neutral'}>
                        {h.risk_level === 'sin_historial' ? 'Sin historial' : h.risk_level}
                      </Badge>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === 'recomendaciones' && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-primary">Recomendaciones</p>
                <Link to={`/score/${client.id}/recomendacion`}>
                  <Button size="sm">Ver recomendación de préstamo</Button>
                </Link>
              </div>
              <ul className="flex flex-col gap-3">
                {risk.level === 'bajo' && (
                  <li className="flex items-start gap-2 text-sm text-primary">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success-600" />
                    Candidato para aumento de cupo en su próximo préstamo, dado su buen comportamiento de pago.
                  </li>
                )}
                {risk.level === 'medio' && (
                  <li className="flex items-start gap-2 text-sm text-primary">
                    <MinusCircle size={15} className="mt-0.5 shrink-0 text-neutral-400" />
                    Mantener las condiciones actuales y dar seguimiento a las próximas cuotas.
                  </li>
                )}
                {risk.level === 'alto' && (
                  <li className="flex items-start gap-2 text-sm text-primary">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger-600" />
                    Requiere seguimiento cercano de cobranza antes de considerar un nuevo préstamo.
                  </li>
                )}
                {risk.level === 'sin_historial' && (
                  <li className="flex items-start gap-2 text-sm text-primary">
                    <MinusCircle size={15} className="mt-0.5 shrink-0 text-neutral-400" />
                    Sin historial suficiente todavía para hacer una recomendación.
                  </li>
                )}
              </ul>
              <p className="mt-4 text-xs italic text-neutral-400">
                Motor de reglas basado en el historial real del cliente -- la decisión final siempre corresponde al
                usuario autorizado.
              </p>
            </Card>
          )}

          {tab === 'prestamos' && (
            <div className="flex flex-col gap-2">
              {loans.length === 0 ? (
                <Card className="text-sm text-neutral-400">Sin préstamos registrados.</Card>
              ) : (
                loans.map((l) => (
                  <Link key={l.id} to={`/prestamos/${l.id}`}>
                    <Card className="flex items-center justify-between hover:border-accent">
                      <p className="font-medium text-primary">{l.loan_number}</p>
                      <Badge tone={loanStatusTone[l.status] ?? 'neutral'}>{l.status}</Badge>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          )}

          {tab === 'pagos' && (
            <div className="flex flex-col gap-2">
              {payments.length === 0 ? (
                <Card className="text-sm text-neutral-400">Sin pagos registrados.</Card>
              ) : (
                payments.map((p) => (
                  <Card key={p.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-primary">{formatCOP(p.amount)}</p>
                      <p className="text-xs text-neutral-400">
                        {formatDate(p.payment_date)} · {p.loans?.loan_number}
                      </p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === 'cobranza' && (
            <div className="flex flex-col gap-2">
              {actions.length === 0 ? (
                <Card className="text-sm text-neutral-400">Sin gestiones de cobranza registradas.</Card>
              ) : (
                actions.map((a) => (
                  <Card key={a.id}>
                    <div className="flex items-center justify-between">
                      <p className="font-medium capitalize text-primary">{a.action_type}</p>
                      <span className="text-xs text-neutral-400">{formatDate(a.action_date)}</span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">Resultado: {a.result}</p>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}