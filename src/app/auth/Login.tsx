import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthError } from '@supabase/supabase-js'
import { MailWarning, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Logo } from '@/components/ui/Logo'
import { AuthHeroPanel } from '@/components/ui/AuthHeroPanel'
import { AuthFooter } from '@/components/ui/AuthFooter'
import { GoogleIcon, MicrosoftIcon } from '@/components/ui/BrandIcons'
import { signIn, signInWithGoogle, signInWithMicrosoft, resendSignupConfirmation } from '@/services/auth'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Cuando signIn() falla porque el correo no está confirmado, Supabase
  // devuelve error.code === 'email_not_confirmed' en vez del genérico
  // "credenciales inválidas". Guardamos el correo aquí para poder ofrecer
  // "reenviar" sin que el usuario tenga que volver a escribirlo.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sent' | 'error'>('idle')

  function updateEmail(value: string) {
    setEmail(value)
    if (unconfirmedEmail) {
      setUnconfirmedEmail(null)
      setResendState('idle')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setUnconfirmedEmail(null)
    setResendState('idle')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      if (err instanceof AuthError && err.code === 'email_not_confirmed') {
        setUnconfirmedEmail(email)
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!unconfirmedEmail) return
    setResending(true)
    setResendState('idle')
    try {
      await resendSignupConfirmation(unconfirmedEmail)
      setResendState('sent')
    } catch {
      setResendState('error')
    } finally {
      setResending(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google')
    }
  }

  async function handleMicrosoft() {
    setError(null)
    try {
      await signInWithMicrosoft()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Microsoft')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex w-full max-w-4xl overflow-hidden rounded-card bg-surface-card shadow-sm">
          <AuthHeroPanel />

          <div className="flex-1 p-8 sm:p-10">
            <div className="mb-8 flex items-center justify-between">
              <Logo />
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600"
                defaultValue="es"
                aria-label="Idioma"
              >
                <option value="es">🌐 ES</option>
              </select>
            </div>

            <h1 className="text-2xl font-semibold text-primary">Bienvenido de nuevo</h1>
            <p className="mt-1 text-sm text-slate-500">Inicia sesión para continuar en CrediPro</p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <Input
                id="email"
                type="email"
                label="Correo electrónico"
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => updateEmail(e.target.value)}
                required
              />
              <PasswordInput
                id="password"
                label="Contraseña"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                  />
                  Recordarme
                </label>
                <Link to="/recuperar-contrasena" className="text-accent hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {unconfirmedEmail && (
                <div className="flex flex-col gap-2 rounded-lg border border-warning-100 bg-warning-100/60 p-3">
                  <div className="flex items-start gap-2">
                    <MailWarning size={16} className="mt-0.5 shrink-0 text-warning-600" />
                    <p className="text-sm text-warning-700">
                      Tu correo <span className="font-medium">{unconfirmedEmail}</span> todavía no ha sido
                      verificado. Revisa tu bandeja de entrada o reenvía el correo de confirmación.
                    </p>
                  </div>

                  {resendState === 'sent' ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-success-700">
                      <CheckCircle2 size={14} /> Correo reenviado. Revisa tu bandeja de entrada (y spam).
                    </p>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={resending}
                      onClick={handleResend}
                      className="self-start"
                    >
                      Reenviar correo de verificación
                    </Button>
                  )}
                  {resendState === 'error' && (
                    <p className="text-xs text-status-danger">
                      No se pudo reenviar el correo. Intenta de nuevo en unos minutos.
                    </p>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-status-danger">{error}</p>}

              <Button type="submit" loading={loading} className="w-full">
                Iniciar sesión →
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
                <Button type="button" variant="secondary" onClick={handleMicrosoft}>
                  <MicrosoftIcon className="h-4 w-4" /> Microsoft
                </Button>
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              ¿No tienes una cuenta?{' '}
              <Link to="/registro" className="font-medium text-accent hover:underline">
                Crear cuenta
              </Link>
            </p>
          </div>
        </div>
      </div>

      <AuthFooter />
    </div>
  )
}