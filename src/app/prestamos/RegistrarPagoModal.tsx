import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  registerPayment,
  previewPaymentAllocation,
  PREPAYMENT_STRATEGY_REQUIRED_PREFIX,
  type PrepaymentStrategy,
} from '@/services/payments'

interface RegistrarPagoModalProps {
  loanId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
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

export function RegistrarPagoModal({ loanId, open, onClose, onSuccess }: RegistrarPagoModalProps) {
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState('transferencia')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Cuando se detecta abono anticipado, aquí queda el monto sobrante y el
  // formulario cambia a pedir la estrategia antes de confirmar.
  const [prepaymentAmount, setPrepaymentAmount] = useState<number | null>(null)
  const [strategy, setStrategy] = useState<PrepaymentStrategy>('none')

  function resetAndClose() {
    setAmount('')
    setReference('')
    setNotes('')
    setPrepaymentAmount(null)
    setStrategy('none')
    onClose()
  }

  async function submitPayment(prepaymentStrategy?: PrepaymentStrategy) {
    await registerPayment({
      loanId,
      amount: Number(amount),
      paymentDate,
      paymentMethod,
      reference: reference || undefined,
      notes: notes || undefined,
      prepaymentStrategy,
      // Este modal no tiene UI de selección de cuentas — quedó reemplazado
      // por la página RegistrarPago.tsx. No se usa en ningún lado del código
      // (búscalo: no hay ningún import de RegistrarPagoModal). Bórralo.
      accountSplits: [],
    })
    onSuccess()
    resetAndClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Primero preguntamos cómo se distribuiría el pago, para detectar si hay
      // abono anticipado a capital ANTES de intentar registrarlo.
      const preview = await previewPaymentAllocation(loanId, Number(amount), paymentDate)
      if (preview.prepayment_amount > 0) {
        setPrepaymentAmount(preview.prepayment_amount)
        setLoading(false)
        return
      }
      await submitPayment()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago')
      setLoading(false)
    }
  }

  async function handleConfirmStrategy() {
    setError(null)
    setLoading(true)
    try {
      await submitPayment(strategy)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo registrar el pago'
      // Por si el preview y el registro real difieren (ej. otro pago se registró
      // en el medio), el backend vuelve a exigir la estrategia con este prefijo.
      if (message.includes(PREPAYMENT_STRATEGY_REQUIRED_PREFIX)) {
        setError('El saldo cambió justo antes de confirmar. Vuelve a intentarlo.')
        setPrepaymentAmount(null)
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="Registrar pago">
      {prepaymentAmount === null ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Monto a pagar"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Input
            label="Fecha de pago"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
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
          <Input
            label="Referencia (opcional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <Input label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          {error && <p className="text-sm text-status-danger">{error}</p>}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={resetAndClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Registrar pago
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-accent/10 p-4 text-sm text-accent">
            Este pago cubre todas las cuotas al día y sobran{' '}
            <strong>{formatCOP(prepaymentAmount)}</strong> como abono anticipado a capital.
            ¿Qué deseas hacer con las cuotas futuras?
          </div>

          <div className="flex flex-col gap-3">
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

          {error && <p className="text-sm text-status-danger">{error}</p>}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setPrepaymentAmount(null)} className="flex-1">
              ← Volver
            </Button>
            <Button loading={loading} onClick={handleConfirmStrategy} className="flex-1">
              Confirmar y registrar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}