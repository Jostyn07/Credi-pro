import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getInstallmentsByRange, type CalendarInstallment } from '@/services/calendar'
import { cn } from '@/utils/cn'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function Calendario() {
  const [monthDate, setMonthDate] = useState(new Date())
  const [installments, setInstallments] = useState<CalendarInstallment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)

  useEffect(() => {
    setLoading(true)
    getInstallmentsByRange(toISODate(monthStart), toISODate(monthEnd))
      .then(setInstallments)
      .finally(() => setLoading(false))
    setSelectedDate(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarInstallment[]>()
    for (const inst of installments) {
      const list = map.get(inst.due_date) ?? []
      list.push(inst)
      map.set(inst.due_date, list)
    }
    return map
  }, [installments])

  const days: (Date | null)[] = []
  const firstWeekday = (monthStart.getDay() + 6) % 7 // lunes = 0
  for (let i = 0; i < firstWeekday; i++) days.push(null)
  for (let d = 1; d <= monthEnd.getDate(); d++) days.push(new Date(year, month, d))

  const selectedInstallments = selectedDate ? byDate.get(selectedDate) ?? [] : []

  const monthLabel = monthStart.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Calendario de pagos</h1>
          <p className="text-sm capitalize text-neutral-500">{monthLabel}</p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-primary hover:bg-neutral-100"
            onClick={() => setMonthDate(new Date(year, month - 1, 1))}
          >
            ← Anterior
          </button>
          <button
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-primary hover:bg-neutral-100"
            onClick={() => setMonthDate(new Date())}
          >
            Hoy
          </button>
          <button
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-primary hover:bg-neutral-100"
            onClick={() => setMonthDate(new Date(year, month + 1, 1))}
          >
            Siguiente →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-400">
                {weekDays.map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  if (!day) return <div key={i} />
                  const iso = toISODate(day)
                  const dayInstallments = byDate.get(iso) ?? []
                  const total = dayInstallments.reduce((s, x) => s + x.capital + x.interest, 0)
                  const isToday = iso === toISODate(new Date())

                  return (
                    <button
                      key={iso}
                      onClick={() => setSelectedDate(iso)}
                      className={cn(
                        'flex h-20 flex-col rounded-lg border p-1.5 text-left text-xs hover:border-primary-500',
                        selectedDate === iso ? 'border-accent bg-accent/5' : 'border-neutral-200',
                        isToday && 'ring-1 ring-accent',
                      )}
                    >
                      <span className="font-medium text-primary">{day.getDate()}</span>
                      {dayInstallments.length > 0 && (
                        <>
                          <span className="text-accent">{dayInstallments.length} pago(s)</span>
                          <span className="truncate text-neutral-400">{formatCOP(total)}</span>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </Card>

        <Card>
          <p className="mb-3 text-sm font-medium text-primary">
            {selectedDate
              ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-CO', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })
              : 'Selecciona un día'}
          </p>

          {selectedDate && selectedInstallments.length === 0 && (
            <p className="text-sm text-neutral-400">No hay pagos programados este día.</p>
          )}

          <ul className="flex flex-col gap-3">
            {selectedInstallments.map((inst) => (
              <li key={inst.id}>
                <Link to={`/prestamos/${inst.loan_id}`} className="block rounded-lg border border-neutral-200 p-3 hover:border-primary-500">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">{inst.loans?.clients?.full_name}</span>
                    <Badge tone={inst.status === 'overdue' ? 'danger' : 'neutral'}>{inst.status}</Badge>
                  </div>
                  <p className="text-xs text-neutral-400">{inst.loans?.loan_number} · Cuota {inst.number}</p>
                  <p className="mt-1 text-sm font-medium text-primary">{formatCOP(inst.capital + inst.interest)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}