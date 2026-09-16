import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getLoans, type Loan } from '@/services/loans'

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  liquidated: 'neutral',
  cancelled: 'danger',
  refinanced: 'warning',
  restructured: 'warning',
  draft: 'neutral',
}

export default function Prestamos() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLoans()
      .then(setLoans)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Préstamos</h1>
          <p className="text-sm text-neutral-500">Todos los préstamos de tu cartera</p>
        </div>
        <Link to="/prestamos/nuevo">
          <Button>+ Nuevo préstamo</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <Table
          columns={[
            { key: 'loan_number', header: 'Préstamo' },
            {
              key: 'client',
              header: 'Cliente',
              render: (row) => row.clients?.full_name ?? '—',
            },
            {
              key: 'status',
              header: 'Estado',
              render: (row) => <Badge tone={statusTone[row.status] ?? 'neutral'}>{row.status}</Badge>,
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <Link to={`/prestamos/${row.id}`} className="text-accent hover:underline">
                  Ver
                </Link>
              ),
            },
          ]}
          data={loans}
          rowKey={(row) => row.id}
          emptyMessage="Aún no tienes préstamos registrados."
        />
      )}
    </div>
  )
}