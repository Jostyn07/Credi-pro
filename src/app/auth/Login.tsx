import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { signIn, signInWithGoogle } from '@/services/auth'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold text-primary">Bienvenido</h1>
        <p className="mb-6 text-sm text-slate-500">Ingresa a tu cuenta para continuar</p>

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
          <Input
            id="password"
            type="password"
            label="Contraseña"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="text-right">
            <Link to="/recuperar-contrasena" className="text-xs text-accent hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {error && <p className="text-sm text-status-danger">{error}</p>}

          <Button type="submit" loading={loading} className="w-full">
            Iniciar sesión
          </Button>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            o
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Button type="button" variant="secondary" onClick={signInWithGoogle} className="w-full">
            Continuar con Google
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿No tienes una cuenta?{' '}
          <Link to="/registro" className="text-accent hover:underline">
            Regístrate
          </Link>
        </p>
      </Card>
    </div>
  )
}
