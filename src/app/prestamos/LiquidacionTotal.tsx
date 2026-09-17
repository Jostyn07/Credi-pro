import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { getLoan, getLoanConditions, getInstallments, type Loan, type LoanConditions, type Installment } from '@/services/loans'
import { getAccounts, type Account } from '@/services/accounts'
import { liquidateLoan } from '@/services/payments'

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
  const [accountId, setAccountId] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

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

  if (loading || !loan || !conditions) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const pending = installments.filter((i) => i.status !== 'paid')
  const capitalPending = pending.reduce((sum, i) => sum + Math.max(i.capital - i.capital_paid, 0), 0)
  const interestCaused = pending.reduce((sum, i) => sum + Math.max(i.interest - i.interest_paid, 0), 0)
  // Mismo cálculo de mora que usa liquidate_loan() en el backend: por cuota
  // vencida, (total - lo ya pagado) * tasa de mora. Esto es una vista previa
  // -- el monto que realmente se cobra lo calcula el backend en el momento
  // de confirmar, por si algo cambió en el medio (otro pago, por ejemplo).
  const today = new Date(paymentDate)
  const mora = pending.reduce((sum, i) => {
    const due = new Date(i.due_date)
    const daysOverdue = Math.max(0, Math.round((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
    if (daysOverdue <= 0) return sum
    const lateFeeDue = Math.round((i.capital + i.interest - i.capital_paid - i.interest_paid) * (conditions.late_fee_rate / 100) * 100) / 100
    return sum + Math.max(lateFeeDue - i.late_fee_paid, 0)
  }, 0)
  const totalToPay = capitalPending + interestCaused + mora
  const alreadySettled = pending.length === 0

  async function handleConfirm() {
    if (!id) return
    setError(null)
    setSubmitting(true)
    try {
      await liquidateLoan({
        loanId: id,
        paymentDate,
        paymentMethod,
        reference: reference || undefined,
        notes: notes || undefined,
        accountId: accountId || undefined,
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-primary">Cuenta</label>
                    <select
                      className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary disabled:bg-neutral-50 disabled:text-neutral-400"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      disabled={accounts.length === 0}
                    >
                      <option value="">{accounts.length === 0 ? 'Sin cuentas de caja' : 'Sin asignar'}</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Referencia (opcional)"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-primary">Notas (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Agregar una nota..."
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 p-3 text-sm text-primary placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                {error && <p className="text-sm text-status-danger">{error}</p>}

                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => navigate(`/prestamos/${loan.id}`)}>
                    Cancelar
                  </Button>
                  <Button variant="success" loading={submitting} onClick={handleConfirm} className="flex-1">
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