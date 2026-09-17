import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getInstallmentsByRange, type CalendarInstallment } from '@/services/calendar'
import { getPaymentsByDateRange } from '@/services/payments'
import { cn } from '@/utils/cn'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagada',
  overdue: 'Vencida',
}

type ViewMode = 'mensual' | 'semanal' | 'diaria'

function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7 // lunes = 0
  const s = new Date(d)
  s.setDate(d.getDate() - day)
  return s
}

export default function Calendario() {
  const [view, setView] = useState<ViewMode>('mensual')
  const [anchor, setAnchor] = useState(new Date())
  const [installments, setInstallments] = useState<CalendarInstallment[]>([])
  const [loading, setLoading] = useState(true)
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [search, setSearch] = useState('')

  const [monthSummary, setMonthSummary] = useState<{
    totalCount: number
    totalAmount: number
    paidCount: number
    receivedAmount: number
    pendingCount: number
    pendingAmount: number
  } | null>(null)
  const [upcoming, setUpcoming] = useState<CalendarInstallment[]>([])

  const year = anchor.getFullYear()
  const month = anchor.getMonth()

  // Rango visible según la vista activa.
  const [rangeStart, rangeEnd] = useMemo(() => {
    if (view === 'mensual') return [new Date(year, month, 1), new Date(year, month + 1, 0)]
    if (view === 'semanal') {
      const s = startOfWeek(anchor)
      const e = new Date(s)
      e.setDate(s.getDate() + 6)
      return [s, e]
    }
    return [anchor, anchor]
  }, [view, anchor, year, month])

  useEffect(() => {
    setLoading(true)
    getInstallmentsByRange(toISODate(rangeStart), toISODate(rangeEnd))
      .then(setInstallments)
      .finally(() => setLoading(false))
  }, [rangeStart, rangeEnd])

  // "Resumen del mes" siempre es del mes del ancla actual, sin importar la
  // vista activa (semanal/diaria también lo muestran como contexto).
  useEffect(() => {
    const s = new Date(year, month, 1)
    const e = new Date(year, month + 1, 0)
    Promise.all([getInstallmentsByRange(toISODate(s), toISODate(e)), getPaymentsByDateRange(toISODate(s), toISODate(e))]).then(
      ([monthInstallments, monthPayments]) => {
        setMonthSummary({
          totalCount: monthInstallments.length,
          totalAmount: monthInstallments.reduce((sum, i) => sum + i.capital + i.interest, 0),
          paidCount: monthInstallments.filter((i) => i.status === 'paid').length,
          receivedAmount: monthPayments.reduce((sum, p) => sum + p.amount, 0),
          pendingCount: monthInstallments.filter((i) => i.status !== 'paid').length,
          pendingAmount: monthInstallments
            .filter((i) => i.status !== 'paid')
            .reduce((sum, i) => sum + Math.max(i.capital - i.capital_paid, 0) + Math.max(i.interest - i.interest_paid, 0), 0),
        })
      },
    )
  }, [year, month])

  // "Próximos vencimientos" es independiente del mes que se esté mirando.
  useEffect(() => {
    const today = new Date()
    const in30 = new Date(today)
    in30.setDate(today.getDate() + 30)
    getInstallmentsByRange(toISODate(today), toISODate(in30)).then((rows) =>
      setUpcoming(rows.filter((i) => i.status !== 'paid').slice(0, 5)),
    )
  }, [])

  const filtered = installments.filter((i) => {
    if (estadoFilter !== 'todos' && i.status !== estadoFilter) return false
    if (search && !(i.loans?.clients?.full_name ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarInstallment[]>()
    for (const inst of filtered) {
      const list = map.get(inst.due_date) ?? []
      list.push(inst)
      map.set(inst.due_date, list)
    }
    return map
  }, [filtered])

  function step(delta: number) {
    const next = new Date(anchor)
    if (view === 'mensual') next.setMonth(anchor.getMonth() + delta)
    else if (view === 'semanal') next.setDate(anchor.getDate() + delta * 7)
    else next.setDate(anchor.getDate() + delta)
    setAnchor(next)
  }

  const label =
    view === 'diaria'
      ? anchor.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
      : view === 'semanal'
        ? `${rangeStart.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} – ${rangeEnd.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : anchor.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  const monthDays: (Date | null)[] = []
  if (view === 'mensual') {
    const firstWeekday = (rangeStart.getDay() + 6) % 7
    for (let i = 0; i < firstWeekday; i++) monthDays.push(null)
    for (let d = 1; d <= rangeEnd.getDate(); d++) monthDays.push(new Date(year, month, d))
  }

  const weekDaysDates: Date[] =
    view === 'semanal'
      ? Array.from({ length: 7 }, (_, i) => {
          const d = new Date(rangeStart)
          d.setDate(rangeStart.getDate() + i)
          return d
        })
      : []

  function renderDayCell(day: Date) {
    const iso = toISODate(day)
    const dayInstallments = byDate.get(iso) ?? []
    const total = dayInstallments.reduce((s, x) => s + x.capital + x.interest, 0)
    const isToday = iso === toISODate(new Date())
    return (
      <div
        key={iso}
        className={cn(
          'flex min-h-[80px] flex-col rounded-lg border p-1.5 text-left text-xs',
          'border-neutral-200',
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-950">Calendario de pagos</h1>
        <p className="text-sm text-neutral-500">Visualiza y gestiona los próximos vencimientos</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-neutral-300 p-1">
          {(['mensual', 'semanal', 'diaria'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium capitalize',
                view === v ? 'bg-accent text-white' : 'text-neutral-500 hover:text-primary',
              )}
            >
              Vista {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-primary hover:bg-neutral-100"
            onClick={() => setAnchor(new Date())}
          >
            Hoy
          </button>
          <button
            className="rounded-lg border border-neutral-300 p-1.5 text-primary hover:bg-neutral-100"
            onClick={() => step(-1)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="rounded-lg border border-neutral-300 p-1.5 text-primary hover:bg-neutral-100"
            onClick={() => step(1)}
          >
            <ChevronRight size={16} />
          </button>
          <span className="min-w-[10rem] text-sm font-medium capitalize text-primary">{label}</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
        >
          <option value="todos">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="partial">Parcial</option>
          <option value="paid">Pagada</option>
          <option value="overdue">Vencida</option>
        </select>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-primary placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : view === 'mensual' ? (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-400">
                {weekDays.map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day, i) => (day ? renderDayCell(day) : <div key={i} />))}
              </div>
            </>
          ) : view === 'semanal' ? (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-400">
                {weekDaysDates.map((d) => (
                  <div key={toISODate(d)} className="py-2">
                    {weekDays[(d.getDay() + 6) % 7]} {d.getDate()}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">{weekDaysDates.map((d) => renderDayCell(d))}</div>
            </>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-400">No hay cuotas programadas este día.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {filtered.map((inst) => (
                <li key={inst.id}>
                  <Link
                    to={`/prestamos/${inst.loan_id}`}
                    className="block rounded-lg border border-neutral-200 p-3 hover:border-primary-500"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">{inst.loans?.clients?.full_name}</span>
                      <Badge tone={inst.status === 'overdue' ? 'danger' : 'neutral'}>{statusLabel[inst.status]}</Badge>
                    </div>
                    <p className="text-xs text-neutral-400">
                      {inst.loans?.loan_number} · Cuota {inst.number}
                    </p>
                    <p className="mt-1 text-sm font-medium text-primary">{formatCOP(inst.capital + inst.interest)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <p className="mb-3 text-sm font-medium text-primary">Resumen del mes</p>
            {!monthSummary ? (
              <div className="flex justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            ) : (
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Total de pagos</dt>
                  <dd className="font-medium text-primary">{monthSummary.totalCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Monto programado</dt>
                  <dd className="font-medium text-primary">{formatCOP(monthSummary.totalAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Pagos realizados</dt>
                  <dd className="font-medium text-success-700">{monthSummary.paidCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Monto recibido</dt>
                  <dd className="font-medium text-success-700">{formatCOP(monthSummary.receivedAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Pendientes</dt>
                  <dd className="font-medium text-primary">{monthSummary.pendingCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Monto pendiente</dt>
                  <dd className="font-medium text-primary">{formatCOP(monthSummary.pendingAmount)}</dd>
                </div>
              </dl>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-primary">Próximos vencimientos</p>
              <Link to="/cobranza?tab=por_vencer" className="text-xs font-medium text-accent hover:underline">
                Ver todos
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-neutral-400">No hay vencimientos próximos.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {upcoming.map((inst) => (
                  <li key={inst.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-primary">{inst.loans?.clients?.full_name}</p>
                      <p className="text-xs text-neutral-400">
                        {new Date(inst.due_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className="font-medium text-success-700">{formatCOP(inst.capital + inst.interest)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}