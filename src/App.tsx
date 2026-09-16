import { Routes, Route, Navigate } from 'react-router-dom'

import Login from '@/app/auth/Login'
import Registro from '@/app/auth/Registro'
import RecuperarContrasena from '@/app/auth/RestablecerContrasena'
import RestablecerContrasena from '@/app/auth/RestablecerContrasena'
import CrearOrganizacion from '@/app/onboarding/CrearOrganizacion'
import SeleccionarPlan from '@/app/onboarding/SeleccionarPlan'
import Listo from '@/app/onboarding/Listo'
import Suscripcion from '@/app/organizacion/Suscripcion'
import Dashboard from '@/app/organizacion/Dashboard'
import Calendario from '@/app/organizacion/Calendario'
import Cobranza from '@/app/organizacion/Cobranza'
import Caja from '@/app/organizacion/Caja'
import Documentos from '@/app/organizacion/Documentos'
import ContratoDetalle from '@/app/organizacion/ContratoDetalle'
import Clientes from '@/app/clientes/Clientes'
import NuevoCliente from '@/app/clientes/NuevoCliente'
import ClienteDetalle from '@/app/clientes/ClienteDetalle'
import Prestamos from '@/app/prestamos/Prestamos'
import NuevoPrestamo from '@/app/prestamos/NuevoPrestamo'
import PrestamoDetalle from '@/app/prestamos/PrestamoDetalle'
import Pagos from '@/app/pagos/Pagos'
import { AppLayout } from '@/components/AppLayout'
import { RequireAuth, RequireOrganization, RequirePlatformAdmin } from '@/components/RouteGuard'

// Placeholder temporal — se reemplaza en fases siguientes por las páginas reales
function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="rounded-card bg-surface-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-primary">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Pendiente de implementar en la fase correspondiente.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* (auth) — públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
      <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />

      {/* onboarding — requiere sesión, pero aún no organización */}
      <Route
        path="/onboarding/crear-organizacion"
        element={
          <RequireAuth>
            <CrearOrganizacion />
          </RequireAuth>
        }
      />
      <Route
        path="/onboarding/seleccionar-plan"
        element={
          <RequireAuth>
            <SeleccionarPlan />
          </RequireAuth>
        }
      />
      <Route
        path="/onboarding/listo"
        element={
          <RequireAuth>
            <Listo />
          </RequireAuth>
        }
      />

      {/* organización — requiere sesión + organización creada; comparten el AppLayout (sidebar) */}
      <Route
        element={
          <RequireOrganization>
            <AppLayout />
          </RequireOrganization>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/nuevo" element={<NuevoCliente />} />
        <Route path="/clientes/:id" element={<ClienteDetalle />} />

        <Route path="/prestamos" element={<Prestamos />} />
        <Route path="/prestamos/nuevo" element={<NuevoPrestamo />} />
        <Route path="/prestamos/:id" element={<PrestamoDetalle />} />

        <Route path="/pagos" element={<Pagos />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/cobranza" element={<Cobranza />} />
        <Route path="/caja" element={<Caja />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/documentos/:id" element={<ContratoDetalle />} />

        <Route path="/suscripcion" element={<Suscripcion />} />
      </Route>

      {/* administración general — solo platform admins */}
      <Route
        path="/admin/dashboard"
        element={
          <RequirePlatformAdmin>
            <Placeholder title="Panel de administración general" />
          </RequirePlatformAdmin>
        }
      />

      <Route path="*" element={<Placeholder title="404 — Página no encontrada" />} />
    </Routes>
  )
}