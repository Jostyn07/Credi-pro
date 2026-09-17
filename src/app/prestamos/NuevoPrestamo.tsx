import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  Plus,
  Phone,
  Wallet2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Stepper } from '@/components/ui/Stepper'
import { AmortizationTable } from '@/components/ui/AmortizationTable'
import { cn } from '@/utils/cn'
import { computeClientRisk, type ClientRisk } from '@/utils/clientRisk'
import { computeLoanRecommendation } from '@/utils/loanRecommendation'
import {
  getClients,
  getClientProfileSummary,
  getClientEvaluationMetrics,
  type Client,
  type ClientProfileSummary,
  type ClientEvaluationMetrics,
} from '@/services/clients'
import { createLoan, saveLoanDraft, previewAmortization, type AmortizationRow, type InterestModality } from '@/services/loans'
import { generateContract } from '@/services/contracts'
import { QuickNewClientModal } from './QuickNewClientModal'

const STEPS = [
  { label: 'Cliente' },
  { label: 'Condiciones' },
  { label: 'Calendario' },
  { label: 'Evaluación' },
  { label: 'Resumen' },
]

const modalityLabels: Record<InterestModality, string> = {
  saldo_pendiente: 'Sobre saldo pendiente',
  capital_inicial: 'Sobre capital inicial',
  fijo: 'Cuota fija (sistema francés)',
}

// "Modalidad de cálculo" ya define completamente cómo se arma cada cuota en
// compute_amortization_schedule() -- no es un parámetro independiente que el
// backend acepte por separado. Por eso este campo es un texto derivado
// (solo lectura), no un segundo selector que en realidad no haría nada.
const installmentMethodLabel: Record<InterestModality, string> = {
  saldo_pendiente: 'Capital fijo + interés variable',
  capital_inicial: 'Capital fijo + interés variable',
  fijo: 'Cuota fija (capital e interés varían)',
}

const riskScoreClasses: Record<ClientRisk['tone'], string> = {
  neutral: 'bg-neutral-100 text-neutral-600',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
}

const riskGaugeColor: Record<ClientRisk['tone'], string> = {
  neutral: '#94A3B8',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
}

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO')
}

function initials(fullName: string) {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
}

type BulletTone = 'good' | 'warn' | 'neutral'

function Bullet({ tone, children }: { tone: BulletTone; children: React.ReactNode }) {
  const Icon = tone === 'good' ? CheckCircle2 : tone === 'warn' ? AlertTriangle : MinusCircle
  const color = tone === 'good' ? 'text-success-600' : tone === 'warn' ? 'text-warning-600' : 'text-neutral-400'
  return (
    <li className="flex items-start gap-2 text-sm text-primary">
      <Icon size={16} className={cn('mt-0.5 shrink-0', color)} />
      <span>{children}</span>
    </li>
  )
}

export default function NuevoPrestamo() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedClientId = searchParams.get('clientId')

  const [step, setStep] = useState(1)
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState(preselectedClientId ?? '')
  const [clientSearch, setClientSearch] = useState('')
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showMoreClientInfo, setShowMoreClientInfo] = useState(false)
  const [clientSummary, setClientSummary] = useState<ClientProfileSummary | null>(null)
  const [loadingClientSummary, setLoadingClientSummary] = useState(false)
  const [metrics, setMetrics] = useState<ClientEvaluationMetrics | null>(null)

  const [principal, setPrincipal] = useState(5000000)
  const [interestRate, setInterestRate] = useState(5)
  const [interestModality, setInterestModality] = useState<InterestModality>('saldo_pendiente')
  const [termMonths, setTermMonths] = useState(6)
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().slice(0, 10))
  const [firstPaymentDate, setFirstPaymentDate] = useState('')
  const [paymentDay, setPaymentDay] = useState(5)
  const [graceDays, setGraceDays] = useState(3)
  const [lateFeeRate, setLateFeeRate] = useState(2)

  const [schedule, setSchedule] = useState<AmortizationRow[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [showFullSchedule, setShowFullSchedule] = useState(false)

  const [generateContractDoc, setGenerateContractDoc] = useState(true)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getClients().then(setClients)
  }, [])

  const selectedClient = clients.find((c) => c.id === clientId)

  // Ficha, estadísticas y métricas de puntualidad del cliente seleccionado:
  // se recalculan cada vez que cambia clientId, igual que en
  // ClientDetailPanel -- nada queda cacheado.
  useEffect(() => {
    if (!clientId) {
      setClientSummary(null)
      setMetrics(null)
      return
    }
    setLoadingClientSummary(true)
    Promise.all([getClientProfileSummary(clientId), getClientEvaluationMetrics(clientId)])
      .then(([summary, m]) => {
        setClientSummary(summary)
        setMetrics(m)
      })
      .finally(() => setLoadingClientSummary(false))
  }, [clientId])

  // Vista previa del calendario: se recalcula sola (con un pequeño debounce)
  // cada vez que cambian las condiciones, en vez de solo al presionar
  // "Siguiente". Así el resumen del paso Condiciones y el paso Calendario
  // siempre muestran el mismo cálculo real, sin duplicar la llamada.
  useEffect(() => {
    if (!firstPaymentDate || principal <= 0 || termMonths <= 0) {
      setSchedule([])
      return
    }
    setLoadingSchedule(true)
    const t = setTimeout(() => {
      previewAmortization(principal, interestRate, interestModality, termMonths, firstPaymentDate)
        .then(setSchedule)
        .catch(() => setSchedule([]))
        .finally(() => setLoadingSchedule(false))
    }, 350)
    return () => clearTimeout(t)
  }, [principal, interestRate, interestModality, termMonths, firstPaymentDate])

  const clientSearchNormalized = clientSearch.trim().toLowerCase()
  const filteredClients = clients.filter((c) => {
    if (!clientSearchNormalized) return true
    return (
      c.full_name.toLowerCase().includes(clientSearchNormalized) ||
      (c.identification ?? '').toLowerCase().includes(clientSearchNormalized) ||
      (c.phone ?? '').toLowerCase().includes(clientSearchNormalized)
    )
  })

  const risk = clientSummary ? computeClientRisk(clientSummary) : null
  const recommendation = useMemo(
    () => (clientSummary && risk && metrics ? computeLoanRecommendation(principal, risk, clientSummary, metrics) : null),
    [clientSummary, risk, metrics, principal],
  )

  function handleClientCreated(client: Client) {
    setClients((prev) => [client, ...prev])
    setClientId(client.id)
    setShowNewClientModal(false)
  }

  function goToStep3() {
    setError(null)
    if (!firstPaymentDate) {
      setError('Selecciona la fecha de la primera cuota')
      return
    }
    setStep(3)
  }

  async function handleCreateLoan() {
    setError(null)
    setSubmitting(true)
    try {
      const loan = await createLoan({
        clientId,
        principal,
        interestRate,
        interestModality,
        termMonths,
        disbursementDate,
        firstPaymentDate,
        paymentDay,
        graceDays,
        lateFeeRate,
        notes: notes || undefined,
      })
      if (generateContractDoc) {
        // Generar el contrato es un paso independiente de create_loan() a propósito
        // (ver nota de la Fase 4) -- si falla, no impide seguir con el préstamo ya creado.
        try {
          await generateContract(loan.id)
        } catch (contractError) {
          console.error('No se pudo generar el contrato automáticamente:', contractError)
        }
      }
      navigate(`/prestamos/${loan.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el préstamo')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveDraft() {
    setError(null)
    if (!firstPaymentDate) {
      setError('Selecciona la fecha de la primera cuota antes de guardar el borrador')
      return
    }
    setSavingDraft(true)
    try {
      await saveLoanDraft({
        clientId,
        principal,
        interestRate,
        interestModality,
        termMonths,
        disbursementDate,
        firstPaymentDate,
        paymentDay,
        graceDays,
        lateFeeRate,
        notes: notes || undefined,
      })
      navigate('/prestamos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el borrador')
    } finally {
      setSavingDraft(false)
    }
  }

  const estimatedInstallment = schedule[0]?.total ?? null
  const totalToPay = schedule.reduce((sum, r) => sum + r.total, 0)

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-xl font-semibold text-primary">Nuevo préstamo</h1>

        <Card>
          <Stepper steps={STEPS} currentStep={step} />

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <label className="text-sm font-medium text-primary">Seleccionar cliente</label>

              {!selectedClient ? (
                <>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                      />
                      <input
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Buscar cliente por nombre o identificación..."
                        className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-primary placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <Button type="button" variant="secondary" onClick={() => setShowNewClientModal(true)}>
                      <Plus size={16} /> Nuevo cliente
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {filteredClients.length === 0 ? (
                      <p className="py-6 text-center text-sm text-neutral-400">
                        {clientSearch
                          ? 'No se encontraron clientes con ese criterio.'
                          : 'Aún no tienes clientes registrados.'}
                      </p>
                    ) : (
                      filteredClients.slice(0, 8).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setClientId(c.id)}
                          className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-left transition-colors hover:border-accent hover:bg-accent/5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-900 text-xs font-semibold text-white">
                              {initials(c.full_name)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-primary">{c.full_name}</p>
                              <p className="text-xs text-neutral-400">
                                {[c.identification, c.phone].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                              </p>
                            </div>
                          </div>
                          <Badge tone={c.status === 'active' ? 'success' : 'neutral'}>
                            {c.status === 'active' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-neutral-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-900 text-sm font-semibold text-white">
                        {initials(selectedClient.full_name)}
                      </div>
                      <div>
                        <p className="font-semibold text-primary">{selectedClient.full_name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
                          {selectedClient.identification && (
                            <span className="flex items-center gap-1">
                              <Wallet2 size={12} /> {selectedClient.identification}
                            </span>
                          )}
                          {selectedClient.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={12} /> {selectedClient.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge tone={selectedClient.status === 'active' ? 'success' : 'neutral'}>
                      {selectedClient.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  {loadingClientSummary || !clientSummary || !risk ? (
                    <div className="mt-4 flex justify-center py-4">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-neutral-50 p-3">
                        <span
                          className={cn('rounded-md px-2 py-1 text-sm font-semibold', riskScoreClasses[risk.tone])}
                        >
                          {risk.level === 'sin_historial' ? '—' : risk.score}
                        </span>
                        <Badge tone={risk.tone}>{risk.label}</Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-4 gap-3 text-center">
                        <div>
                          <p className="text-xs text-neutral-400">Préstamos</p>
                          <p className="text-sm font-semibold text-primary">{clientSummary.loansTotal}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-400">Liquidados</p>
                          <p className="text-sm font-semibold text-primary">{clientSummary.loansLiquidated}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-400">Activos</p>
                          <p className="text-sm font-semibold text-primary">{clientSummary.loansActive}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-400">Mora histórica</p>
                          <p className="text-sm font-semibold text-primary">{clientSummary.loansInArrears}</p>
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowMoreClientInfo((v) => !v)}
                    className="mt-4 flex items-center gap-1 text-xs font-medium text-accent"
                  >
                    {showMoreClientInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Información adicional
                  </button>
                  {showMoreClientInfo && (
                    <div className="mt-2 flex flex-col gap-1 text-xs text-neutral-500">
                      {selectedClient.email && <p>Correo: {selectedClient.email}</p>}
                      {(selectedClient.address || selectedClient.city) && (
                        <p>Dirección: {[selectedClient.address, selectedClient.city].filter(Boolean).join(', ')}</p>
                      )}
                      {selectedClient.occupation && <p>Ocupación: {selectedClient.occupation}</p>}
                      {!selectedClient.email &&
                        !selectedClient.address &&
                        !selectedClient.city &&
                        !selectedClient.occupation && <p>Sin información adicional registrada.</p>}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setClientId('')
                      setShowMoreClientInfo(false)
                    }}
                    className="mt-4 text-xs font-medium text-accent hover:underline"
                  >
                    Cambiar cliente
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => navigate('/prestamos')}>
                  Cancelar
                </Button>
                <Button disabled={!clientId} onClick={() => setStep(2)} className="flex-1">
                  Siguiente →
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Monto solicitado"
                    type="number"
                    value={principal}
                    onChange={(e) => setPrincipal(Number(e.target.value))}
                  />
                  <Input
                    label="Tasa de interés (% mensual)"
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-primary">Modalidad de cálculo</label>
                    <select
                      className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
                      value={interestModality}
                      onChange={(e) => setInterestModality(e.target.value as InterestModality)}
                    >
                      {Object.entries(modalityLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-primary">Método de cuotas</label>
                    <div className="mt-1.5 flex h-10 items-center rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500">
                      {installmentMethodLabel[interestModality]}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Plazo (meses)"
                    type="number"
                    value={termMonths}
                    onChange={(e) => setTermMonths(Number(e.target.value))}
                  />
                  <Input
                    label="Día de pago"
                    type="number"
                    min={1}
                    max={28}
                    value={paymentDay}
                    onChange={(e) => setPaymentDay(Number(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Fecha de desembolso"
                    type="date"
                    value={disbursementDate}
                    onChange={(e) => setDisbursementDate(e.target.value)}
                  />
                  <Input
                    label="Primera cuota"
                    type="date"
                    value={firstPaymentDate}
                    onChange={(e) => setFirstPaymentDate(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Días de gracia"
                    type="number"
                    value={graceDays}
                    onChange={(e) => setGraceDays(Number(e.target.value))}
                  />
                  <Input
                    label="Tasa de mora (% mensual)"
                    type="number"
                    step="0.1"
                    value={lateFeeRate}
                    onChange={(e) => setLateFeeRate(Number(e.target.value))}
                  />
                </div>

                {error && <p className="text-sm text-status-danger">{error}</p>}

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(1)}>
                    ← Anterior
                  </Button>
                  <Button onClick={goToStep3} className="flex-1">
                    Siguiente →
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-accent/5 p-4">
                <p className="mb-3 text-sm font-semibold text-primary">Resumen estimado</p>
                <dl className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Monto solicitado</dt>
                    <dd className="font-medium text-primary">{formatCOP(principal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Tasa de interés</dt>
                    <dd className="font-medium text-primary">{interestRate}% mensual</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Plazo</dt>
                    <dd className="font-medium text-primary">{termMonths} meses</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Día de pago</dt>
                    <dd className="font-medium text-primary">{paymentDay} de cada mes</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Primera cuota</dt>
                    <dd className="font-medium text-primary">
                      {firstPaymentDate ? formatDate(firstPaymentDate) : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-accent/20 pt-2">
                    <dt className="text-neutral-500">Cuota estimada</dt>
                    <dd className="font-semibold text-primary">
                      {loadingSchedule ? '...' : estimatedInstallment !== null ? formatCOP(estimatedInstallment) : '—'}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-neutral-400">
                  Los valores son una estimación. El cálculo final se muestra en el resumen.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium text-primary">Calendario de pagos</p>
              <div className="grid grid-cols-3 gap-4 rounded-lg border border-neutral-200 p-4 text-sm">
                <div>
                  <p className="text-neutral-400">Fecha de desembolso</p>
                  <p className="font-medium text-primary">{formatDate(disbursementDate)}</p>
                </div>
                <div>
                  <p className="text-neutral-400">Primera cuota</p>
                  <p className="font-medium text-primary">{firstPaymentDate ? formatDate(firstPaymentDate) : '—'}</p>
                </div>
                <div>
                  <p className="text-neutral-400">Día de pago</p>
                  <p className="font-medium text-primary">{paymentDay} de cada mes</p>
                </div>
              </div>

              <p className="text-sm font-medium text-primary">Vista previa del calendario</p>
              {loadingSchedule ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                </div>
              ) : (
                <>
                  <AmortizationTable rows={showFullSchedule ? schedule : schedule.slice(0, 6)} />
                  {schedule.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowFullSchedule((v) => !v)}
                      className="self-start text-xs font-medium text-accent hover:underline"
                    >
                      {showFullSchedule ? 'Ver menos' : 'Ver calendario completo'}
                    </button>
                  )}
                </>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  ← Anterior
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1">
                  Siguiente →
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-neutral-200 p-5">
                  <p className="mb-4 text-sm font-semibold text-primary">Análisis del cliente</p>

                  {loadingClientSummary || !clientSummary || !risk ? (
                    <div className="flex justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    </div>
                  ) : (
                    <>
                      <div
                        className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full"
                        style={{
                          background: `conic-gradient(${riskGaugeColor[risk.tone]} ${risk.score * 3.6}deg, #E4E7EC 0deg)`,
                        }}
                      >
                        <div className="flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full bg-white">
                          <span className="text-2xl font-bold text-primary">
                            {risk.level === 'sin_historial' ? '—' : risk.score}
                          </span>
                          <span className="text-[10px] text-neutral-400">/100</span>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-center">
                        <Badge tone={risk.tone}>{risk.label}</Badge>
                      </div>

                      <ul className="mt-5 flex flex-col gap-2">
                        {clientSummary.loansTotal === 0 ? (
                          <Bullet tone="neutral">Cliente nuevo, sin préstamos previos en el sistema</Bullet>
                        ) : (
                          <>
                            <Bullet tone="good">{clientSummary.loansTotal} préstamo(s) anteriores</Bullet>
                            {metrics?.onTimePct !== null && metrics && (
                              <Bullet tone={metrics.onTimePct >= 90 ? 'good' : metrics.onTimePct >= 70 ? 'neutral' : 'warn'}>
                                {metrics.onTimePct}% de cuotas pagadas a tiempo
                              </Bullet>
                            )}
                            {metrics?.avgDaysLate !== null && metrics && (
                              <Bullet tone={metrics.avgDaysLate <= 0 ? 'good' : metrics.avgDaysLate < 5 ? 'neutral' : 'warn'}>
                                {metrics.avgDaysLate} día(s) promedio de atraso
                              </Bullet>
                            )}
                            {clientSummary.loansInArrears > 0 ? (
                              <Bullet tone="warn">
                                {clientSummary.loansInArrears} préstamo(s) en mora actualmente
                              </Bullet>
                            ) : (
                              <Bullet tone="good">Sin mora actual</Bullet>
                            )}
                            <Bullet tone={risk.level === 'bajo' ? 'good' : risk.level === 'medio' ? 'neutral' : 'warn'}>
                              Comportamiento{' '}
                              {risk.level === 'bajo' ? 'estable' : risk.level === 'medio' ? 'irregular' : 'de riesgo'}
                            </Bullet>
                          </>
                        )}
                      </ul>
                    </>
                  )}
                </div>

                <div className="rounded-lg border border-accent/30 bg-accent/5 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-primary">Recomendación</p>
                    <Badge tone="neutral">Motor de reglas, no IA</Badge>
                  </div>

                  {!recommendation ? (
                    <div className="flex justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-neutral-500">Monto solicitado</p>
                          <p className="font-semibold text-primary">{formatCOP(principal)}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">Monto sugerido</p>
                          <p className="font-semibold text-primary">{formatCOP(recommendation.suggestedAmount)}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">Nivel de riesgo</p>
                          <p className="font-semibold text-primary">{risk?.label ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">Confianza</p>
                          <p className="font-semibold text-primary">{recommendation.confidence}</p>
                        </div>
                      </div>

                      <p className="mb-2 mt-5 text-xs font-semibold uppercase text-neutral-400">¿Por qué?</p>
                      <ul className="flex flex-col gap-1.5">
                        {recommendation.reasons.map((reason, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-primary">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            {reason}
                          </li>
                        ))}
                      </ul>

                      <p className="mt-5 text-xs italic text-neutral-400">
                        La decisión final siempre corresponde al usuario autorizado.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(3)}>
                  ← Anterior
                </Button>
                <Button onClick={() => setStep(5)} className="flex-1">
                  Siguiente →
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold text-primary">Resumen del préstamo</p>
                <dl className="flex flex-col divide-y divide-neutral-100 text-sm">
                  {[
                    ['Cliente', `${selectedClient?.full_name ?? '—'}${selectedClient?.identification ? ` (CC ${selectedClient.identification})` : ''}`],
                    ['Monto solicitado', formatCOP(principal)],
                    ['Tasa de interés', `${interestRate}% mensual`],
                    ['Modalidad', modalityLabels[interestModality]],
                    ['Método de cuotas', installmentMethodLabel[interestModality]],
                    ['Plazo', `${termMonths} meses`],
                    ['Fecha de desembolso', formatDate(disbursementDate)],
                    ['Primera cuota', firstPaymentDate ? formatDate(firstPaymentDate) : '—'],
                    ['Día de pago', `${paymentDay} de cada mes`],
                    ['Días de gracia', `${graceDays} días`],
                    ['Tasa de mora', `${lateFeeRate}% mensual`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-2">
                      <dt className="text-neutral-500">{label}</dt>
                      <dd className="font-medium text-primary">{value}</dd>
                    </div>
                  ))}
                </dl>

                {error && <p className="text-sm text-status-danger">{error}</p>}

                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => setStep(4)}>
                    ← Anterior
                  </Button>
                  <Button variant="secondary" loading={savingDraft} onClick={handleSaveDraft}>
                    Guardar borrador
                  </Button>
                  <Button loading={submitting} onClick={handleCreateLoan} className="flex-1">
                    Solicitar aprobación
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-lg bg-accent/10 p-4 text-center">
                  <p className="text-xs text-neutral-500">Cuota estimada</p>
                  <p className="text-2xl font-bold text-primary">
                    {estimatedInstallment !== null ? formatCOP(estimatedInstallment) : '—'}
                  </p>
                  {schedule.length > 0 && (
                    <p className="mt-1 text-xs text-neutral-400">Total a pagar: {formatCOP(totalToPay)}</p>
                  )}
                </div>

                <div className="rounded-lg border border-neutral-200 p-4">
                  <p className="mb-2 text-sm font-semibold text-primary">Documentos</p>
                  <label className="flex items-center gap-2 text-sm text-primary">
                    <input
                      type="checkbox"
                      checked={generateContractDoc}
                      onChange={(e) => setGenerateContractDoc(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-accent focus:ring-accent/30"
                    />
                    Generar contrato
                  </label>
                  {/* "Enviar por correo al cliente" no se incluye a propósito: hoy no
                      existe ningún servicio de envío de correo con adjuntos en el
                      proyecto (sí hay envío de confirmación vía Supabase Auth, que es
                      algo completamente distinto). Agregarla implicaría fingir una
                      función que no hace nada. */}
                </div>

                <div>
                  <label className="text-sm font-medium text-primary">Notas (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Agregar una nota..."
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 p-3 text-sm text-primary placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <QuickNewClientModal
        open={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onCreated={handleClientCreated}
      />
    </div>
  )
}