import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Además de requerir sesión, exige que el usuario ya haya completado
// el onboarding (tiene organization_id asignado).
export function RequireOrganization({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  if (!profile?.organization_id) return <Navigate to="/onboarding/crear-organizacion" replace />
  return <>{children}</>
}

export function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  if (!profile?.is_platform_admin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
