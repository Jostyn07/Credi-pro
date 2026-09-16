import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getOverdueInstallments, type CalendarInstallment } from '@/services/calendar'
import { getPaymentPromises, updatePaymentPromiseStatus, type PaymentPromise } from '@/services/collection'
import { RegistrarGestionModal } from './RegistrarGestionModal'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

const tabs = ['Cartera vencida', 'Promesas de pago'] as const

export default function Cobranza() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Cartera vencida')
  const [overdue, setOverdue] = useState<CalendarInstallment[]>([])
  const [promises, setPromises] = useState<PaymentPromise[]>([])
  const [loading, setLoading] = useState(true)
  const [modalTarget, setModalTarget] = useState<{ clientId: string; loanId: string } | null>(null)

  const loadData = useCallback(async () => {
    const [overdueData, promisesData] = await Promise.all([getOverdueInstallments(), getPaymentPromises()])
    setOverdue(overdueData)
    setPromises(promisesData)
  }, [])

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [loadData])

  const totalOverdue = overdue.reduce((s, i) => s + (i.capital - i.capital_paid) + (i.interest - i.interest_paid), 0)

  async function handlePromiseStatus(id: string, status: 'kept' | 'broken') {
    await updatePaymentPromiseStatus(id, status)
    loadData()
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-950">Cobranza</h1>
        <p className="text-sm text-neutral-500">Da seguimiento a tu cartera y registra tus gestiones</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 sm:max-w-md">
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger-100 text-danger-600">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-xs text-neutral-400">Cartera vencida</p>
            <p className="text-lg font-bold text-danger-600">{formatCOP(totalOverdue)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <Users size={18} />
          </div>
          <div>
            <p className="text-xs text-neutral-400">Clientes en mora</p>
            <p className="text-lg font-bold text-neutral-950">{new Set(overdue.map((i) => i.loan_id)).size}</p>
          </div>
        </Card>
      </div>

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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : tab === 'Cartera vencida' ? (
        overdue.length === 0 ? (
          <Card className="text-sm text-neutral-400">No tienes cuotas vencidas. 🎉</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {overdue.map((inst) => (
              <Card key={inst.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-primary">{inst.loans?.clients?.full_name}</p>
                  <p className="text-xs text-neutral-400">
                    {inst.loans?.loan_number} · Cuota {inst.number} · Venció{' '}
                    {new Date(inst.due_date).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="danger">
                    {formatCOP(inst.capital - inst.capital_paid + (inst.interest - inst.interest_paid))}
                  </Badge>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setModalTarget({ clientId: inst.loans?.client_id ?? '', loanId: inst.loan_id })
                    }
                  >
                    Registrar gestión
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : promises.length === 0 ? (
        <Card className="text-sm text-neutral-400">No hay promesas de pago registradas.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {promises.map((p) => (
            <Card key={p.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-primary">{p.loans?.clients?.full_name}</p>
                <p className="text-xs text-neutral-400">
                  {p.loans?.loan_number} · Prometió {formatCOP(p.promised_amount)} para el{' '}
                  {new Date(p.promised_date).toLocaleDateString('es-CO')}
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
    </div>
  )
}