import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

// Fase 2 reemplaza esto por la selección real de plan + trial de 15 días + Wompi.
// Por ahora deja pasar directo al dashboard para poder probar el flujo completo.
export default function SeleccionarPlan() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card className="w-full max-w-md text-center">
        <h1 className="mb-1 text-xl font-semibold text-primary">Organización creada</h1>
        <p className="mb-6 text-sm text-slate-500">
          La selección de plan y el trial de 15 días se implementan en la Fase 2 (SaaS + Wompi).
        </p>
        <Button className="w-full" onClick={() => navigate('/dashboard')}>
          Ir al dashboard
        </Button>
      </Card>
    </div>
  )
}
