import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Stepper } from '@/components/ui/Stepper'
import { AmortizationTable } from '@/components/ui/AmortizationTable'
import { getClients, type Client } from '@/services/clients'
import { createLoan, previewAmortization, type AmortizationRow, type InterestModality } from '@/services/loans'
import { generateContract } from '@/services/contracts'

const STEPS = [{ label: 'Cliente' }, { label: 'Condiciones' }, { label: 'Calendario' }, { label: 'Resumen' }]

const modalityLabels: Record<InterestModality, string> = {
  saldo_pendiente: 'Sobre saldo pendiente',
  capital_inicial: 'Sobre capital inicial',
  fijo: 'Cuota fija (sistema francés)',
}

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

export default function NuevoPrestamo() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedClientId = searchParams.get('clientId')

  const [step, setStep] = useState(1)
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState(preselectedClientId ?? '')

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
              <select
                className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">Selecciona un cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} {c.identification ? `— ${c.identification}` : ''}
                  </option>
                ))}
              </select>

              <Button disabled={!clientId} onClick={() => setStep(2)} className="mt-2 w-full">
                Siguiente
              </Button>
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
    </div>
  )
}