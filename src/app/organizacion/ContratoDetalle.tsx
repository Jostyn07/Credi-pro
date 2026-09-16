import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { getContract, type Contract } from '@/services/contracts'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    value,
  )
}

const modalityLabels: Record<string, string> = {
  saldo_pendiente: 'sobre saldo pendiente',
  capital_inicial: 'sobre capital inicial',
  fijo: 'cuota fija (sistema francés)',
}

export default function ContratoDetalle() {
  const { id } = useParams<{ id: string }>()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getContract(id)
      .then(setContract)
      .finally(() => setLoading(false))
  }, [id])

  if (loading || !contract) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const { organization: org, client, loan } = contract.content

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link to="/documentos" className="text-sm text-accent hover:underline">
            ← Volver a documentos
          </Link>
          <Button onClick={() => window.print()}>Descargar / Imprimir PDF</Button>
        </div>

        <div className="rounded-card bg-surface-card p-10 text-sm leading-relaxed text-primary shadow-sm print:shadow-none">
          <h1 className="mb-1 text-center text-lg font-bold uppercase">Contrato de préstamo</h1>
          <p className="mb-6 text-center text-xs text-neutral-400">
            {contract.contract_number} · versión {contract.version}
          </p>

          <p className="mb-4">
            Entre <strong>{org.commercial_name}</strong>
            {org.tax_id && <> (NIT {org.tax_id})</>}, en adelante <strong>EL PRESTAMISTA</strong>, y{' '}
            <strong>{client.full_name}</strong>
            {client.identification && <>, identificado(a) con documento {client.identification}</>}, en adelante{' '}
            <strong>EL DEUDOR</strong>, se celebra el presente contrato de préstamo bajo las siguientes condiciones:
          </p>

          <table className="mb-6 w-full border-collapse text-left">
            <tbody>
              {[
                ['Préstamo N°', loan.loan_number],
                ['Monto del préstamo', formatCOP(loan.principal)],
                ['Tasa de interés', `${loan.interest_rate}% mensual, ${modalityLabels[loan.interest_modality]}`],
                ['Plazo', `${loan.term_months} meses`],
                ['Fecha de desembolso', new Date(loan.disbursement_date).toLocaleDateString('es-CO')],
                ['Fecha de primera cuota', new Date(loan.first_payment_date).toLocaleDateString('es-CO')],
                ['Día de pago mensual', String(loan.payment_day)],
                ['Días de gracia', `${loan.grace_days} días`],
                ['Tasa de mora', `${loan.late_fee_rate}% mensual sobre el valor vencido`],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-neutral-200">
                  <td className="py-2 pr-4 font-medium text-neutral-500">{label}</td>
                  <td className="py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mb-4">
            EL DEUDOR se compromete a pagar la totalidad del préstamo, junto con los intereses pactados,
            de acuerdo con el calendario de amortización asociado a este contrato. El incumplimiento en
            el pago de cualquier cuota generará el interés de mora indicado, aplicable sobre el valor vencido
            desde el día siguiente al vencimiento del período de gracia.
          </p>
          <p className="mb-8">
            Este documento se genera de forma automática a partir de la información registrada en el sistema
            al momento del desembolso y refleja las condiciones vigentes en esa fecha.
          </p>

          <div className="mt-16 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t border-neutral-300 pt-2">Firma del prestamista</div>
            <div className="border-t border-neutral-300 pt-2">Firma del deudor — {client.full_name}</div>
          </div>
        </div>
      </div>
    </div>
  )
}