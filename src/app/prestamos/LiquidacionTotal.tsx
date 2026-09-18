import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Info, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { getLoan, getLoanConditions, getInstallments, type Loan, type LoanConditions, type Installment } from '@/services/loans'
import { getAccounts, type Account } from '@/services/accounts'
import { liquidateLoan, type AccountSplit } from '@/services/payments'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

export default function LiquidacionTotal() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loan, setLoan] = useState<Loan | null>(null)
  const [conditions, setConditions] = useState<LoanConditions | null>(null)
  const [installments, setInstallments] = useState<Installment[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState('transferencia')
  const [splits, setSplits] = useState<{ accountId: string; amount: string }[]>([{ accountId: '', amount: '' }])
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([getLoan(id), getLoanConditions(id), getInstallments(id), getAccounts()])
      .then(([loanData, conditionsData, installmentsData, accountsData]) => {
        setLoan(loanData)
        setConditions(conditionsData)
        setInstallments(installmentsData)
        setAccounts(accountsData)
      })
      .finally(() => setLoading(false))
  }, [id])

  const pending = installments.filter((i) => i.status !== 'paid')
  const capitalPending = pending.reduce((sum, i) => sum + Math.max(i.capital - i.capital_paid, 0), 0)
  const interestCaused = pending.reduce((sum, i) => sum + Math.max(i.interest - i.interest_paid, 0), 0)
  // Mismo cálculo de mora que usa liquidate_loan() en el backend: por cuota
  // vencida, (total - lo ya pagado) * tasa de mora. Esto es una vista previa
  // -- el monto que realmente se cobra lo calcula el backend en el momento
  // de confirmar, por si algo cambió en el medio (otro pago, por ejemplo).
  const today = new Date(paymentDate)
  const lateFeeRate = conditions?.late_fee_rate ?? 0
  const mora = pending.reduce((sum, i) => {
    const due = new Date(i.due_date)
    const daysOverdue = Math.max(0, Math.round((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
    if (daysOverdue <= 0) return sum
    const lateFeeDue = Math.round((i.capital + i.interest - i.capital_paid - i.interest_paid) * (lateFeeRate / 100) * 100) / 100
    return sum + Math.max(lateFeeDue - i.late_fee_paid, 0)
  }, 0)
  const totalToPay = capitalPending + interestCaused + mora
  const alreadySettled = pending.length === 0

  // Auto-rellena el monto de la única fila con el total a pagar, una vez que
  // ya se conoce (no se puede mutar el estado directamente durante el render).
  useEffect(() => {
    if (totalToPay > 0) {
      setSplits((prev) => (prev.length === 1 && !prev[0].amount ? [{ ...prev[0], amount: String(totalToPay) }] : prev))
    }
  }, [totalToPay])

  const splitsSum = splits.reduce((s, sp) => s + (Number(sp.amount) || 0), 0)
  const splitsValid =
    splits.length > 0 && splits.every((s) => s.accountId && Number(s.amount) > 0) && Math.abs(splitsSum - totalToPay) < 1

  if (loading || !loan || !conditions) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  function addSplit() {
    setSplits((prev) => [...prev, { accountId: '', amount: '' }])
  }
  function removeSplit(index: number) {
    setSplits((prev) => prev.filter((_, i) => i !== index))
  }
  function updateSplit(index: number, field: 'accountId' | 'amount', value: string) {
    setSplits((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  async function handleConfirm() {
    if (!id) return
    setError(null)
    if (!splitsValid) {
      setError('Indica a qué cuenta(s) va el pago — la suma debe ser igual al total a liquidar')
      return
    }
    setSubmitting(true)
    try {
      const accountSplits: AccountSplit[] = splits.map((s) => ({ accountId: s.accountId, amount: Number(s.amount) }))
      await liquidateLoan({
        loanId: id,
        paymentDate,
        paymentMethod,
        reference: reference || undefined,
        accountSplits,
      })
      navigate(`/prestamos/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la liquidación')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-4xl">
        <Link to={`/prestamos/${loan.id}`} className="text-sm text-accent hover:underline">
          ← Volver al préstamo
        </Link>

        <h1 className="mt-2 text-xl font-semibold text-primary">Liquidación total</h1>
        <p className="text-sm text-neutral-500">
          Préstamo #{loan.loan_number} - {loan.clients?.full_name}
        </p>

        {alreadySettled ? (
          <Card className="mt-6 text-sm text-neutral-500">
            Este préstamo ya está al día, no tiene saldo pendiente que liquidar.
          </Card>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <p className="mb-4 text-sm font-semibold text-primary">Detalle de liquidación</p>
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Capital pendiente</dt>
                  <dd className="font-medium text-primary">{formatCOP(capitalPending)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Intereses causados</dt>
                  <dd className="font-medium text-primary">{formatCOP(interestCaused)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Mora</dt>
                  <dd className="font-medium text-primary">{formatCOP(mora)}</dd>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-3">
                  <dt className="font-medium text-accent">Total a pagar</dt>
                  <dd className="text-lg font-bold text-accent">{formatCOP(totalToPay)}</dd>
                </div>
              </dl>

              <div className="mt-5 flex items-start gap-2 rounded-lg bg-info-100 p-3 text-info-700">
                <Info size={16} className="mt-0.5 shrink-0" />
                <p className="text-xs">
                  Una vez registrada la liquidación, el préstamo pasará a estado "Liquidado" y ya no se podrán
                  registrar más pagos.
                </p>
              </div>
            </Card>

            <Card>
              <p className="mb-4 text-sm font-semibold text-primary">Confirmación</p>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Fecha de pago"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
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

                <Input label="Referencia (opcional)" value={reference} onChange={(e) => setReference(e.target.value)} />

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
                      antes de liquidar el préstamo.
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
                        <p className={`text-xs ${Math.abs(splitsSum - totalToPay) < 1 ? 'text-success-600' : 'text-danger-600'}`}>
                          Suma: {formatCOP(splitsSum)} / {formatCOP(totalToPay)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {error && <p className="text-sm text-status-danger">{error}</p>}

                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => navigate(`/prestamos/${loan.id}`)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="success"
                    loading={submitting}
                    disabled={!splitsValid}
                    onClick={handleConfirm}
                    className="flex-1"
                  >
                    Confirmar liquidación
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}