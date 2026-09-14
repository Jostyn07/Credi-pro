import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Info, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { AuthFooter } from '@/components/ui/AuthFooter'
import { requestPasswordReset } from '@/services/auth'

export default function RecuperarContrasena() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el correo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-card bg-surface-card p-8 shadow-sm sm:p-10">
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

          <Link to="/login" className="mb-6 flex items-center gap-1.5 text-sm text-accent hover:underline">
            <ArrowLeft size={14} /> Volver al inicio
          </Link>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent/10">
              <KeyRound size={36} className="text-accent" />
            </div>

            <h1 className="mt-6 text-2xl font-semibold text-primary">Recupera tu contraseña</h1>
            <p className="mt-2 text-sm text-slate-500">
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>

          {sent ? (
            <div className="mt-6 flex items-start gap-3 rounded-lg bg-accent/10 p-4 text-sm text-accent">
              <Info size={18} className="mt-0.5 shrink-0" />
              <p>
                Revisa tu bandeja de entrada y también la carpeta de spam. El enlace expirará en 1 hora.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <Input
                id="email"
                type="email"
                label="Correo electrónico"
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && <p className="text-sm text-status-danger">{error}</p>}
              <Button type="submit" loading={loading} className="w-full">
                Enviar enlace
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Recordaste tu contraseña?{' '}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>

      <AuthFooter />
    </div>
  )
}