import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { AuthFooter } from '@/components/ui/AuthFooter'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

// Página a la que Supabase redirige después de que el usuario confirma su
// correo (o de un login OAuth). El cliente de Supabase ya está en modo
// "implicit flow" (el default de supabase-js), así que detectSessionInUrl
// procesa el #access_token de la URL automáticamente al cargar la app —
// aquí no hay ningún token que intercambiar a mano. Este componente solo
// espera a que AuthContext refleje esa sesión y decide a dónde mandar al
// usuario según si ya tiene organización o no.
export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { session, profile, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  // Si el enlace ya expiró o ya fue usado, Supabase agrega el error
  // directamente a la URL (a veces en query, a veces en el fragment) en vez
  // de tokens — no hay nada que "confirmar" en ese caso.
  const errorDescription =
    searchParams.get('error_description') ||
    new URLSearchParams(window.location.hash.replace(/^#/, '')).get('error_description')

  useEffect(() => {
    if (errorDescription) return
    const timer = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(timer)
  }, [errorDescription])

  useEffect(() => {
    if (loading || errorDescription || !session) return
    const destination = profile?.organization_id ? '/dashboard' : '/onboarding/crear-organizacion'
    const redirectTimer = setTimeout(() => navigate(destination, { replace: true }), 1200)
    return () => clearTimeout(redirectTimer)
  }, [loading, session, profile, errorDescription, navigate])

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-card bg-surface-card p-8 text-center shadow-sm sm:p-10">
          <div className="mb-6 flex justify-center">
            <Logo />
          </div>

          {errorDescription ? (
            <>
              <XCircle size={40} className="mx-auto text-status-danger" />
              <h1 className="mt-4 text-xl font-semibold text-primary">No se pudo confirmar tu correo</h1>
              <p className="mt-2 text-sm text-slate-500">{errorDescription}</p>
              <p className="mt-1 text-sm text-slate-500">
                El enlace pudo haber expirado o ya haber sido usado. Puedes registrarte de nuevo con el mismo
                correo para recibir un enlace nuevo.
              </p>
              <Button className="mt-6 w-full" onClick={() => navigate('/registro')}>
                Volver a intentar
              </Button>
            </>
          ) : loading || !session ? (
            timedOut ? (
              <>
                <XCircle size={40} className="mx-auto text-status-danger" />
                <h1 className="mt-4 text-xl font-semibold text-primary">Esto está tardando más de lo normal</h1>
                <p className="mt-2 text-sm text-slate-500">
                  No detectamos tu sesión todavía. Intenta abrir el enlace del correo de nuevo o inicia sesión
                  manualmente.
                </p>
                <Button className="mt-6 w-full" onClick={() => navigate('/login')}>
                  Ir a iniciar sesión
                </Button>
              </>
            ) : (
              <>
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <h1 className="mt-4 text-xl font-semibold text-primary">Confirmando tu correo...</h1>
                <p className="mt-2 text-sm text-slate-500">Esto solo toma un momento.</p>
              </>
            )
          ) : (
            <>
              <CheckCircle2 size={40} className="mx-auto text-status-success" />
              <h1 className="mt-4 text-xl font-semibold text-primary">Correo confirmado</h1>
              <p className="mt-2 text-sm text-slate-500">
                Tu cuenta de CrediPro ha sido verificada correctamente. Ya puedes{' '}
                {profile?.organization_id ? 'continuar' : 'comenzar a configurar tu organización'}.
              </p>
              <Button
                className="mt-6 w-full"
                onClick={() => navigate(profile?.organization_id ? '/dashboard' : '/onboarding/crear-organizacion')}
              >
                Continuar →
              </Button>
            </>
          )}
        </div>
      </div>

      <AuthFooter />
    </div>
  )
}