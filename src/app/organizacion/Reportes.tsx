import { Link } from 'react-router-dom'
import { Wallet, Landmark, Users, PhoneCall, ShieldAlert, Banknote, UserCog, Sliders, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface ReportDef {
  key: string
  title: string
  description: string
  icon: typeof Wallet
  iconTone: string
  to: string | null // null = todavía no construido
}

const REPORTS: ReportDef[] = [
  { key: 'financiero', title: 'Reporte financiero', description: 'Ingresos, egresos, utilidades y flujo de caja.', icon: Wallet, iconTone: 'bg-primary-100 text-primary-600', to: null },
  { key: 'cartera', title: 'Reporte de cartera', description: 'Estado de préstamos, mora y proyecciones.', icon: Landmark, iconTone: 'bg-success-100 text-success-700', to: '/reportes/cartera' },
  { key: 'clientes', title: 'Reporte de clientes', description: 'Análisis y comportamiento de clientes.', icon: Users, iconTone: 'bg-info-100 text-info-700', to: null },
  { key: 'pagos', title: 'Reporte de pagos', description: 'Pagos recibidos, métodos y tendencias.', icon: Wallet, iconTone: 'bg-warning-100 text-warning-700', to: '/reportes/pagos' },
  { key: 'cobranza', title: 'Reporte de cobranza', description: 'Gestiones, promesas y recuperación.', icon: PhoneCall, iconTone: 'bg-danger-100 text-danger-700', to: null },
  { key: 'riesgo', title: 'Reporte de riesgo', description: 'Score, segmentación y análisis de riesgo.', icon: ShieldAlert, iconTone: 'bg-primary-100 text-primary-600', to: null },
  { key: 'caja', title: 'Reporte de caja', description: 'Movimientos, cierres y conciliaciones.', icon: Banknote, iconTone: 'bg-success-100 text-success-700', to: null },
  { key: 'usuarios', title: 'Reporte de usuarios', description: 'Actividad y desempeño de usuarios.', icon: UserCog, iconTone: 'bg-info-100 text-info-700', to: null },
  { key: 'personalizado', title: 'Reporte personalizado', description: 'Crea reportes con filtros avanzados.', icon: Sliders, iconTone: 'bg-neutral-100 text-neutral-500', to: null },
]

export default function Reportes() {
  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-950">Reportes</h1>
        <p className="text-sm text-neutral-500">Obtén información clave de tu negocio</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const content = (
            <Card
              className={`flex items-start gap-3 transition-shadow ${r.to ? 'cursor-pointer hover:shadow-md' : 'opacity-60'}`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${r.iconTone}`}>
                <r.icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-primary">{r.title}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{r.description}</p>
                {!r.to && <p className="mt-1 text-xs italic text-neutral-400">Próximamente</p>}
              </div>
              {r.to && <ChevronRight size={16} className="mt-1 shrink-0 text-neutral-300" />}
            </Card>
          )
          return r.to ? (
            <Link key={r.key} to={r.to}>
              {content}
            </Link>
          ) : (
            <div key={r.key}>{content}</div>
          )
        })}
      </div>
    </div>
  )
}