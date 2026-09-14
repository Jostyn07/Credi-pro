import { Routes, Route, Navigate } from 'react-router-dom'

import Login from '@/app/auth/Login'
import Registro from '@/app/auth/Registro'
import RecuperarContrasena from '@/app/auth/RecuperarContrasena'
import CrearOrganizacion from '@/app/onboarding/CrearOrganizacion'
import SeleccionarPlan from '@/app/onboarding/SeleccionarPlan'
import Suscripcion from '@/app/organizacion/Suscripcion'
import { RequireAuth, RequireOrganization, RequirePlatformAdmin } from '@/components/RouteGuard'

// Placeholder temporal — se reemplaza en Fase 3+ por las páginas reales
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

      {/* organización — requiere sesión + organización creada */}
      <Route
        path="/dashboard"
        element={
          <RequireOrganization>
            <Placeholder title="Dashboard" />
          </RequireOrganization>
        }
      />
      <Route
        path="/clientes"
        element={
          <RequireOrganization>
            <Placeholder title="Clientes" />
          </RequireOrganization>
        }
      />
      <Route
        path="/prestamos"
        element={
          <RequireOrganization>
            <Placeholder title="Préstamos" />
          </RequireOrganization>
        }
      />
      <Route
        path="/pagos"
        element={
          <RequireOrganization>
            <Placeholder title="Pagos" />
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