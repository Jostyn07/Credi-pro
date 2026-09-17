import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Sparkles, CheckCircle2, Info } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getClient, getClientProfileSummary, getClientEvaluationMetrics, type Client, type ClientProfileSummary, type ClientEvaluationMetrics } from '@/services/clients'
import { computeClientRisk } from '@/utils/clientRisk'
import { computeLoanRecommendation } from '@/utils/loanRecommendation'
import { getOrganizationDefaults } from '@/services/organizations'
import { previewAmortization, type AmortizationRow } from '@/services/loans'
import { createRecommendationRecord, updateRecommendationDecision } from '@/services/loanRecommendations'
import { useAuth } from '@/contexts/AuthContext'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n.charAt(0)).join('').toUpperCase()
}

export default function RecomendacionPrestamo() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [client, setClient] = useState<Client | null>(null)
  const [summary, setSummary] = useState<ClientProfileSummary | null>(null)
  const [metrics, setMetrics] = useState<ClientEvaluationMetrics | null>(null)
  const [interestRate, setInterestRate] = useState(5)
  const [interestModality, setInterestModality] = useState<'saldo_pendiente' | 'capital_inicial' | 'fijo'>('saldo_pendiente')
  const [loading, setLoading] = useState(true)

  const [requestedAmount, setRequestedAmount] = useState(10000000)
  const [termMonths, setTermMonths] = useState(8)
  const [schedule, setSchedule] = useState<AmortizationRow[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)

  const [recordId, setRecordId] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const recordCreatedRef = useRef(false)

  useEffect(() => {
    if (!clientId || !profile?.organization_id) return
    Promise.all([
      getClient(clientId),
      getClientProfileSummary(clientId),
      getClientEvaluationMetrics(clientId),
      getOrganizationDefaults(profile.organization_id),
    ])
      .then(([c, s, m, orgDefaults]) => {
        setClient(c)
        setSummary(s)
        setMetrics(m)
        if (orgDefaults.default_interest_rate) setInterestRate(Number(orgDefaults.default_interest_rate))
        if (orgDefaults.default_interest_modality) {
          setInterestModality(orgDefaults.default_interest_modality as typeof interestModality)
        }
      })
      .finally(() => setLoading(false))
  }, [clientId, profile?.organization_id])

  const risk = summary ? computeClientRisk(summary) : null
  const recommendation = useMemo(
    () => (summary && risk && metrics ? computeLoanRecommendation(requestedAmount, risk, summary, metrics) : null),
    [summary, risk, metrics, requestedAmount],
  )

  // Se guarda una sola vez por visita a la página (no en cada re-render) como
  // "en_revision" -- así el historial refleja que se generó una
  // recomendación, incluso si el usuario nunca toma una decisión sobre ella.
  useEffect(() => {
    if (recordCreatedRef.current || !recommendation || !clientId || !profile?.organization_id || !risk) return
    recordCreatedRef.current = true
    createRecommendationRecord({
      clientId,
      organizationId: profile.organization_id,
      requestedAmount,
      suggestedTermMonths: termMonths,
      riskLevel: risk.level,
      recommendation,
    }).then((rec) => {
      setRecordId(rec.id)
      setGeneratedAt(rec.created_at)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendation])

  useEffect(() => {
    if (!recommendation) return
    const firstPayment = new Date()
    firstPayment.setMonth(firstPayment.getMonth() + 1)
    setLoadingSchedule(true)
    previewAmortization(
      recommendation.suggestedAmount,
      interestRate,
      interestModality,
      termMonths,
      firstPayment.toISOString().slice(0, 10),
    )
      .then(setSchedule)
      .catch(() => setSchedule([]))
      .finally(() => setLoadingSchedule(false))
  }, [recommendation, interestRate, interestModality, termMonths])

  async function handleCreateLoan() {
    if (!recommendation || !clientId) return
    setSubmitting(true)
    if (recordId) await updateRecommendationDecision(recordId, 'aprobado')
    navigate(`/prestamos/nuevo?clientId=${clientId}&amount=${recommendation.suggestedAmount}&term=${termMonths}`)
  }

  async function handleAdjust() {
    if (!clientId) return
    if (recordId) await updateRecommendationDecision(recordId, 'ajustado')
    navigate(`/prestamos/nuevo?clientId=${clientId}`)
  }

  if (loading || !client || !summary || !risk || !metrics) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const estimatedInstallment = schedule[0]?.total ?? 0
  const totalToPay = schedule.reduce((s, r) => s + r.total, 0)

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-4xl">
        <Link to={`/score/${clientId}`} className="text-sm text-accent hover:underline">
          ← Volver al cliente
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-900 text-sm font-semibold text-white">
              {initials(client.full_name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-primary">{client.full_name}</p>
                <Badge tone={risk.tone}>Score: {risk.level === 'sin_historial' ? '—' : risk.score}</Badge>
              </div>
              {client.identification && <p className="text-xs text-neutral-500">CC {client.identification}</p>}
            </div>
          </div>
          {generatedAt && (
            <p className="text-xs text-neutral-400">Análisis generado: {new Date(generatedAt).toLocaleDateString('es-CO')}</p>
          )}
        </div>

        <Card className="mt-6">
          <p className="mb-3 text-sm font-medium text-primary">Monto que solicita el cliente</p>
          <div className="grid grid-cols-2 gap-4 sm:max-w-md">
            <Input
              label="Monto solicitado"
              type="number"
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(Number(e.target.value))}
            />
            <Input label="Plazo (meses)" type="number" value={termMonths} onChange={(e) => setTermMonths(Number(e.target.value))} />
          </div>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              <p className="text-sm font-semibold text-primary">Recomendación de la IA</p>
            </div>
            <p className="mb-4 text-sm text-neutral-500">
              Con base en el comportamiento histórico del cliente, se recomiendan las siguientes condiciones.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="text-xs text-neutral-400">Monto sugerido</p>
                <p className="text-lg font-bold text-primary">{formatCOP(recommendation!.suggestedAmount)}</p>
                <p className="text-xs text-neutral-400">Solicitado: {formatCOP(requestedAmount)}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="text-xs text-neutral-400">Plazo sugerido</p>
                <p className="text-lg font-bold text-primary">{termMonths} meses</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="text-xs text-neutral-400">Nivel de riesgo</p>
                <Badge tone={risk.tone}>{risk.label}</Badge>
              </div>
            </div>

            <div className="mt-5 rounded-lg bg-accent/5 p-4">
              <p className="mb-2 text-sm font-semibold text-primary">¿Por qué esta recomendación?</p>
              <ul className="flex flex-col gap-1.5">
                {recommendation!.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-primary">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success-600" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <p className="mb-3 text-sm font-semibold text-primary">Simulación sugerida</p>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Monto</dt>
                  <dd className="font-medium text-primary">{formatCOP(recommendation!.suggestedAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Tasa de interés</dt>
                  <dd className="font-medium text-primary">{interestRate}% mensual</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Plazo</dt>
                  <dd className="font-medium text-primary">{termMonths} meses</dd>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-2">
                  <dt className="text-neutral-500">Cuota estimada</dt>
                  <dd className="font-semibold text-primary">
                    {loadingSchedule ? '...' : formatCOP(estimatedInstallment)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Total a pagar</dt>
                  <dd className="font-medium text-primary">{loadingSchedule ? '...' : formatCOP(totalToPay)}</dd>
                </div>
              </dl>
            </Card>

            <div className="flex items-start gap-2 rounded-lg bg-info-100 p-3 text-info-700">
              <Info size={16} className="mt-0.5 shrink-0" />
              <p className="text-xs">
                Esta es solo una recomendación. La decisión final siempre corresponde al usuario autorizado.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={handleAdjust}>
            Ajustar condiciones
          </Button>
          <Button loading={submitting} onClick={handleCreateLoan}>
            Crear préstamo →
          </Button>
        </div>
      </div>
    </div>
  )
}