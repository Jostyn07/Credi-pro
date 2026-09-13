import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
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
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold text-primary">Recuperar contraseña</h1>
        <p className="mb-6 text-sm text-slate-500">
          Te enviaremos un enlace para restablecerla
        </p>

        {sent ? (
          <p className="text-sm text-status-success">
            Si el correo existe en nuestro sistema, recibirás un enlace en unos minutos.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <Link to="/login" className="text-accent hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </Card>
    </div>
  )
}
