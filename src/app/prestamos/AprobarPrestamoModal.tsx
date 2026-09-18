import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import { getAccounts, type Account } from '@/services/accounts'
import { activateLoanDraft } from '@/services/loans'

interface AprobarPrestamoModalProps {
  loanId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AprobarPrestamoModal({ loanId, open, onClose, onSuccess }: AprobarPrestamoModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [disbursementMethod, setDisbursementMethod] = useState('transferencia')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getAccounts()
      .then((accs) => {
        setAccounts(accs)
        if (accs.length === 1) setAccountId(accs[0].id)
      })
      .finally(() => setLoading(false))
  }, [open])

  async function handleConfirm() {
    setError(null)
    if (!accountId) {
      setError('Selecciona la cuenta de caja desde la que se desembolsa')
      return
    }
    setSubmitting(true)
    try {
      await activateLoanDraft(loanId, accountId, disbursementMethod)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aprobar el préstamo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Aprobar préstamo">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500">
          Al aprobar, se genera el calendario de cuotas y se descuenta el monto de la cuenta que elijas.
        </p>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="rounded-lg bg-warning-100 p-3 text-xs text-warning-700">
            No tienes ninguna cuenta de caja creada.{' '}
            <Link to="/caja" className="font-medium underline">
              Crea una en Caja
            </Link>{' '}
            antes de aprobar este préstamo.
          </p>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium text-primary">Cuenta de desembolso</label>
              <select
                className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">Selecciona una cuenta...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-primary">Método de desembolso</label>
              <select
                className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
                value={disbursementMethod}
                onChange={(e) => setDisbursementMethod(e.target.value)}
              >
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="nequi">Nequi</option>
                <option value="daviplata">Daviplata</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </>
        )}

        {error && <p className="text-sm text-status-danger">{error}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button loading={submitting} disabled={accounts.length === 0} onClick={handleConfirm} className="flex-1">
            Aprobar y desembolsar
          </Button>
        </div>
      </div>
    </Modal>
  )
}