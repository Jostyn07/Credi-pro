import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { AuthFooter } from '@/components/ui/AuthFooter'
import { Stepper, ONBOARDING_STEPS } from '@/components/ui/Stepper'

export default function Listo() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-card bg-surface-card p-8 text-center shadow-sm sm:p-10">
          <div className="mb-6 flex justify-center">
            <Logo />
          </div>

          <Stepper steps={ONBOARDING_STEPS} currentStep={4} />

          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-status-success/10">
              <CheckCircle2 size={40} className="text-status-success" />
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-semibold text-primary">¡Todo listo!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Tu organización quedó creada y tu prueba gratuita de 15 días ya comenzó. Puedes empezar a
            registrar tus clientes y préstamos ahora mismo.
          </p>

          <Button className="mt-8 w-full" onClick={() => navigate('/dashboard')}>
            Ir al dashboard →
          </Button>
        </div>
      </div>

      <AuthFooter />
    </div>
  )
}