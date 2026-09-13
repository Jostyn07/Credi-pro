import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { signUp } from '@/services/auth'

export default function Registro() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold text-primary">Crear cuenta</h1>
        <p className="mb-6 text-sm text-slate-500">Empieza tu prueba gratis de 15 días</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="fullName"
            label="Nombre"
            placeholder="Tu nombre completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            id="email"
            type="email"
            label="Correo"
            placeholder="tu@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="password"
            type="password"
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            id="confirmPassword"
            type="password"
            label="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm text-status-danger">{error}</p>}

          <Button type="submit" loading={loading} className="w-full">
            Crear cuenta
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  )
}
