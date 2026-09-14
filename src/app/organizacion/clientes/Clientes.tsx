import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getClients, type Client } from '@/services/clients'

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getClients()
      .then(setClients)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">Clientes</h1>
          <p className="text-sm text-slate-500">Administra tus clientes</p>
        </div>
        <Link to="/clientes/nuevo">
          <Button>+ Nuevo cliente</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <Table
          columns={[
            { key: 'full_name', header: 'Nombre' },
            { key: 'identification', header: 'Identificación' },
            { key: 'phone', header: 'Teléfono' },
            {
              key: 'status',
              header: 'Estado',
              render: (row) => (
                <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>
                  {row.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <Link to={`/clientes/${row.id}`} className="text-accent hover:underline">
                  Ver
                </Link>
              ),
            },
          ]}
          data={clients}
          rowKey={(row) => row.id}
          emptyMessage="Aún no tienes clientes registrados."
        />
      )}
    </div>
  )
}