import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { AuthFooter } from '@/components/ui/AuthFooter'
import { Stepper, ONBOARDING_STEPS } from '@/components/ui/Stepper'
import { createOrganization } from '@/services/organizations'
import { useAuth } from '@/contexts/AuthContext'

export default function CrearOrganizacion() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const [commercialName, setCommercialName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await createOrganization({ commercialName, taxId, phone, city })
      await refreshProfile()
      navigate('/onboarding/seleccionar-plan')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la organización')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-card bg-surface-card p-8 shadow-sm sm:p-10">
          <div className="mb-6 flex justify-center">
            <Logo />
          </div>

          <Stepper steps={ONBOARDING_STEPS} currentStep={2} />

          <h1 className="mb-1 text-xl font-semibold text-primary">Crea tu organización</h1>
          <p className="mb-6 text-sm text-slate-500">
            Estos datos aparecerán en contratos, recibos y comunicaciones.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="commercialName"
              label="Nombre comercial"
              placeholder="Finanzas del Norte S.A.S."
              value={commercialName}
              onChange={(e) => setCommercialName(e.target.value)}
              required
            />
            <Input
              id="taxId"
              label="NIT / Identificación fiscal"
              placeholder="901.234.567-8"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="phone"
                label="Teléfono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                id="city"
                label="Ciudad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-status-danger">{error}</p>}

            <Button type="submit" loading={loading} className="w-full">
              Continuar
            </Button>
          </form>
        </div>
      </div>

      <AuthFooter />
    </div>
  )
}