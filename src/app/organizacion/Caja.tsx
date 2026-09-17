import { useEffect, useState, useCallback, useMemo } from 'react'
import { Wallet, Landmark, Smartphone } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
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

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

const INCOME_TYPES = ['ingreso', 'pago', 'transferencia_entrada']
const EXPENSE_TYPES = ['egreso', 'desembolso', 'gasto', 'transferencia_salida']

// El tipo de cuenta ('cash'|'bank'|'wallet') no distingue Nequi de
// Daviplata -- eso solo se sabe por el nombre que el usuario le puso a la
// cuenta. Es una pista razonable a partir de un dato real (el nombre), no
// algo inventado.
function accountVisual(a: Account): { Icon: typeof Wallet; tone: 'success' | 'primary' | 'info' | 'danger' } {
  const name = a.name.toLowerCase()
  if (a.type === 'bank') return { Icon: Landmark, tone: 'primary' }
  if (name.includes('daviplata')) return { Icon: Smartphone, tone: 'danger' }
  if (a.type === 'wallet') return { Icon: Smartphone, tone: 'info' }
  return { Icon: Wallet, tone: 'success' }
}

const toneClasses: Record<string, string> = {
  success: 'bg-success-100 text-success-700',
  primary: 'bg-primary-100 text-primary-600',
  info: 'bg-info-100 text-info-700',
  danger: 'bg-danger-100 text-danger-700',
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

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [dayBalances, setDayBalances] = useState<{ opening: number; closing: number } | null>(null)
  const [closingRegister, setClosingRegister] = useState(false)

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

    setSelectedAccountId((prev) => prev ?? accs[0]?.id ?? null)
  }, [])

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [loadData])

  // Saldo inicial (cierre de ayer) y saldo actual (con lo de hoy incluido)
  // para la cuenta seleccionada -- reutiliza account_balance_asof(), la misma
  // función que ya usa el resto de la app.
  useEffect(() => {
    if (!selectedAccountId) {
      setDayBalances(null)
      return
    }
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    Promise.all([
      getAccountBalance(selectedAccountId, toISODate(yesterday)),
      getAccountBalance(selectedAccountId, toISODate(today)),
    ]).then(([opening, closing]) => setDayBalances({ opening, closing }))
  }, [selectedAccountId, movements])

  const todayISO = toISODate(new Date())
  const todaysMovements = movements.filter((m) => m.account_id === selectedAccountId && m.movement_date === todayISO)
  const todayIncome = todaysMovements
    .filter((m) => INCOME_TYPES.includes(m.movement_type) || (m.movement_type === 'ajuste' && m.amount > 0))
    .reduce((s, m) => s + Math.abs(m.amount), 0)
  const todayExpense = todaysMovements
    .filter((m) => EXPENSE_TYPES.includes(m.movement_type) || (m.movement_type === 'ajuste' && m.amount < 0))
    .reduce((s, m) => s + Math.abs(m.amount), 0)

  const hourlyChartData = useMemo(() => {
    const buckets = new Map<number, { hour: string; Ingresos: number; Egresos: number }>()
    for (const m of todaysMovements) {
      const hour = new Date(m.created_at).getHours()
      const bucket = buckets.get(hour) ?? { hour: `${hour}:00`, Ingresos: 0, Egresos: 0 }
      if (INCOME_TYPES.includes(m.movement_type) || (m.movement_type === 'ajuste' && m.amount > 0)) {
        bucket.Ingresos += Math.abs(m.amount)
      } else {
        bucket.Egresos += Math.abs(m.amount)
      }
      buckets.set(hour, bucket)
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([, v]) => v)
  }, [todaysMovements])

  const recentMovements = movements.filter((m) => m.account_id === selectedAccountId).slice(0, 5)

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

  async function handleCloseRegister() {
    if (!selectedAccountId) return
    setError(null)
    setClosingRegister(true)
    try {
      await closeCashRegister(selectedAccountId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la caja')
    } finally {
      setClosingRegister(false)
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
          <h1 className="text-2xl font-bold text-neutral-950">Caja y finanzas</h1>
          <p className="text-sm text-neutral-500">Controla tus cuentas, movimientos y cierre de caja</p>
        </div>
        {accounts.length > 0 && <Button onClick={() => setShowMovementModal(true)}>+ Nuevo movimiento</Button>}
      </div>

      {error && <p className="mb-4 text-sm text-status-danger">{error}</p>}

      {accounts.length === 0 ? (
        <Card className="max-w-md">
          <p className="mb-3 text-sm text-neutral-500">
            Aún no tienes cuentas. Crea la primera para empezar a registrar movimientos.
          </p>
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
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {accounts.map((a) => {
                  const { Icon, tone } = accountVisual(a)
                  const isSelected = a.id === selectedAccountId
                  return (
                    <Card
                      key={a.id}
                      className={`cursor-pointer transition-shadow hover:shadow-md ${isSelected ? 'ring-2 ring-accent' : ''}`}
                      onClick={() => setSelectedAccountId(a.id)}
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary">{a.name}</p>
                          <p className="text-xs capitalize text-neutral-400">
                            {a.type === 'cash' ? 'Efectivo' : a.type === 'bank' ? 'Cuenta bancaria' : 'Billetera digital'}
                          </p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-neutral-950">{formatCOP(balances[a.id] ?? 0)}</p>
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

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <p className="mb-3 text-sm font-semibold text-primary">Movimientos de hoy</p>
                  {hourlyChartData.length === 0 ? (
                    <p className="py-10 text-center text-sm text-neutral-400">Sin movimientos hoy en esta cuenta.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={hourlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="hour" fontSize={12} />
                        <YAxis fontSize={12} tickFormatter={(v) => formatCOP(v)} width={80} />
                        <Tooltip formatter={(v: number) => formatCOP(v)} />
                        <Legend />
                        <Bar dataKey="Ingresos" fill="#16803C" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Egresos" fill="#DC2626" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <div className="flex flex-col gap-6">
                  <Card>
                    <p className="mb-3 text-sm font-semibold text-primary">Resumen del día</p>
                    <dl className="flex flex-col gap-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-neutral-500">Saldo inicial</dt>
                        <dd className="font-medium text-primary">{formatCOP(dayBalances?.opening ?? 0)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-neutral-500">Ingresos</dt>
                        <dd className="font-medium text-success-700">{formatCOP(todayIncome)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-neutral-500">Egresos</dt>
                        <dd className="font-medium text-danger-700">{formatCOP(todayExpense)}</dd>
                      </div>
                      <div className="flex justify-between border-t border-neutral-200 pt-2">
                        <dt className="font-medium text-primary">Saldo actual</dt>
                        <dd className="font-bold text-primary">{formatCOP(dayBalances?.closing ?? 0)}</dd>
                      </div>
                    </dl>
                    <Button
                      variant="success"
                      className="mt-4 w-full"
                      loading={closingRegister}
                      onClick={handleCloseRegister}
                    >
                      Cerrar caja del día
                    </Button>
                  </Card>

                  <Card>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-primary">Últimos movimientos</p>
                      <button onClick={() => setTab('Movimientos')} className="text-xs font-medium text-accent hover:underline">
                        Ver todos
                      </button>
                    </div>
                    {recentMovements.length === 0 ? (
                      <p className="text-sm text-neutral-400">Sin movimientos registrados.</p>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {recentMovements.map((m) => {
                          const isIncome = INCOME_TYPES.includes(m.movement_type) || (m.movement_type === 'ajuste' && m.amount > 0)
                          return (
                            <li key={m.id} className="flex items-center justify-between text-sm">
                              <div>
                                <p className="font-medium text-primary">{m.description || m.movement_type}</p>
                                <p className="text-xs text-neutral-400">
                                  {new Date(m.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <span className={`font-medium ${isIncome ? 'text-success-700' : 'text-danger-700'}`}>
                                {isIncome ? '+' : '-'}
                                {formatCOP(Math.abs(m.amount))}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </Card>
                </div>
              </div>
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