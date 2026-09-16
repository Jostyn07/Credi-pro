import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table } from '@/components/ui/Table'
import { getAllContracts, type Contract } from '@/services/contracts'

export default function Documentos() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllContracts()
      .then(setContracts)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-950">Documentos</h1>
        <p className="text-sm text-neutral-500">Contratos generados para tus préstamos</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <Table
          columns={[
            { key: 'contract_number', header: 'Contrato' },
            { key: 'client', header: 'Cliente', render: (row) => row.loans?.clients?.full_name ?? '—' },
            { key: 'loan', header: 'Préstamo', render: (row) => row.loans?.loan_number ?? '—' },
            { key: 'version', header: 'Versión', render: (row) => `v${row.version}` },
            {
              key: 'date',
              header: 'Generado',
              render: (row) => new Date(row.generated_at).toLocaleDateString('es-CO'),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <Link to={`/documentos/${row.id}`} className="text-accent hover:underline">
                  Ver
                </Link>
              ),
            },
          ]}
          data={contracts}
          rowKey={(row) => row.id}
          emptyMessage="Aún no se han generado contratos."
        />
      )}
    </div>
  )
}