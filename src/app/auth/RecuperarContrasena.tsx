import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { AuthFooter } from '@/components/ui/AuthFooter'
import { requestPasswordReset } from '@/services/auth'

export default function RecuperarContrasena() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await requestPasswordReset(email)
      // Por seguridad, Supabase no distingue "correo no existe" de "correo
      // enviado" -- mostramos el mismo mensaje de éxito en ambos casos, para
      // no revelar si un correo está registrado o no.
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
          <div className="mb-6 flex justify-center">
            <Logo />
          </div>

          {sent ? (
            <div className="text-center">
              <CheckCircle2 size={40} className="mx-auto text-status-success" />
              <h1 className="mt-4 text-xl font-semibold text-primary">Revisa tu correo</h1>
              <p className="mt-2 text-sm text-slate-500">
                Si <span className="font-medium">{email}</span> está registrado en CrediPro, te enviamos un enlace
                para restablecer tu contraseña.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Puede tardar unos minutos en llegar, y a veces cae en spam o correo no deseado.
              </p>
              <Link to="/login" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
                ← Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-center text-xl font-semibold text-primary">¿Olvidaste tu contraseña?</h1>
              <p className="mt-1 text-center text-sm text-slate-500">
                Escribe tu correo y te enviaremos un enlace para restablecerla.
              </p>

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
                  Enviar enlace →
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                <Link to="/login" className="font-medium text-accent hover:underline">
                  ← Volver a iniciar sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <AuthFooter />
    </div>
  )
}