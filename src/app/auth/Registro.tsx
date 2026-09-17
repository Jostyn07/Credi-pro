import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Logo } from '@/components/ui/Logo'
import { AuthFooter } from '@/components/ui/AuthFooter'
import { Stepper, ONBOARDING_STEPS } from '@/components/ui/Stepper'
import { GoogleIcon, MicrosoftIcon } from '@/components/ui/BrandIcons'
import { signUp, signInWithGoogle, signInWithMicrosoft } from '@/services/auth'
import { useAuth } from '@/contexts/AuthContext'

export default function Registro() {
  const navigate = useNavigate()
  const { session, profile, loading: authLoading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Mismo caso que en Login.tsx: si Google/Microsoft ya autenticó al usuario
  // pero el flujo cayó de vuelta aquí en vez de en /auth/callback, lo
  // mandamos para adelante en vez de dejarlo viendo el formulario otra vez.
  useEffect(() => {
    if (!authLoading && session) {
      navigate(profile?.organization_id ? '/dashboard' : '/onboarding/crear-organizacion', { replace: true })
    }
  }, [authLoading, session, profile, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!acceptedTerms) {
      setError('Debes aceptar los Términos y Condiciones para continuar')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, fullName)
      // El trigger handle_new_user() crea el profile automáticamente.
      navigate('/onboarding/crear-organizacion')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  // signInWithOAuth() no distingue "login" de "registro": si el correo de
  // Google/Microsoft no existe todavía, Supabase crea el usuario igual (vía
  // el mismo trigger handle_new_user() de siempre) y AuthCallback ya sabe
  // mandarlo a /onboarding/crear-organizacion por no tener organization_id.
  async function handleGoogle() {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo continuar con Google')
    }
  }

  async function handleMicrosoft() {
    setError(null)
    try {
      await signInWithMicrosoft()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo continuar con Microsoft')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-card bg-surface-card p-8 shadow-sm sm:p-10">
          <div className="mb-6 flex items-center justify-between">
            <Logo />
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600"
              defaultValue="es"
              aria-label="Idioma"
            >
              <option value="es">🌐 ES</option>
            </select>
          </div>

          <h1 className="text-2xl font-semibold text-primary">Crea tu cuenta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Comienza a gestionar tu cartera con CrediPro. 15 días gratis, sin compromiso.
          </p>

          <div className="mt-8">
            <Stepper steps={ONBOARDING_STEPS} currentStep={1} />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="fullName"
              label="Nombre completo"
              placeholder="Juan Pérez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              id="email"
              type="email"
              label="Correo electrónico"
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              id="password"
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <PasswordInput
              id="confirmPassword"
              label="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
              />
              <span>
                Acepto los{' '}
                <Link to="/terminos" className="text-accent hover:underline">
                  Términos y Condiciones
                </Link>{' '}
                y la{' '}
                <Link to="/privacidad" className="text-accent hover:underline">
                  Política de Privacidad
                </Link>{' '}
                de CrediPro.
              </span>
            </label>

            {error && <p className="text-sm text-status-danger">{error}</p>}

            <Button type="submit" loading={loading} className="w-full">
              Crear cuenta →
            </Button>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              o continúa con
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" onClick={handleGoogle}>
                <GoogleIcon className="h-4 w-4" /> Google
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleMicrosoft}
                disabled
                title="Inicio de sesión con Microsoft deshabilitado temporalmente"
              >
                <MicrosoftIcon className="h-4 w-4" /> Microsoft
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>

      <AuthFooter />
    </div>
  )
}