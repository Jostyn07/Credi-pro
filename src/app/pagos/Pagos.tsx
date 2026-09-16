import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { getRecentPayments, type Payment } from '@/services/payments'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

export default function Pagos() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecentPayments(50)
      .then(setPayments)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-950">Pagos</h1>
        <p className="text-sm text-neutral-500">Últimos pagos registrados en toda tu cartera</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <Table
          columns={[
            {
              key: 'date',
              header: 'Fecha',
              render: (row) => new Date(row.payment_date).toLocaleDateString('es-CO'),
            },
            {
              key: 'client',
              header: 'Cliente',
              render: (row) => row.loans?.clients?.full_name ?? '—',
            },
            {
              key: 'loan',
              header: 'Préstamo',
              render: (row) => (
                <Link to={`/prestamos/${row.loan_id}`} className="text-accent hover:underline">
                  {row.loans?.loan_number ?? row.loan_id.slice(0, 8)}
                </Link>
              ),
            },
            { key: 'amount', header: 'Monto', render: (row) => formatCOP(row.amount) },
            { key: 'method', header: 'Medio', render: (row) => row.payment_method ?? '—' },
            {
              key: 'type',
              header: '',
              render: (row) => (row.is_liquidation ? <Badge tone="info">Liquidación</Badge> : null),
            },
          ]}
          data={payments}
          rowKey={(row) => row.id}
          emptyMessage="Aún no se han registrado pagos."
        />
      )}
    </div>
  )
}