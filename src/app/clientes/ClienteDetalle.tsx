import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getClient, type Client } from '@/services/clients'
import { getLoans, type Loan } from '@/services/loans'

const loanStatusTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  liquidated: 'neutral',
  cancelled: 'danger',
  refinanced: 'warning',
  restructured: 'warning',
  draft: 'neutral',
}

export default function ClienteDetalle() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([getClient(id), getLoans()])
      .then(([c, allLoans]) => {
        setClient(c)
        setLoans(allLoans.filter((l) => l.client_id === id))
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!client) {
    return <div className="p-6">Cliente no encontrado.</div>
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/clientes" className="text-sm text-accent hover:underline">
          ← Volver a clientes
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-primary">{client.full_name}</h1>
            <p className="text-sm text-neutral-500">{client.identification}</p>
          </div>
          <Link to={`/prestamos/nuevo?clientId=${client.id}`}>
            <Button>+ Nuevo préstamo</Button>
          </Link>
        </div>

        <Card className="mt-6">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-neutral-400">Teléfono</p>
              <p className="text-primary">{client.phone || '—'}</p>
            </div>
            <div>
              <p className="text-neutral-400">WhatsApp</p>
              <p className="text-primary">{client.whatsapp || '—'}</p>
            </div>
            <div>
              <p className="text-neutral-400">Correo</p>
              <p className="text-primary">{client.email || '—'}</p>
            </div>
            <div>
              <p className="text-neutral-400">Ciudad</p>
              <p className="text-primary">{client.city || '—'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-neutral-400">Dirección</p>
              <p className="text-primary">{client.address || '—'}</p>
            </div>
          </div>
        </Card>

        <h2 className="mb-3 mt-8 text-sm font-medium text-primary">Préstamos ({loans.length})</h2>
        {loans.length === 0 ? (
          <Card className="text-sm text-neutral-400">Este cliente aún no tiene préstamos.</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {loans.map((loan) => (
              <Link key={loan.id} to={`/prestamos/${loan.id}`}>
                <Card className="flex items-center justify-between hover:border-primary-500">
                  <span className="font-medium text-primary">{loan.loan_number}</span>
                  <Badge tone={loanStatusTone[loan.status] ?? 'neutral'}>{loan.status}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}