import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  getLoan,
  getLoanConditions,
  getInstallments,
  type Loan,
  type LoanConditions,
  type Installment,
} from '@/services/loans'
import { getPaymentsByLoan, liquidateLoan, type Payment } from '@/services/payments'
import { RegistrarPagoModal } from './RegistrarPagoModal'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

const installmentStatusTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  pending: 'neutral',
  partial: 'warning',
  paid: 'success',
  overdue: 'danger',
}

export default function PrestamoDetalle() {
  const { id } = useParams<{ id: string }>()
  const [loan, setLoan] = useState<Loan | null>(null)
  const [conditions, setConditions] = useState<LoanConditions | null>(null)
  const [installments, setInstallments] = useState<Installment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [liquidating, setLiquidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    const [loanData, conditionsData, installmentsData, paymentsData] = await Promise.all([
      getLoan(id),
      getLoanConditions(id),
      getInstallments(id),
      getPaymentsByLoan(id),
    ])
    setLoan(loanData)
    setConditions(conditionsData)
    setInstallments(installmentsData)
    setPayments(paymentsData)
  }, [id])

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [loadData])

  async function handleLiquidate() {
    if (!id) return
    setError(null)
    setLiquidating(true)
    try {
      await liquidateLoan(id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo liquidar el préstamo')
    } finally {
      setLiquidating(false)
    }
  }

  if (loading || !loan || !conditions) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const capitalPending = installments.reduce((sum, i) => sum + (i.capital - i.capital_paid), 0)
  const interestGenerated = installments.reduce((sum, i) => sum + i.interest, 0)

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-4xl">
        <Link to="/prestamos" className="text-sm text-accent hover:underline">
          ← Volver a préstamos
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-primary">Préstamo {loan.loan_number}</h1>
              <Badge tone={loan.status === 'active' ? 'success' : 'neutral'}>{loan.status}</Badge>
            </div>
            <p className="text-sm text-slate-500">{loan.clients?.full_name}</p>
          </div>
          {loan.status === 'active' && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowPaymentModal(true)}>
                Registrar pago
              </Button>
              <Button variant="danger" loading={liquidating} onClick={handleLiquidate}>
                Liquidar préstamo
              </Button>
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-status-danger">{error}</p>}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <p className="text-xs text-slate-400">Monto desembolsado</p>
            <p className="mt-1 text-lg font-semibold text-primary">{formatCOP(conditions.principal)}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-400">Capital pendiente</p>
            <p className="mt-1 text-lg font-semibold text-primary">{formatCOP(Math.max(capitalPending, 0))}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-400">Intereses generados</p>
            <p className="mt-1 text-lg font-semibold text-primary">{formatCOP(interestGenerated)}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-400">Tasa / Plazo</p>
            <p className="mt-1 text-lg font-semibold text-primary">
              {conditions.interest_rate}% · {conditions.term_months}m
            </p>
          </Card>
        </div>

        <h2 className="mb-3 mt-8 text-sm font-medium text-primary">Cuotas</h2>
        <div className="overflow-x-auto rounded-card border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Capital</th>
                <th className="px-4 py-2 font-medium">Interés</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {installments.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-2 text-primary">{i.number}</td>
                  <td className="px-4 py-2 text-primary">{new Date(i.due_date).toLocaleDateString('es-CO')}</td>
                  <td className="px-4 py-2 text-primary">{formatCOP(i.capital)}</td>
                  <td className="px-4 py-2 text-primary">{formatCOP(i.interest)}</td>
                  <td className="px-4 py-2 font-medium text-primary">{formatCOP(i.capital + i.interest)}</td>
                  <td className="px-4 py-2">
                    <Badge tone={installmentStatusTone[i.status]}>{i.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mb-3 mt-8 text-sm font-medium text-primary">Pagos registrados</h2>
        {payments.length === 0 ? (
          <Card className="text-sm text-slate-400">Aún no se han registrado pagos.</Card>
        ) : (
          <div className="flex flex-col gap-2">
            {payments.map((p) => (
              <Card key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-primary">{formatCOP(p.amount)}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(p.payment_date).toLocaleDateString('es-CO')} · {p.payment_method}
                    {p.is_liquidation && ' · Liquidación total'}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <RegistrarPagoModal
        loanId={loan.id}
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={loadData}
      />
    </div>
  )
}