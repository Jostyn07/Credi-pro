import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, Phone, Wallet2, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Stepper } from '@/components/ui/Stepper'
import { AmortizationTable } from '@/components/ui/AmortizationTable'
import { cn } from '@/utils/cn'
import { computeClientRisk, type ClientRisk } from '@/utils/clientRisk'
import {
  getClients,
  getClientProfileSummary,
  type Client,
  type ClientProfileSummary,
} from '@/services/clients'
import { createLoan, previewAmortization, type AmortizationRow, type InterestModality } from '@/services/loans'
import { generateContract } from '@/services/contracts'
import { QuickNewClientModal } from './QuickNewClientModal'

const STEPS = [{ label: 'Cliente' }, { label: 'Condiciones' }, { label: 'Calendario' }, { label: 'Resumen' }]

const modalityLabels: Record<InterestModality, string> = {
  saldo_pendiente: 'Sobre saldo pendiente',
  capital_inicial: 'Sobre capital inicial',
  fijo: 'Cuota fija (sistema francés)',
}

const riskScoreClasses: Record<ClientRisk['tone'], string> = {
  neutral: 'bg-neutral-100 text-neutral-600',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
}

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

function initials(fullName: string) {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getClients().then(setClients)
  }, [])

  const selectedClient = clients.find((c) => c.id === clientId)

  // Ficha y estadísticas del cliente seleccionado: se recalculan cada vez que
  // cambia clientId, igual que en ClientDetailPanel — nada queda cacheado.
  useEffect(() => {
    if (!clientId) {
      setClientSummary(null)
      return
    }
    setLoadingClientSummary(true)
    getClientProfileSummary(clientId)
      .then(setClientSummary)
      .finally(() => setLoadingClientSummary(false))
  }, [clientId])

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

  function handleClientCreated(client: Client) {
    setClients((prev) => [client, ...prev])
    setClientId(client.id)
    setShowNewClientModal(false)
  }

  async function handleGoToCalendar() {
    setError(null)
    if (!firstPaymentDate) {
      setError('Selecciona la fecha de la primera cuota')
      return
    }
    setLoadingSchedule(true)
    try {
      const rows = await previewAmortization(principal, interestRate, interestModality, termMonths, firstPaymentDate)
      setSchedule(rows)
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo calcular el calendario')
    } finally {
      setLoadingSchedule(false)
    }
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
      })
      // Generar el contrato es un paso independiente de create_loan() a propósito
      // (ver nota de la Fase 4) — si falla, no impide seguir con el préstamo ya creado.
      try {
        await generateContract(loan.id)
      } catch (contractError) {
        console.error('No se pudo generar el contrato automáticamente:', contractError)
      }
      navigate(`/prestamos/${loan.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el préstamo')
    } finally {
      setSubmitting(false)
    }
  }

  const totalToPay = schedule.reduce((sum, r) => sum + r.total, 0)
  const estimatedInstallment = schedule[0]?.total ?? 0

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-3xl">
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
                          className={cn(
                            'rounded-md px-2 py-1 text-sm font-semibold',
                            riskScoreClasses[risk.tone],
                          )}
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
                <Button loading={loadingSchedule} onClick={handleGoToCalendar} className="flex-1">
                  Ver calendario →
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-neutral-500">
                Vista previa del calendario de amortización ({modalityLabels[interestModality]}).
              </p>
              <AmortizationTable rows={schedule} />

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
              <div className="rounded-lg bg-accent/10 p-4">
                <p className="text-sm text-neutral-600">Cliente</p>
                <p className="font-medium text-primary">{selectedClient?.full_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-400">Monto solicitado</p>
                  <p className="font-medium text-primary">{formatCOP(principal)}</p>
                </div>
                <div>
                  <p className="text-neutral-400">Tasa</p>
                  <p className="font-medium text-primary">{interestRate}% mensual</p>
                </div>
                <div>
                  <p className="text-neutral-400">Modalidad</p>
                  <p className="font-medium text-primary">{modalityLabels[interestModality]}</p>
                </div>
                <div>
                  <p className="text-neutral-400">Plazo</p>
                  <p className="font-medium text-primary">{termMonths} meses</p>
                </div>
                <div>
                  <p className="text-neutral-400">Cuota estimada</p>
                  <p className="font-medium text-primary">{formatCOP(estimatedInstallment)}</p>
                </div>
                <div>
                  <p className="text-neutral-400">Total a pagar</p>
                  <p className="font-medium text-primary">{formatCOP(totalToPay)}</p>
                </div>
              </div>

              {error && <p className="text-sm text-status-danger">{error}</p>}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(3)}>
                  ← Anterior
                </Button>
                <Button loading={submitting} onClick={handleCreateLoan} className="flex-1">
                  Crear préstamo
                </Button>
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