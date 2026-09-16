import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { registerCollectionAction, registerPaymentPromise } from '@/services/collection'
import { useAuth } from '@/contexts/AuthContext'

interface RegistrarGestionModalProps {
  clientId: string
  loanId?: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RegistrarGestionModal({ clientId, loanId, open, onClose, onSuccess }: RegistrarGestionModalProps) {
  const { profile } = useAuth()
  const [actionType, setActionType] = useState('whatsapp')
  const [result, setResult] = useState('contestado')
  const [notes, setNotes] = useState('')
  const [addPromise, setAddPromise] = useState(false)
  const [promisedDate, setPromisedDate] = useState('')
  const [promisedAmount, setPromisedAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setNotes('')
    setAddPromise(false)
    setPromisedDate('')
    setPromisedAmount('')
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile?.organization_id) return
    setError(null)
    setLoading(true)
    try {
      await registerCollectionAction({
        clientId,
        loanId,
        actionType,
        result,
        notes: notes || undefined,
        organizationId: profile.organization_id,
      })

      if (addPromise && loanId && promisedDate && promisedAmount) {
        await registerPaymentPromise({
          loanId,
          promisedDate,
          promisedAmount: Number(promisedAmount),
          organizationId: profile.organization_id,
        })
      }

      onSuccess()
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la gestión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={reset} title="Registrar gestión de cobranza">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-primary">Tipo de gestión</label>
          <select
            className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="llamada">Llamada</option>
            <option value="visita">Visita</option>
            <option value="email">Correo</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-primary">Resultado</label>
          <select
            className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
            value={result}
            onChange={(e) => setResult(e.target.value)}
          >
            <option value="contestado">Contestó</option>
            <option value="no_contesto">No contestó</option>
            <option value="mensaje_dejado">Mensaje dejado</option>
            <option value="promesa_pago">Prometió pagar</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <Input label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {loanId && (
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={addPromise}
              onChange={(e) => setAddPromise(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-accent focus:ring-accent/30"
            />
            Registrar promesa de pago
          </label>
        )}

        {addPromise && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha prometida"
              type="date"
              value={promisedDate}
              onChange={(e) => setPromisedDate(e.target.value)}
            />
            <Input
              label="Monto prometido"
              type="number"
              value={promisedAmount}
              onChange={(e) => setPromisedAmount(e.target.value)}
            />
          </div>
        )}

        {error && <p className="text-sm text-status-danger">{error}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={reset} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Registrar
          </Button>
        </div>
      </form>
    </Modal>
  )
}