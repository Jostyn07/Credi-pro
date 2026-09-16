import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Landmark,
  Wallet,
  CalendarDays,
  PhoneCall,
  Banknote,
  FileText,
  CreditCard,
  Menu,
  X,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { TrialBanner } from '@/components/ui/TrialBanner'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'

// Orden y set exacto de la Tabla 6 del documento de especificación
// (Ayuda/Guías y Soporte quedan para una fase posterior)
const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/prestamos', label: 'Préstamos', icon: Landmark },
  { to: '/pagos', label: 'Pagos', icon: Wallet },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/cobranza', label: 'Cobranza', icon: PhoneCall },
  { to: '/caja', label: 'Caja', icon: Banknote },
  { to: '/documentos', label: 'Documentos', icon: FileText },
  { to: '/suscripcion', label: 'Suscripción', icon: CreditCard },
]

// showLabels=false: sidebar colapsada a solo íconos (768–1279px, Tabla 19)
function NavList({ onNavigate, showLabels }: { onNavigate?: () => void; showLabels: boolean }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          title={showLabels ? undefined : label}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              !showLabels && 'justify-center px-2',
              isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white',
            )
          }
        >
          <Icon size={18} className="shrink-0" />
          {showLabels && label}
        </NavLink>
      ))}
    </nav>
  )
}

function UserFooter({ showLabels }: { showLabels: boolean }) {
  const { profile } = useAuth()
  return (
    <div className={cn('flex items-center gap-3 border-t border-white/10 px-5 py-4', !showLabels && 'justify-center px-2')}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
        {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
      </div>
      {showLabels && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium text-white">{profile?.full_name ?? 'Usuario'}</p>
          <p className="truncate text-xs text-white/50">{profile?.email}</p>
        </div>
      )}
    </div>
  )
}

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-surface">
      {/*
        Comportamiento responsive según Tabla 19 del documento:
        - <768px: oculta (se reemplaza por el drawer de abajo)
        - 768–1279px (md): colapsada a solo íconos, w-16
        - ≥1280px (xl): completa, w-sidebar (248px), con etiquetas
      */}
      <aside className="hidden w-16 shrink-0 flex-col bg-primary-900 md:flex xl:w-sidebar">
        {/* Colapsada: 768–1279px (md a xl) — solo íconos */}
        <div className="flex flex-1 flex-col xl:hidden">
          <div className="flex items-center justify-center px-2 py-5">
            <Logo variant="full" />
          </div>
          <NavList showLabels={false} />
          <UserFooter showLabels={false} />
        </div>

        {/* Completa: ≥1280px — con etiquetas */}
        <div className="hidden flex-1 flex-col xl:flex">
          <div className="px-5 py-5">
            <Logo variant="light" />
          </div>
          <NavList showLabels onNavigate={undefined} />
          <UserFooter showLabels />
        </div>
      </aside>

      {/* Drawer móvil: <768px según Tabla 19 — siempre con etiquetas completas */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-primary-900 shadow-xl">
            <div className="flex items-center justify-between px-5 py-5">
              <Logo variant="light" />
              <button
                onClick={() => setMobileNavOpen(false)}
                className="text-white/60 hover:text-white"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>
            <NavList showLabels onNavigate={() => setMobileNavOpen(false)} />
            <UserFooter showLabels />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Barra superior móvil: logo + botón de menú, solo <768px */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-surface-card px-4 py-3 md:hidden">
          <Logo />
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg p-2 text-primary hover:bg-neutral-100"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
        </div>

        <TrialBanner />
        <Outlet />
      </div>
    </div>
  )
}