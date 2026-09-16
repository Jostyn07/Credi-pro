import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
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
  Search,
  HelpCircle,
  Bell,
  ChevronDown,
  Building2,
  LogOut,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { TrialBanner } from '@/components/ui/TrialBanner'
import { UsageBar } from '@/components/ui/UsageBar'
import { useAuth } from '@/contexts/AuthContext'
import { getOrganizationUsage, type OrganizationUsage } from '@/services/organization'
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

// Panel "Mi organización": nombre, plan, uso vs. límites y soporte — solo en la
// versión completa del sidebar (≥1280px). Los datos de uso vienen de una
// función independiente (getOrganizationUsage), no toca ninguna RPC financiera.
function OrganizationPanel() {
  const { profile } = useAuth()
  const [usage, setUsage] = useState<OrganizationUsage | null>(null)

  useEffect(() => {
    if (!profile?.organization_id || !profile.id) return
    getOrganizationUsage(profile.organization_id, profile.id).then(setUsage)
  }, [profile?.organization_id, profile?.id])

  if (!usage) return null

  return (
    <div className="border-t border-white/10 px-4 py-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">Mi organización</p>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
          <Building2 size={16} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{usage.organizationName}</p>
          <p className="truncate text-xs text-white/50">Plan {usage.planName}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <UsageBar label="Clientes" used={usage.clientsUsed} limit={usage.clientsLimit} />
        <UsageBar label="Préstamos" used={usage.loansUsed} limit={usage.loansLimit} />
        <UsageBar label="Usuarios" used={usage.usersUsed} limit={usage.usersLimit} />
      </div>

      <a
        href="mailto:soporte@credipro.cloud"
        className="mt-4 block rounded-lg bg-white/5 p-3 text-xs text-white/70 hover:bg-white/10"
      >
        <p className="font-medium text-white">¿Necesitas ayuda?</p>
        <p className="mt-0.5">Nuestro equipo está listo para apoyarte.</p>
        <span className="mt-2 inline-block font-medium text-primary-300">Contactar soporte →</span>
      </a>
    </div>
  )
}

function DesktopHeader() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [usage, setUsage] = useState<OrganizationUsage | null>(null)

  useEffect(() => {
    if (!profile?.organization_id || !profile.id) return
    getOrganizationUsage(profile.organization_id, profile.id).then(setUsage)
  }, [profile?.organization_id, profile?.id])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="hidden items-center gap-4 border-b border-neutral-200 bg-surface-card px-6 py-3 md:flex">
      <div className="relative flex-1 max-w-xl">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Buscar clientes, préstamos, pagos..."
          className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-16 text-sm text-primary placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-400">
          Ctrl K
        </span>
      </div>

      <button className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" aria-label="Ayuda">
        <HelpCircle size={20} />
      </button>

      <button className="relative rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" aria-label="Notificaciones">
        <Bell size={20} />
      </button>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-neutral-100"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-900 text-xs font-semibold text-white">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="text-left leading-tight">
            <p className="text-sm font-medium text-primary">{profile?.full_name ?? 'Usuario'}</p>
            <p className="text-xs text-neutral-400">{usage?.userRoleName ?? ''}</p>
          </div>
          <ChevronDown size={16} className="text-neutral-400" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-danger-600 hover:bg-neutral-50"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
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
        - ≥1280px (xl): completa, w-sidebar (248px), con etiquetas + panel de organización
      */}
      <aside className="hidden w-16 shrink-0 flex-col bg-primary-900 md:flex xl:w-sidebar">
        <div className="flex flex-1 flex-col xl:hidden">
          <div className="flex items-center justify-center px-2 py-5">
            <Logo variant="full" />
          </div>
          <NavList showLabels={false} />
        </div>

        <div className="hidden flex-1 flex-col overflow-y-auto xl:flex">
          <div className="px-5 py-5">
            <Logo variant="light" />
          </div>
          <NavList showLabels onNavigate={undefined} />
          <OrganizationPanel />
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col overflow-y-auto bg-primary-900 shadow-xl">
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
            <OrganizationPanel />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
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

        <DesktopHeader />
        <TrialBanner />
        <Outlet />
      </div>
    </div>
  )
}