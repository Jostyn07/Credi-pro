import { useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import type { DailySeriesPoint, LoanStatusDistribution } from '@/services/dashboard'

function formatCOPShort(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return value.toString()
}

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

type BarMetric = 'pagos' | 'desembolsos' | 'cartera'

const barLabels: Record<BarMetric, string> = {
  pagos: 'Pagos',
  desembolsos: 'Desembolsos',
  cartera: 'Cartera',
}

interface IngresosYCarteraChartProps {
  series: DailySeriesPoint[]
}

export function IngresosYCarteraChart({ series }: IngresosYCarteraChartProps) {
  const [metric, setMetric] = useState<BarMetric>('pagos')

  const data = series.map((p) => ({
    ...p,
    label: new Date(p.date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
  }))

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-950">Ingresos y cartera</p>
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
          {(Object.keys(barLabels) as BarMetric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                metric === m ? 'bg-white text-accent shadow-sm' : 'text-neutral-500 hover:text-primary',
              )}
            >
              {barLabels[m]}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ left: -10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#667085' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatCOPShort}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatCOP(value), name]}
            labelStyle={{ color: '#0F172A' }}
            contentStyle={{ borderRadius: 8, border: '1px solid #E4E7EC', fontSize: 12 }}
          />
          <Bar dataKey={metric} name={barLabels[metric]} fill="#2879AD" radius={[4, 4, 0, 0]} barSize={16} />
          {metric !== 'cartera' && (
            <Line
              type="monotone"
              dataKey="cartera"
              name="Cartera pendiente"
              stroke="#22A05A"
              strokeWidth={2}
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  )
}

interface LoanStatusDonutProps {
  distribution: LoanStatusDistribution
}

const statusColors: Record<string, string> = {
  'Al día': '#22A05A',
  'En mora': '#DC2626',
  Liquidados: '#98A2B3',
  Cancelados: '#D0D5DD',
}

export function LoanStatusDonut({ distribution }: LoanStatusDonutProps) {
  const data = [
    { name: 'Al día', value: distribution.alDia },
    { name: 'En mora', value: distribution.enMora },
    { name: 'Liquidados', value: distribution.liquidados },
    { name: 'Cancelados', value: distribution.cancelados },
  ].filter((d) => d.value > 0)

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <Card>
      <p className="mb-4 text-sm font-semibold text-neutral-950">Estado de los préstamos</p>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">Aún no hay préstamos para mostrar.</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={2}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={statusColors[entry.name]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl font-bold text-neutral-950">{total}</p>
              <p className="text-xs text-neutral-400">Préstamos</p>
            </div>
          </div>

          <ul className="flex flex-1 flex-col gap-2 text-sm">
            {data.map((d) => (
              <li key={d.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-neutral-600">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: statusColors[d.name] }}
                  />
                  {d.name}
                </span>
                <span className="font-medium text-neutral-950">
                  {d.value} ({Math.round((d.value / total) * 100)}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}