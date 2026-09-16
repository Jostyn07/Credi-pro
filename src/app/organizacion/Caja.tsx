import { useEffect, useState, useCallback } from 'react'
import { Wallet, Landmark, Smartphone } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  getAccounts,
  getAccountBalance,
  getCashMovements,
  getExpenses,
  getCashClosures,
  createAccount,
  closeCashRegister,
  type Account,
  type CashMovement,
  type Expense,
  type CashClosure,
} from '@/services/accounts'
import { NuevoMovimientoModal } from './NuevoMovimientoModal'
import { useAuth } from '@/contexts/AuthContext'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

const tabs = ['Resumen', 'Movimientos', 'Gastos', 'Cierres de caja'] as const

export default function Caja() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<(typeof tabs)[number]>('Resumen')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [closures, setClosures] = useState<CashClosure[]>([])
  const [loading, setLoading] = useState(true)
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [accs, movs, exps, clos] = await Promise.all([
      getAccounts(),
      getCashMovements(),
      getExpenses(),
      getCashClosures(),
    ])
    setAccounts(accs)
    setMovements(movs)
    setExpenses(exps)
    setClosures(clos)

    const balanceEntries = await Promise.all(accs.map(async (a) => [a.id, await getAccountBalance(a.id)] as const))
    setBalances(Object.fromEntries(balanceEntries))
  }, [])

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [loadData])

  async function handleCreateAccount() {
    if (!profile?.organization_id || !newAccountName.trim()) return
    setError(null)
    try {
      await createAccount(newAccountName, 'cash', profile.organization_id)
      setNewAccountName('')
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta')
    }
  }

  async function handleCloseRegister(accountId: string) {
    setError(null)
    try {
      await closeCashRegister(accountId)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la caja')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Caja</h1>
          <p className="text-sm text-neutral-500">Controla tus cuentas, movimientos y cierres</p>
        </div>
        {accounts.length > 0 && (
          <Button onClick={() => setShowMovementModal(true)}>+ Nuevo movimiento</Button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-status-danger">{error}</p>}

      {accounts.length === 0 ? (
        <Card className="max-w-md">
          <p className="mb-3 text-sm text-neutral-500">Aún no tienes cuentas. Crea la primera para empezar a registrar movimientos.</p>
          <div className="flex gap-2">
            <Input
              placeholder="Ej. Caja principal"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
            />
            <Button onClick={handleCreateAccount}>Crear</Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex gap-2 border-b border-neutral-300">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`border-b-2 px-3 py-2 text-sm font-medium ${
                  tab === t ? 'border-accent text-accent' : 'border-transparent text-neutral-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Resumen' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((a) => {
                const AccountIcon = a.type === 'bank' ? Landmark : a.type === 'wallet' ? Smartphone : Wallet
                return (
                  <Card key={a.id}>
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                        <AccountIcon size={16} />
                      </div>
                      <p className="text-sm text-neutral-500">{a.name}</p>
                    </div>
                    <p className="text-2xl font-bold text-neutral-950">{formatCOP(balances[a.id] ?? 0)}</p>
                    <Button variant="secondary" className="mt-3 w-full" onClick={() => handleCloseRegister(a.id)}>
                      Cerrar caja del día
                    </Button>
                  </Card>
                )
              })}
              <Card className="flex flex-col justify-center gap-2">
                <p className="text-sm text-neutral-500">Agregar cuenta</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre de la cuenta"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                  />
                  <Button onClick={handleCreateAccount}>+</Button>
                </div>
              </Card>
            </div>
          )}

          {tab === 'Movimientos' && (
            <div className="flex flex-col gap-2">
              {movements.length === 0 ? (
                <Card className="text-sm text-neutral-400">Sin movimientos registrados.</Card>
              ) : (
                movements.map((m) => (
                  <Card key={m.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary">{m.description || m.movement_type}</p>
                      <p className="text-xs text-neutral-400">
                        {m.accounts?.name} · {new Date(m.movement_date).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    <Badge tone={['ingreso', 'pago', 'transferencia_entrada'].includes(m.movement_type) ? 'success' : 'danger'}>
                      {formatCOP(m.amount)}
                    </Badge>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === 'Gastos' && (
            <div className="flex flex-col gap-2">
              {expenses.length === 0 ? (
                <Card className="text-sm text-neutral-400">Sin gastos registrados.</Card>
              ) : (
                expenses.map((ex) => (
                  <Card key={ex.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary">{ex.description || ex.category}</p>
                      <p className="text-xs text-neutral-400">
                        {ex.category} · {new Date(ex.expense_date).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-status-danger">{formatCOP(ex.amount)}</p>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === 'Cierres de caja' && (
            <div className="flex flex-col gap-2">
              {closures.length === 0 ? (
                <Card className="text-sm text-neutral-400">Sin cierres registrados.</Card>
              ) : (
                closures.map((c) => (
                  <Card key={c.id}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-primary">
                        {c.accounts?.name} · {new Date(c.closure_date).toLocaleDateString('es-CO')}
                      </p>
                      <p className="text-sm font-semibold text-primary">{formatCOP(c.closing_balance)}</p>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-neutral-500">
                      <span>Apertura: {formatCOP(c.opening_balance)}</span>
                      <span>Ingresos: {formatCOP(c.total_income)}</span>
                      <span>Egresos: {formatCOP(c.total_expense)}</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}

      <NuevoMovimientoModal
        accounts={accounts}
        open={showMovementModal}
        onClose={() => setShowMovementModal(false)}
        onSuccess={loadData}
      />
    </div>
  )
}