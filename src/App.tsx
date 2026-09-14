import { Routes, Route, Navigate } from 'react-router-dom'

import Login from '@/app/auth/Login'
import Registro from '@/app/auth/Registro'
import RecuperarContrasena from '@/app/auth/RecuperarContrasena'
import CrearOrganizacion from '@/app/onboarding/CrearOrganizacion'
import SeleccionarPlan from '@/app/onboarding/SeleccionarPlan'
import Listo from '@/app/onboarding/Listo'
import Suscripcion from '@/app/organizacion/Suscripcion'
import Dashboard from '@/app/organizacion/Dashboard'
import Clientes from '@/app/clientes/Clientes'
import NuevoCliente from '@/app/clientes/NuevoCliente'
import ClienteDetalle from '@/app/clientes/ClienteDetalle'
import Prestamos from '@/app/prestamos/Prestamos'
import NuevoPrestamo from '@/app/prestamos/NuevoPrestamo'
import PrestamoDetalle from '@/app/prestamos/PrestamoDetalle'
import Pagos from '@/app/pagos/Pagos'
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

      {/* organización — requiere sesión + organización creada */}
      <Route
        path="/dashboard"
        element={
          <RequireOrganization>
            <Dashboard />
          </RequireOrganization>
        }
      />

      <Route
        path="/clientes"
        element={
          <RequireOrganization>
            <Clientes />
          </RequireOrganization>
        }
      />
      <Route
        path="/clientes/nuevo"
        element={
          <RequireOrganization>
            <NuevoCliente />
          </RequireOrganization>
        }
      />
      <Route
        path="/clientes/:id"
        element={
          <RequireOrganization>
            <ClienteDetalle />
          </RequireOrganization>
        }
      />

      <Route
        path="/prestamos"
        element={
          <RequireOrganization>
            <Prestamos />
          </RequireOrganization>
        }
      />
      <Route
        path="/prestamos/nuevo"
        element={
          <RequireOrganization>
            <NuevoPrestamo />
          </RequireOrganization>
        }
      />
      <Route
        path="/prestamos/:id"
        element={
          <RequireOrganization>
            <PrestamoDetalle />
          </RequireOrganization>
        }
      />

      <Route
        path="/pagos"
        element={
          <RequireOrganization>
            <Pagos />
          </RequireOrganization>
        }
      />

      <Route
        path="/suscripcion"
        element={
          <RequireOrganization>
            <Suscripcion />
          </RequireOrganization>
        }
      />

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