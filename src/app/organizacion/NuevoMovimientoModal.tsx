import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  registerCashMovement,
  registerCashTransfer,
  registerExpense,
  type Account,
} from '@/services/accounts'

interface NuevoMovimientoModalProps {
  accounts: Account[]
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type Mode = 'movimiento' | 'gasto' | 'transferencia'

export function NuevoMovimientoModal({ accounts, open, onClose, onSuccess }: NuevoMovimientoModalProps) {
  const [mode, setMode] = useState<Mode>('movimiento')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? '')
  const [movementType, setMovementType] = useState('ingreso')
  const [category, setCategory] = useState('otro')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setAmount('')
    setDescription('')
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'movimiento') {
        await registerCashMovement({ accountId, movementType, amount: Number(amount), description, movementDate: date })
      } else if (mode === 'gasto') {
        await registerExpense({ accountId, category, amount: Number(amount), description, expenseDate: date })
      } else {
        await registerCashTransfer({ fromAccountId: accountId, toAccountId, amount: Number(amount), description, movementDate: date })
      }
      onSuccess()
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={reset} title="Nuevo movimiento de caja">
      <div className="mb-4 flex gap-2 border-b border-neutral-300">
        {(['movimiento', 'gasto', 'transferencia'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`border-b-2 px-3 py-2 text-sm font-medium capitalize ${
              mode === m ? 'border-accent text-accent' : 'border-transparent text-neutral-500'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-primary">{mode === 'transferencia' ? 'Cuenta origen' : 'Cuenta'}</label>
          <select
            className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {mode === 'transferencia' && (
          <div>
            <label className="text-sm font-medium text-primary">Cuenta destino</label>
            <select
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'movimiento' && (
          <div>
            <label className="text-sm font-medium text-primary">Tipo</label>
            <select
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
            >
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>
        )}

        {mode === 'gasto' && (
          <div>
            <label className="text-sm font-medium text-primary">Categoría</label>
            <select
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="transporte">Transporte</option>
              <option value="arriendo">Arriendo</option>
              <option value="nomina">Nómina</option>
              <option value="servicios">Servicios</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        )}

        <Input label="Monto" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Input label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />

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