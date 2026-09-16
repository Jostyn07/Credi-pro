import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createClient, type Client } from '@/services/clients'
import { useAuth } from '@/contexts/AuthContext'

interface QuickNewClientModalProps {
  open: boolean
  onClose: () => void
  onCreated: (client: Client) => void
}

// Formulario reducido a los campos indispensables para poder seguir con el
// préstamo de una vez; el resto de la ficha (dirección, laboral, contacto de
// emergencia, etc.) se completa después desde Clientes > Editar.
export function QuickNewClientModal({ open, onClose, onCreated }: QuickNewClientModalProps) {
  const { profile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [identification, setIdentification] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setFullName('')
    setIdentification('')
    setPhone('')
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile?.organization_id) return
    setError(null)
    setLoading(true)
    try {
      const client = await createClient(
        { full_name: fullName, identification: identification || undefined, phone: phone || undefined },
        profile.organization_id,
      )
      onCreated(client)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nuevo cliente">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoFocus
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Identificación"
            value={identification}
            onChange={(e) => setIdentification(e.target.value)}
          />
          <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <p className="text-xs text-neutral-400">
          Podrás completar dirección, correo y demás datos después, desde la ficha del cliente.
        </p>

        {error && <p className="text-sm text-status-danger">{error}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Crear y continuar
          </Button>
        </div>
      </form>
    </Modal>
  )
}