import { useState, useEffect, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { uploadDocument, type DocumentType } from '@/services/documents'
import { getClients, type Client } from '@/services/clients'
import { getLoans, type Loan } from '@/services/loans'
import { useAuth } from '@/contexts/AuthContext'

interface SubirDocumentoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const typeOptions: { value: DocumentType; label: string }[] = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'recibo_pago', label: 'Recibo de pago' },
  { value: 'liquidacion', label: 'Liquidación' },
  { value: 'acuerdo', label: 'Acuerdo' },
  { value: 'documento_identidad', label: 'Documento de identidad' },
  { value: 'reestructuracion', label: 'Reestructuración' },
  { value: 'otro', label: 'Otro' },
]

export function SubirDocumentoModal({ open, onClose, onSuccess }: SubirDocumentoModalProps) {
  const { profile } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('otro')
  const [clientId, setClientId] = useState('')
  const [loanId, setLoanId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    getClients().then(setClients)
    getLoans().then(setLoans)
  }, [open])

  function reset() {
    setFile(null)
    setDocumentType('otro')
    setClientId('')
    setLoanId('')
    setError(null)
    onClose()
  }

  const loansForClient = clientId ? loans.filter((l) => l.client_id === clientId) : loans

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile?.organization_id || !file) return
    setError(null)
    setLoading(true)
    try {
      await uploadDocument({
        file,
        documentType,
        organizationId: profile.organization_id,
        clientId: clientId || undefined,
        loanId: loanId || undefined,
      })
      onSuccess()
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el documento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={reset} title="Subir documento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-primary">Archivo</label>
          <input
            type="file"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1.5 block w-full text-sm text-neutral-500 file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-700"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-primary">Tipo de documento</label>
          <select
            className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
          >
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-primary">Cliente (opcional)</label>
            <select
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value)
                setLoanId('')
              }}
            >
              <option value="">Sin asignar</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-primary">Préstamo (opcional)</label>
            <select
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary disabled:bg-neutral-50"
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
              disabled={loansForClient.length === 0}
            >
              <option value="">Sin asignar</option>
              {loansForClient.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.loan_number}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-status-danger">{error}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={reset} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={!file} className="flex-1">
            Subir documento
          </Button>
        </div>
      </form>
    </Modal>
  )
}