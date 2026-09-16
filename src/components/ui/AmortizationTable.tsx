function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

interface Row {
  number: number
  due_date: string
  capital: number
  interest: number
  total: number
  balance?: number
}

export function AmortizationTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-neutral-200">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-neutral-100 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">Fecha</th>
            <th className="px-4 py-2 font-medium">Capital</th>
            <th className="px-4 py-2 font-medium">Interés</th>
            <th className="px-4 py-2 font-medium">Total</th>
            {rows[0]?.balance !== undefined && <th className="px-4 py-2 font-medium">Saldo</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {rows.map((row) => (
            <tr key={row.number}>
              <td className="px-4 py-2 text-primary">{row.number}</td>
              <td className="px-4 py-2 text-primary">
                {new Date(row.due_date).toLocaleDateString('es-CO')}
              </td>
              <td className="px-4 py-2 text-primary">{formatCOP(row.capital)}</td>
              <td className="px-4 py-2 text-primary">{formatCOP(row.interest)}</td>
              <td className="px-4 py-2 font-medium text-primary">{formatCOP(row.total)}</td>
              {row.balance !== undefined && (
                <td className="px-4 py-2 text-primary">{formatCOP(row.balance)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}