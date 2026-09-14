import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Logo } from '@/components/ui/Logo'
import { AuthHeroPanel } from '@/components/ui/AuthHeroPanel'
import { AuthFooter } from '@/components/ui/AuthFooter'
import { GoogleIcon, MicrosoftIcon } from '@/components/ui/BrandIcons'
import { signIn, signInWithGoogle, signInWithMicrosoft } from '@/services/auth'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
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
                onChange={(e) => setEmail(e.target.value)}
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
                <Button type="button" variant="secondary" onClick={signInWithGoogle}>
                  <GoogleIcon className="h-4 w-4" /> Google
                </Button>
                <Button type="button" variant="secondary" onClick={signInWithMicrosoft}>
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