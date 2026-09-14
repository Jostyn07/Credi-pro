import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/services/clients'
import { useAuth } from '@/contexts/AuthContext'

export default function NuevoCliente() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [form, setForm] = useState({
    full_name: '',
    identification: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile?.organization_id) return
    setError(null)
    setLoading(true)
    try {
      const client = await createClient(form, profile.organization_id)
      navigate(`/clientes/${client.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-xl font-semibold text-primary">Nuevo cliente</h1>

        <Card>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre completo"
              className="sm:col-span-2"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              required
            />
            <Input
              label="Identificación"
              value={form.identification}
              onChange={(e) => update('identification', e.target.value)}
            />
            <Input label="Teléfono" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            <Input
              label="WhatsApp"
              value={form.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
            />
            <Input
              label="Correo"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
            <Input
              label="Dirección"
              className="sm:col-span-2"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
            <Input label="Ciudad" value={form.city} onChange={(e) => update('city', e.target.value)} />

            {error && <p className="text-sm text-status-danger sm:col-span-2">{error}</p>}

            <div className="sm:col-span-2">
              <Button type="submit" loading={loading} className="w-full">
                Crear cliente
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}