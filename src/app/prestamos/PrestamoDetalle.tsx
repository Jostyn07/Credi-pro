import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  CreditCard,
  CalendarDays,
  FileText,
  RefreshCw,
  Ban,
  User,
} from 'lucide-react'
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
import { getPaymentsByLoan, type Payment } from '@/services/payments'
import { getContractsByLoan, generateContract, type Contract } from '@/services/contracts'
import { getCollectionActions, getPaymentPromises, type CollectionAction, type PaymentPromise } from '@/services/collection'
import { RegistrarGestionModal } from '@/app/organizacion/RegistrarGestionModal'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO')
}

const installmentStatusTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  pending: 'neutral',
  partial: 'warning',
  paid: 'success',
  overdue: 'danger',
}

const installmentStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagada',
  overdue: 'Vencida',
}

const loanStatusTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  liquidated: 'neutral',
  cancelled: 'danger',
  refinanced: 'warning',
  restructured: 'warning',
  draft: 'neutral',
}

const loanStatusLabel: Record<string, string> = {
  active: 'Activo',
  liquidated: 'Liquidado',
  cancelled: 'Cancelado',
  refinanced: 'Refinanciado',
  restructured: 'Reestructurado',
  draft: 'Borrador',
}

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'cuotas', label: 'Cuotas' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'cobranza', label: 'Cobranza' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'historial', label: 'Historial' },
] as const
type TabKey = (typeof TABS)[number]['key']

export default function PrestamoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loan, setLoan] = useState<Loan | null>(null)
  const [conditions, setConditions] = useState<LoanConditions | null>(null)
  const [installments, setInstallments] = useState<Installment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [collectionActions, setCollectionActions] = useState<CollectionAction[]>([])
  const [paymentPromises, setPaymentPromises] = useState<PaymentPromise[]>([])
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState<TabKey>('resumen')
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showGestionModal, setShowGestionModal] = useState(false)
  const [generatingContract, setGeneratingContract] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    const [loanData, conditionsData, installmentsData, paymentsData, contractsData, actionsData, promisesData] =
      await Promise.all([
        getLoan(id),
        getLoanConditions(id),
        getInstallments(id),
        getPaymentsByLoan(id),
        getContractsByLoan(id),
        getCollectionActions(undefined, id),
        getPaymentPromises(id),
      ])
    setLoan(loanData)
    setConditions(conditionsData)
    setInstallments(installmentsData)
    setPayments(paymentsData)
    setContracts(contractsData)
    setCollectionActions(actionsData)
    setPaymentPromises(promisesData)
  }, [id])

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [loadData])

  async function handleGenerateContract() {
    if (!id) return
    setError(null)
    setShowActionsMenu(false)
    setGeneratingContract(true)
    try {
      await generateContract(id)
      await loadData()
      setTab('documentos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el contrato')
    } finally {
      setGeneratingContract(false)
    }
  }

  if (loading || !loan || !conditions) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const capitalPending = installments.reduce((sum, i) => sum + Math.max(i.capital - i.capital_paid, 0), 0)
  const interestGenerated = installments.reduce((sum, i) => sum + i.interest, 0)
  const overdueInstallments = installments.filter((i) => i.status === 'overdue')
  const moraAmount = overdueInstallments.reduce(
    (sum, i) => sum + Math.max(i.capital - i.capital_paid, 0) + Math.max(i.interest - i.interest_paid, 0),
    0,
  )
  const proximaCuota = installments
    .filter((i) => i.status !== 'paid')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]
  const estimatedInstallment = proximaCuota?.total ?? installments[0]?.total ?? 0

  const canOperate = loan.status === 'active'
  const latestContract = contracts[0]

  type HistoryItem = { date: string; title: string; subtitle: string }
  const history: HistoryItem[] = [
    ...payments.map((p) => ({
      date: p.created_at,
      title: p.is_liquidation ? 'Liquidación registrada' : 'Pago registrado',
      subtitle: `${formatCOP(p.amount)}${p.payment_method ? ` · ${p.payment_method}` : ''}`,
    })),
    ...contracts.map((c) => ({
      date: c.generated_at,
      title: `Contrato generado (v${c.version})`,
      subtitle: c.contract_number,
    })),
    ...collectionActions.map((a) => ({
      date: a.action_date,
      title: `Gestión de cobranza: ${a.action_type}`,
      subtitle: a.result,
    })),
    ...paymentPromises.map((pp) => ({
      date: pp.promised_date,
      title: 'Promesa de pago',
      subtitle: `${formatCOP(pp.promised_amount)} · ${pp.status === 'kept' ? 'cumplida' : pp.status === 'broken' ? 'incumplida' : 'pendiente'}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-5xl">
        <Link to="/prestamos" className="text-sm text-accent hover:underline">
          ← Volver a préstamos
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <User size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-neutral-950">Préstamo #{loan.loan_number}</h1>
                <Badge tone={loanStatusTone[loan.status] ?? 'neutral'}>{loanStatusLabel[loan.status] ?? loan.status}</Badge>
              </div>
              <p className="text-sm text-neutral-500">
                {loan.clients?.full_name}
                {loan.clients?.identification ? ` - CC ${loan.clients.identification}` : ''}
              </p>
            </div>
          </div>

          <div className="relative">
            <Button variant="secondary" onClick={() => setShowActionsMenu((v) => !v)}>
              Acciones <ChevronDown size={16} />
            </Button>
            {showActionsMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActionsMenu(false)} />
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                  {canOperate && (
                    <button
                      type="button"
                      onClick={() => navigate(`/prestamos/${loan.id}/pagos/nuevo`)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-primary hover:bg-neutral-50"
                    >
                      <CreditCard size={15} /> Registrar pago
                    </button>
                  )}
                  {latestContract ? (
                    <Link
                      to={`/documentos/${latestContract.id}`}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-neutral-50"
                      onClick={() => setShowActionsMenu(false)}
                    >
                      <FileText size={15} /> Ver contrato
                    </Link>
                  ) : (
                    canOperate && (
                      <button
                        type="button"
                        onClick={handleGenerateContract}
                        disabled={generatingContract}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-primary hover:bg-neutral-50 disabled:opacity-50"
                      >
                        <FileText size={15} /> Generar contrato
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    disabled
                    title="Refinanciar préstamos: función en desarrollo"
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-neutral-400 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={15} /> Refinanciar
                  </button>
                  {canOperate && (
                    <button
                      type="button"
                      onClick={() => navigate(`/prestamos/${loan.id}/liquidar`)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-status-danger hover:bg-danger-50"
                    >
                      <Ban size={15} /> Liquidar préstamo
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-status-danger">{error}</p>}

        <div className="mt-6 flex gap-1 border-b border-neutral-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-neutral-500 hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'resumen' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Card className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Monto desembolsado</p>
                    <p className="text-lg font-semibold text-neutral-950">{formatCOP(conditions.principal)}</p>
                  </div>
                </Card>
                <Card className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning-100 text-warning-600">
                    <PiggyBank size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Capital pendiente</p>
                    <p className="text-lg font-semibold text-neutral-950">{formatCOP(Math.max(capitalPending, 0))}</p>
                  </div>
                </Card>
                <Card className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-100 text-success-600">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Intereses generados</p>
                    <p className="text-lg font-semibold text-neutral-950">{formatCOP(interestGenerated)}</p>
                  </div>
                </Card>
                <Card className={moraAmount > 0 ? 'flex items-center gap-3 border-danger-200 bg-danger-50' : 'flex items-center gap-3'}>
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      moraAmount > 0 ? 'bg-danger-100 text-danger-700' : 'bg-neutral-100 text-neutral-400'
                    }`}
                  >
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Mora</p>
                    <p className={`text-lg font-semibold ${moraAmount > 0 ? 'text-danger-700' : 'text-neutral-950'}`}>
                      {formatCOP(moraAmount)}
                    </p>
                  </div>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
                <Card>
                  <p className="mb-4 text-sm font-semibold text-primary">Información general</p>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div>
                      <dt className="text-neutral-400">Estado</dt>
                      <dd className="mt-1">
                        <Badge tone={loanStatusTone[loan.status] ?? 'neutral'}>
                          {loanStatusLabel[loan.status] ?? loan.status}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-400">Tasa de interés</dt>
                      <dd className="font-medium text-primary">{conditions.interest_rate}% mensual</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-400">Fecha de desembolso</dt>
                      <dd className="font-medium text-primary">{formatDate(conditions.disbursement_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-400">Modalidad</dt>
                      <dd className="font-medium text-primary">
                        {conditions.interest_modality === 'saldo_pendiente'
                          ? 'Sobre saldo pendiente'
                          : conditions.interest_modality === 'capital_inicial'
                            ? 'Sobre capital inicial'
                            : 'Cuota fija (sistema francés)'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-400">Plazo</dt>
                      <dd className="font-medium text-primary">{conditions.term_months} meses</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-400">Días de gracia</dt>
                      <dd className="font-medium text-primary">{conditions.grace_days} días</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-400">Cuota estimada</dt>
                      <dd className="font-medium text-primary">{formatCOP(estimatedInstallment)}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-400">Tasa de mora</dt>
                      <dd className="font-medium text-primary">{conditions.late_fee_rate}% mensual</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-400">Próxima cuota</dt>
                      <dd className="font-medium text-primary">{proximaCuota ? formatDate(proximaCuota.due_date) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-400">Día de pago</dt>
                      <dd className="font-medium text-primary">{conditions.payment_day} de cada mes</dd>
                    </div>
                  </dl>
                </Card>

                <div className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-primary">Acciones rápidas</p>
                  <Button
                    disabled={!canOperate}
                    onClick={() => navigate(`/prestamos/${loan.id}/pagos/nuevo`)}
                    className="justify-start"
                  >
                    <CreditCard size={16} /> Registrar pago
                  </Button>
                  <Button variant="secondary" onClick={() => setTab('cuotas')} className="justify-start">
                    <CalendarDays size={16} /> Ver calendario
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!canOperate || generatingContract}
                    loading={generatingContract}
                    onClick={latestContract ? () => setTab('documentos') : handleGenerateContract}
                    className="justify-start"
                  >
                    <FileText size={16} /> {latestContract ? 'Ver contrato' : 'Generar contrato'}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled
                    title="Refinanciar préstamos: función en desarrollo"
                    className="justify-start"
                  >
                    <RefreshCw size={16} /> Refinanciar
                  </Button>
                  <Button
                    variant="danger"
                    disabled={!canOperate}
                    onClick={() => navigate(`/prestamos/${loan.id}/liquidar`)}
                    className="justify-start"
                  >
                    <Ban size={16} /> Liquidar préstamo
                  </Button>
                </div>
              </div>
            </div>
          )}

          {tab === 'cuotas' && (
            <div className="overflow-x-auto rounded-card border border-neutral-200">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-neutral-100 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">#</th>
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Capital</th>
                    <th className="px-4 py-2 font-medium">Interés</th>
                    <th className="px-4 py-2 font-medium">Total</th>
                    <th className="px-4 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {installments.map((i) => (
                    <tr key={i.id}>
                      <td className="px-4 py-2 text-primary">{i.number}</td>
                      <td className="px-4 py-2 text-primary">{formatDate(i.due_date)}</td>
                      <td className="px-4 py-2 text-primary">{formatCOP(i.capital)}</td>
                      <td className="px-4 py-2 text-primary">{formatCOP(i.interest)}</td>
                      <td className="px-4 py-2 font-medium text-primary">{formatCOP(i.capital + i.interest)}</td>
                      <td className="px-4 py-2">
                        <Badge tone={installmentStatusTone[i.status]}>{installmentStatusLabel[i.status] ?? i.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'pagos' && (
            <div className="flex flex-col gap-2">
              {payments.length === 0 ? (
                <Card className="text-sm text-neutral-400">Aún no se han registrado pagos.</Card>
              ) : (
                payments.map((p) => (
                  <Card key={p.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-primary">{formatCOP(p.amount)}</p>
                      <p className="text-xs text-neutral-400">
                        {formatDate(p.payment_date)} · {p.payment_method ?? 'Sin método'}
                        {p.is_liquidation && ' · Liquidación total'}
                      </p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === 'cobranza' && (
            <div className="flex flex-col gap-4">
              <Button
                variant="secondary"
                disabled={!loan.client_id}
                onClick={() => setShowGestionModal(true)}
                className="self-start"
              >
                Registrar gestión
              </Button>

              {paymentPromises.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-primary">Promesas de pago</p>
                  {paymentPromises.map((pp) => (
                    <Card key={pp.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-primary">{formatCOP(pp.promised_amount)}</p>
                        <p className="text-xs text-neutral-400">Prometido para el {formatDate(pp.promised_date)}</p>
                      </div>
                      <Badge tone={pp.status === 'kept' ? 'success' : pp.status === 'broken' ? 'danger' : 'warning'}>
                        {pp.status === 'kept' ? 'Cumplida' : pp.status === 'broken' ? 'Incumplida' : 'Pendiente'}
                      </Badge>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-primary">Gestiones registradas</p>
                {collectionActions.length === 0 ? (
                  <Card className="text-sm text-neutral-400">Aún no hay gestiones de cobranza para este préstamo.</Card>
                ) : (
                  collectionActions.map((a) => (
                    <Card key={a.id}>
                      <div className="flex items-center justify-between">
                        <p className="font-medium capitalize text-primary">{a.action_type}</p>
                        <span className="text-xs text-neutral-400">{formatDate(a.action_date)}</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">Resultado: {a.result}</p>
                      {a.notes && <p className="mt-1 text-xs text-neutral-400">{a.notes}</p>}
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'documentos' && (
            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                disabled={!canOperate || generatingContract}
                loading={generatingContract}
                onClick={handleGenerateContract}
                className="self-start"
              >
                <FileText size={16} /> Generar nuevo contrato
              </Button>
              {contracts.length === 0 ? (
                <Card className="text-sm text-neutral-400">Aún no se ha generado ningún contrato.</Card>
              ) : (
                contracts.map((c) => (
                  <Link key={c.id} to={`/documentos/${c.id}`}>
                    <Card className="flex items-center justify-between hover:border-accent">
                      <div>
                        <p className="font-medium text-primary">{c.contract_number}</p>
                        <p className="text-xs text-neutral-400">Versión {c.version} · {formatDate(c.generated_at)}</p>
                      </div>
                      <Badge tone="neutral">{c.status}</Badge>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          )}

          {tab === 'historial' && (
            <div className="flex flex-col gap-2">
              {history.length === 0 ? (
                <Card className="text-sm text-neutral-400">Todavía no hay actividad registrada.</Card>
              ) : (
                history.map((h, i) => (
                  <Card key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-primary">{h.title}</p>
                      <p className="text-xs text-neutral-400">{h.subtitle}</p>
                    </div>
                    <span className="text-xs text-neutral-400">{formatDate(h.date)}</span>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <RegistrarGestionModal
        clientId={loan.client_id}
        loanId={loan.id}
        open={showGestionModal}
        onClose={() => setShowGestionModal(false)}
        onSuccess={loadData}
      />
    </div>
  )
}