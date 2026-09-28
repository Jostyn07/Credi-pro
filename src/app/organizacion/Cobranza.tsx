import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import {
  getCollectionWorklist,
  getPaymentPromises,
  updatePaymentPromiseStatus,
  type CollectionRow,
  type PaymentPromise,
} from '@/services/collection'
import { getClients, type Client } from '@/services/clients'
import { getCollectionActions, type CollectionAction } from '@/services/collection'
import { RegistrarGestionModal } from './RegistrarGestionModal'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO')
}

const TABS = [
  { key: 'cartera_vencida', label: 'Cartera vencida' },
  { key: 'por_vencer', label: 'Por vencer' },
  { key: 'en_gracia', label: 'En gracia' },
  { key: 'promesas', label: 'Promesas de pago' },
  { key: 'historial', label: 'Gestiones registradas' },
] as const
type TabKey = (typeof TABS)[number]['key']

const estadoTone: Record<CollectionRow['estado'], 'danger' | 'warning' | 'info'> = {
  en_mora: 'danger',
  en_gracia: 'warning',
  por_vencer: 'info',
}
const estadoLabel: Record<CollectionRow['estado'], string> = {
  en_mora: 'En mora',
  en_gracia: 'En gracia',
  por_vencer: 'Por vencer',
}

const actionTypeLabel: Record<string, string> = {
  whatsapp: 'WhatsApp',
  llamada: 'Llamada',
  visita: 'Visita',
  email: 'Correo',
  otro: 'Otro',
}

const resultLabel: Record<string, string> = {
  contestado: 'Contestó',
  no_contesto: 'No contestó',
  mensaje_dejado: 'Mensaje dejado',
  promesa_pago: 'Prometió pagar',
  otro: 'Otro',
}

const PAGE_SIZE = 8

export default function Cobranza() {
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabKey) ?? 'cartera_vencida'

  const [tab, setTab] = useState<TabKey>(TABS.some((t) => t.key === initialTab) ? initialTab : 'cartera_vencida')
  const [worklist, setWorklist] = useState<CollectionRow[]>([])
  const [promises, setPromises] = useState<PaymentPromise[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [actions, setActions] = useState<CollectionAction[]>([])
  const [loading, setLoading] = useState(true)

  const [estadoFilter, setEstadoFilter] = useState<'todos' | CollectionRow['estado']>('todos')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [modalTarget, setModalTarget] = useState<{ clientId: string; loanId?: string } | null>(null)
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  const loadData = useCallback(async () => {
    const [worklistData, promisesData, clientsData, actionsData] = await Promise.all([
      getCollectionWorklist(),
      getPaymentPromises(),
      getClients(),
      getCollectionActions(),
    ])
    setWorklist(worklistData)
    setPromises(promisesData)
    setClients(clientsData)
    setActions(actionsData)
  }, [])

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [loadData])

  useEffect(() => setPage(1), [tab, estadoFilter, search])

  const totals = useMemo(() => {
    const enMora = worklist.filter((r) => r.estado === 'en_mora')
    const enGracia = worklist.filter((r) => r.estado === 'en_gracia')
    const porVencer = worklist.filter((r) => r.estado === 'por_vencer')
    const sum = (rows: CollectionRow[]) => rows.reduce((s, r) => s + r.monto, 0)
    return {
      enMora: { count: new Set(enMora.map((r) => r.loanId)).size, amount: sum(enMora) },
      enGracia: { count: new Set(enGracia.map((r) => r.loanId)).size, amount: sum(enGracia) },
      porVencer: { count: new Set(porVencer.map((r) => r.loanId)).size, amount: sum(porVencer) },
      total: sum(worklist),
    }
  }, [worklist])

  const tabRows = useMemo(() => {
    if (tab === 'por_vencer') return worklist.filter((r) => r.estado === 'por_vencer')
    if (tab === 'en_gracia') return worklist.filter((r) => r.estado === 'en_gracia')
    return worklist // "Cartera vencida" = worklist completo (mora + gracia + por vencer)
  }, [tab, worklist])

  const filteredRows = tabRows.filter((r) => {
    if (estadoFilter !== 'todos' && r.estado !== estadoFilter) return false
    if (search && !r.clientName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const filteredClients = clients.filter((c) => c.full_name.toLowerCase().includes(pickerSearch.toLowerCase()))

  async function handlePromiseStatus(id: string, status: 'kept' | 'broken') {
    await updatePaymentPromiseStatus(id, status)
    loadData()
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Gestión de cobranza</h1>
          <p className="text-sm text-neutral-500">Da seguimiento a tu cartera y registra tus gestiones</p>
        </div>
        <Button onClick={() => setShowClientPicker(true)}>
          <Plus size={16} /> Registrar gestión
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-danger-200 bg-danger-50">
          <p className="text-xs text-neutral-500">Cartera vencida</p>
          <p className="text-xl font-bold text-danger-700">{formatCOP(totals.enMora.amount)}</p>
          <p className="text-xs text-neutral-400">{totals.enMora.count} clientes</p>
        </Card>
        <Card className="border-warning-200 bg-warning-50">
          <p className="text-xs text-neutral-500">En gracia</p>
          <p className="text-xl font-bold text-warning-700">{formatCOP(totals.enGracia.amount)}</p>
          <p className="text-xs text-neutral-400">{totals.enGracia.count} clientes</p>
        </Card>
        <Card className="border-info-100 bg-info-100/40">
          <p className="text-xs text-neutral-500">Por vencer (7 días)</p>
          <p className="text-xl font-bold text-info-700">{formatCOP(totals.porVencer.amount)}</p>
          <p className="text-xs text-neutral-400">{totals.porVencer.count} clientes</p>
        </Card>
        <Card className="border-success-100 bg-success-100/40">
          <p className="text-xs text-neutral-500">Total en cobranza</p>
          <p className="text-xl font-bold text-success-700">{formatCOP(totals.total)}</p>
        </Card>
      </div>

      <div className="mb-4 flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-neutral-500 hover:text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'promesas' && tab !== 'historial' && (
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value as typeof estadoFilter)}
          >
            <option value="todos">Todos los estados</option>
            <option value="en_mora">En mora</option>
            <option value="en_gracia">En gracia</option>
            <option value="por_vencer">Por vencer</option>
          </select>
          <div className="relative min-w-[220px] max-w-xs flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-primary placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : tab === 'promesas' ? (
        promises.length === 0 ? (
          <Card className="text-sm text-neutral-400">No hay promesas de pago registradas.</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {promises.map((p) => (
              <Card key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-primary">{p.loans?.clients?.full_name}</p>
                  <p className="text-xs text-neutral-400">
                    {p.loans?.loan_number} · Prometió {formatCOP(p.promised_amount)} para el{' '}
                    {formatDate(p.promised_date)}
                  </p>
                </div>
                {p.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => handlePromiseStatus(p.id, 'broken')}>
                      Incumplida
                    </Button>
                    <Button onClick={() => handlePromiseStatus(p.id, 'kept')}>Cumplida</Button>
                  </div>
                ) : (
                  <Badge tone={p.status === 'kept' ? 'success' : 'danger'}>
                    {p.status === 'kept' ? 'Cumplida' : 'Incumplida'}
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        )
      ) : tab === 'historial' ? (
        actions.length === 0 ? (
          <Card className="text-sm text-neutral-400">
            Aún no se ha registrado ninguna gestión de cobranza. Usa el botón "Registrar gestión" arriba.
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {actions.map((a) => (
              <Card key={a.id} className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-primary">{a.clients?.full_name ?? '—'}</p>
                    <Badge tone="neutral">{actionTypeLabel[a.action_type] ?? a.action_type}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {resultLabel[a.result] ?? a.result}
                    {a.notes && ` · "${a.notes}"`}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-neutral-400">{formatDate(a.action_date)}</span>
              </Card>
            ))}
          </div>
        )
      ) : filteredRows.length === 0 ? (
        <Card className="text-sm text-neutral-400">No hay resultados para este filtro. 🎉</Card>
      ) : (
        <>
          <Table
            columns={[
              { key: 'cliente', header: 'Cliente', render: (r: CollectionRow) => r.clientName },
              {
                key: 'prestamo',
                header: 'Préstamo',
                render: (r: CollectionRow) => (
                  <Link to={`/prestamos/${r.loanId}`} className="text-accent hover:underline">
                    {r.loanNumber}
                  </Link>
                ),
              },
              {
                key: 'dias',
                header: 'Días de atraso',
                render: (r: CollectionRow) => (r.diasAtraso > 0 ? r.diasAtraso : '—'),
              },
              { key: 'monto', header: 'Monto', render: (r: CollectionRow) => formatCOP(r.monto) },
              {
                key: 'estado',
                header: 'Estado',
                render: (r: CollectionRow) => <Badge tone={estadoTone[r.estado]}>{estadoLabel[r.estado]}</Badge>,
              },
              {
                key: 'gestion',
                header: 'Última gestión',
                render: (r: CollectionRow) => (r.ultimaGestion ? formatDate(r.ultimaGestion) : '—'),
              },
              {
                key: 'acciones',
                header: '',
                render: (r: CollectionRow) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setModalTarget({ clientId: r.clientId, loanId: r.loanId })}
                  >
                    Registrar gestión
                  </Button>
                ),
              },
            ]}
            data={pageRows}
            rowKey={(r) => `${r.loanId}-${r.estado}`}
          />

          <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
            <span>
              Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filteredRows.length)} de{' '}
              {filteredRows.length} registros
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-8 w-8 rounded-lg text-sm ${
                    p === page ? 'bg-accent text-white' : 'border border-neutral-300 text-primary hover:bg-neutral-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {modalTarget && (
        <RegistrarGestionModal
          clientId={modalTarget.clientId}
          loanId={modalTarget.loanId}
          open={!!modalTarget}
          onClose={() => setModalTarget(null)}
          onSuccess={loadData}
        />
      )}

      {showClientPicker && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-card bg-white p-6 shadow-lg">
            <p className="mb-3 text-sm font-semibold text-primary">Selecciona un cliente</p>
            <div className="relative mb-3">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                autoFocus
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-primary placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {filteredClients.length === 0 ? (
                <p className="py-4 text-center text-sm text-neutral-400">Sin resultados.</p>
              ) : (
                filteredClients.slice(0, 20).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setModalTarget({ clientId: c.id })
                      setShowClientPicker(false)
                      setPickerSearch('')
                    }}
                    className="rounded-lg px-3 py-2 text-left text-sm text-primary hover:bg-neutral-50"
                  >
                    {c.full_name}
                  </button>
                ))
              )}
            </div>
            <Button variant="secondary" className="mt-3 w-full" onClick={() => setShowClientPicker(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}