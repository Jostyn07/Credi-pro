import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Logo } from '@/components/ui/Logo'
import { AuthFooter } from '@/components/ui/AuthFooter'
import { supabase } from '@/lib/supabaseClient'

export default function RestablecerContrasena() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checkingLink, setCheckingLink] = useState(true)

  useEffect(() => {
    // El enlace del correo (?type=recovery) hace que supabase-js cree una
    // sesión temporal automáticamente al cargar esta página. La esperamos
    // antes de mostrar el formulario.
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(!!data.session)
      setCheckingLink(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

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
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña')
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

          <h1 className="mb-1 text-center text-xl font-semibold text-primary">Establece tu nueva contraseña</h1>

          {checkingLink ? (
            <div className="mt-6 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : !sessionReady ? (
            <div className="mt-6 text-center">
              <p className="text-sm text-status-danger">
                Este enlace no es válido o ya expiró. Solicita uno nuevo.
              </p>
              <Link to="/recuperar-contrasena" className="mt-4 inline-block text-sm text-accent hover:underline">
                Solicitar nuevo enlace
              </Link>
            </div>
          ) : success ? (
            <p className="mt-6 text-center text-sm text-status-success">
              Contraseña actualizada. Redirigiendo...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <PasswordInput
                id="password"
                label="Nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <PasswordInput
                id="confirmPassword"
                label="Confirmar nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              {error && <p className="text-sm text-status-danger">{error}</p>}

              <Button type="submit" loading={loading} className="w-full">
                Guardar nueva contraseña
              </Button>
            </form>
          )}
        </div>
      </div>

      <AuthFooter />
    </div>
  )
}