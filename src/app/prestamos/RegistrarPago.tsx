import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { getLoan, getInstallments, type Loan, type Installment } from '@/services/loans'
import { getAccounts, type Account } from '@/services/accounts'
import {
  previewPaymentAllocation,
  registerPayment,
  PREPAYMENT_STRATEGY_REQUIRED_PREFIX,
  type PaymentAllocationPreview,
  type PrepaymentStrategy,
  type AccountSplit,
} from '@/services/payments'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

const installmentStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagada',
  overdue: 'Vencida',
}

const strategyOptions: { value: PrepaymentStrategy; label: string; description: string }[] = [
  {
    value: 'none',
    label: 'No recalcular',
    description: 'El sobrante abona capital de las próximas cuotas sin cambiar su interés ni el plazo.',
  },
  {
    value: 'reduce_term',
    label: 'Reducir el plazo',
    description: 'Mismo valor de capital por cuota, pero con menos cuotas restantes.',
  },
  {
    value: 'reduce_installment',
    label: 'Reducir el valor de la cuota',
    description: 'Mismo número de cuotas restantes, pero con un valor más bajo cada una.',
  },
]

export default function RegistrarPago() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loan, setLoan] = useState<Loan | null>(null)
  const [installments, setInstallments] = useState<Installment[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState('transferencia')
  const [splits, setSplits] = useState<{ accountId: string; amount: string }[]>([{ accountId: '', amount: '' }])
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  const [preview, setPreview] = useState<PaymentAllocationPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [prepaymentAmount, setPrepaymentAmount] = useState<number | null>(null)
  const [strategy, setStrategy] = useState<PrepaymentStrategy>('none')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([getLoan(id), getInstallments(id), getAccounts()])
      .then(([loanData, installmentsData, accountsData]) => {
        setLoan(loanData)
        setInstallments(installmentsData)
        setAccounts(accountsData)
      })
      .finally(() => setLoading(false))
  }, [id])

  // Vista previa de aplicación del pago (automática): se recalcula sola con
  // un pequeño debounce cada vez que cambia el monto o la fecha.
  useEffect(() => {
    if (!id) return
    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      setPreview(null)
      return
    }
    setLoadingPreview(true)
    const t = setTimeout(() => {
      previewPaymentAllocation(id, numericAmount, paymentDate)
        .then(setPreview)
        .catch(() => setPreview(null))
        .finally(() => setLoadingPreview(false))
    }, 350)
    return () => clearTimeout(t)
  }, [id, amount, paymentDate])

  useEffect(() => {
    setSplits((prev) => (prev.length === 1 ? [{ ...prev[0], amount }] : prev))
  }, [amount])

  function addSplit() {
    setSplits((prev) => [...prev, { accountId: '', amount: '' }])
  }
  function removeSplit(index: number) {
    setSplits((prev) => prev.filter((_, i) => i !== index))
  }
  function updateSplit(index: number, field: 'accountId' | 'amount', value: string) {
    setSplits((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  const splitsSum = splits.reduce((s, sp) => s + (Number(sp.amount) || 0), 0)
  const splitsValid =
    splits.length > 0 &&
    splits.every((s) => s.accountId && Number(s.amount) > 0) &&
    Math.abs(splitsSum - Number(amount || 0)) < 1


  // aplica register_payment() en el backend: capital+interés+mora, más
  // antigua primero). Con eso estimamos en qué queda ESA cuota puntual —
  // no es una segunda fuente de verdad, es una proyección informativa sobre
  // el mismo cálculo que ya trae `preview`.
  const firstUnpaid = installments
    .filter((i) => i.status !== 'paid')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]

  let firstUnpaidProjection: { status: string; remaining: number } | null = null
  if (firstUnpaid && preview) {
    const capitalDue = firstUnpaid.capital - firstUnpaid.capital_paid
    const interestDue = firstUnpaid.interest - firstUnpaid.interest_paid
    const appliedCapital = Math.min(preview.capital_amount, capitalDue)
    const appliedInterest = Math.min(preview.interest_amount, interestDue)
    const remaining = capitalDue - appliedCapital + (interestDue - appliedInterest)
    firstUnpaidProjection = {
      status: remaining <= 0 ? 'paid' : appliedCapital + appliedInterest > 0 ? 'partial' : firstUnpaid.status,
      remaining: Math.max(remaining, 0),
    }
  }

  async function submitPayment(prepaymentStrategy?: PrepaymentStrategy) {
    if (!id) return
    const accountSplits: AccountSplit[] = splits.map((s) => ({ accountId: s.accountId, amount: Number(s.amount) }))
    await registerPayment({
      loanId: id,
      amount: Number(amount),
      paymentDate,
      paymentMethod,
      reference: reference || undefined,
      notes: notes || undefined,
      accountSplits,
      prepaymentStrategy,
    })
    navigate(`/prestamos/${id}`)
  }

  async function handleSubmit() {
    if (!id) return
    setError(null)
    if (!splitsValid) {
      setError('Indica a qué cuenta(s) va el pago — la suma debe ser igual al monto total')
      return
    }
    setSubmitting(true)
    try {
      const p = await previewPaymentAllocation(id, Number(amount), paymentDate)
      if (p.prepayment_amount > 0) {
        setPrepaymentAmount(p.prepayment_amount)
        setSubmitting(false)
        return
      }
      await submitPayment()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago')
      setSubmitting(false)
    }
  }

  async function handleConfirmStrategy() {
    setError(null)
    setSubmitting(true)
    try {
      await submitPayment(strategy)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo registrar el pago'
      if (message.includes(PREPAYMENT_STRATEGY_REQUIRED_PREFIX)) {
        setError('El saldo cambió justo antes de confirmar. Vuelve a intentarlo.')
        setPrepaymentAmount(null)
      } else {
        setError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !loan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-4xl">
        <Link to={`/prestamos/${loan.id}`} className="text-sm text-accent hover:underline">
          ← Volver al préstamo
        </Link>

        <h1 className="mt-2 text-xl font-semibold text-primary">Registrar pago</h1>
        <p className="text-sm text-neutral-500">
          Préstamo #{loan.loan_number} - {loan.clients?.full_name}
        </p>

        {prepaymentAmount !== null ? (
          <Card className="mt-6">
            <div className="rounded-lg bg-accent/10 p-4 text-sm text-accent">
              Este pago cubre todas las cuotas al día y sobran <strong>{formatCOP(prepaymentAmount)}</strong> como
              abono anticipado a capital. ¿Qué deseas hacer con las cuotas futuras?
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {strategyOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-300 p-3 hover:border-primary-500"
                >
                  <input
                    type="radio"
                    name="strategy"
                    className="mt-1"
                    checked={strategy === opt.value}
                    onChange={() => setStrategy(opt.value)}
                  />
                  <div>
                    <p className="text-sm font-medium text-primary">{opt.label}</p>
                    <p className="text-xs text-neutral-500">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {error && <p className="mt-4 text-sm text-status-danger">{error}</p>}

            <div className="mt-4 flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setPrepaymentAmount(null)} className="flex-1">
                ← Volver
              </Button>
              <Button loading={submitting} onClick={handleConfirmStrategy} className="flex-1">
                Confirmar y registrar
              </Button>
            </div>
          </Card>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card>
              <p className="mb-4 text-sm font-semibold text-primary">Información del pago</p>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Fecha de pago"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                  <Input
                    label="Monto a pagar"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-primary">Medio de pago</label>
                    <select
                      className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="transferencia">Transferencia</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="nequi">Nequi</option>
                      <option value="daviplata">Daviplata</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-primary">¿A qué cuenta(s) va este pago?</label>
                    {splits.length < accounts.length && (
                      <button
                        type="button"
                        onClick={addSplit}
                        className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                      >
                        <Plus size={12} /> Dividir entre otra cuenta
                      </button>
                    )}
                  </div>

                  {accounts.length === 0 ? (
                    <p className="rounded-lg bg-warning-100 p-3 text-xs text-warning-700">
                      No tienes ninguna cuenta de caja creada.{' '}
                      <Link to="/caja" className="font-medium underline">
                        Crea una en Caja
                      </Link>{' '}
                      antes de registrar el pago.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {splits.map((split, i) => (
                        <div key={i} className="flex gap-2">
                          <select
                            className="h-10 flex-1 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
                            value={split.accountId}
                            onChange={(e) => updateSplit(i, 'accountId', e.target.value)}
                          >
                            <option value="">Selecciona una cuenta...</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Monto"
                            value={split.amount}
                            onChange={(e) => updateSplit(i, 'amount', e.target.value)}
                            disabled={splits.length === 1}
                            className="h-10 w-32 rounded-lg border border-neutral-300 px-3 text-sm text-primary disabled:bg-neutral-50 disabled:text-neutral-400"
                          />
                          {splits.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSplit(i)}
                              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-danger-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      {splits.length > 1 && (
                        <p className={`text-xs ${Math.abs(splitsSum - Number(amount || 0)) < 1 ? 'text-success-600' : 'text-danger-600'}`}>
                          Suma: {formatCOP(splitsSum)} / {formatCOP(Number(amount || 0))}
                        </p>
                      )}
                    </div>
                  )}
                </div>


                <Input label="Referencia (opcional)" value={reference} onChange={(e) => setReference(e.target.value)} />
                <Input label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

                {error && <p className="text-sm text-status-danger">{error}</p>}

                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => navigate(`/prestamos/${loan.id}`)}>
                    Cancelar
                  </Button>
                  <Button
                    loading={submitting}
                    disabled={!amount || Number(amount) <= 0 || !splitsValid}
                    onClick={handleSubmit}
                    className="flex-1"
                  >
                    Registrar pago
                  </Button>
                </div>
              </div>
            </Card>

            <div className="rounded-lg bg-accent/5 p-4">
              <p className="mb-3 text-sm font-semibold text-primary">Aplicación del pago (automática)</p>
              {loadingPreview ? (
                <div className="flex justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                </div>
              ) : !preview ? (
                <p className="text-sm text-neutral-400">Ingresa un monto para ver cómo se aplicaría.</p>
              ) : (
                <>
                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Intereses</dt>
                      <dd className="font-medium text-primary">{formatCOP(preview.interest_amount)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Mora</dt>
                      <dd className="font-medium text-primary">{formatCOP(preview.late_fee_amount)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Capital</dt>
                      <dd className="font-medium text-primary">{formatCOP(preview.capital_amount)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-accent/20 pt-2">
                      <dt className="text-neutral-500">Total aplicado</dt>
                      <dd className="font-semibold text-primary">
                        {formatCOP(preview.interest_amount + preview.late_fee_amount + preview.capital_amount)}
                      </dd>
                    </div>
                  </dl>

                  {firstUnpaid && firstUnpaidProjection && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-success-100 p-3 text-success-700">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                      <p className="text-xs">
                        La cuota #{firstUnpaid.number} quedará como{' '}
                        <strong>{installmentStatusLabel[firstUnpaidProjection.status]}</strong>.<br />
                        Saldo restante de la cuota: {formatCOP(firstUnpaidProjection.remaining)}
                      </p>
                    </div>
                  )}

                  {preview.prepayment_amount > 0 && (
                    <p className="mt-3 text-xs text-neutral-400">
                      {formatCOP(preview.prepayment_amount)} quedarían como abono anticipado a capital — se te
                      preguntará qué hacer con las cuotas futuras al confirmar.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}