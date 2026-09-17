import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Percent, CalendarClock, AlertTriangle, Wallet, Banknote, Landmark, Upload } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  getOrganization,
  updateOrganization,
  uploadOrganizationLogo,
  type OrganizationSettings,
} from '@/services/organizationSettings'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'

const SECTIONS = [
  { key: 'general', label: 'Información general', icon: Building2 },
  { key: 'financiera', label: 'Configuración financiera', icon: Percent },
  { key: 'prestamos', label: 'Configuración de préstamos', icon: CalendarClock },
  { key: 'mora', label: 'Configuración de mora', icon: AlertTriangle },
  { key: 'pago', label: 'Métodos de pago', icon: Wallet },
  { key: 'desembolso', label: 'Métodos de desembolso', icon: Banknote },
  { key: 'cuentas', label: 'Cuentas / cajas', icon: Landmark },
] as const
type SectionKey = (typeof SECTIONS)[number]['key']

function MethodListEditor({ methods, onChange }: { methods: string[]; onChange: (m: string[]) => void }) {
  const [newMethod, setNewMethod] = useState('')
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {methods.map((m) => (
          <span key={m} className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-sm text-primary">
            {m}
            <button onClick={() => onChange(methods.filter((x) => x !== m))} className="text-neutral-400 hover:text-status-danger">
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input placeholder="Nuevo método..." value={newMethod} onChange={(e) => setNewMethod(e.target.value)} />
        <Button
          variant="secondary"
          onClick={() => {
            if (newMethod.trim() && !methods.includes(newMethod.trim())) {
              onChange([...methods, newMethod.trim()])
              setNewMethod('')
            }
          }}
        >
          Agregar
        </Button>
      </div>
    </div>
  )
}

export default function Configuracion() {
  const { profile } = useAuth()
  const [section, setSection] = useState<SectionKey>('general')
  const [settings, setSettings] = useState<OrganizationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!profile?.organization_id) return
    getOrganization(profile.organization_id)
      .then(setSettings)
      .finally(() => setLoading(false))
  }, [profile?.organization_id])

  function patch<K extends keyof OrganizationSettings>(key: K, value: OrganizationSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
    setSaved(false)
  }

  async function handleSave() {
    if (!settings || !profile?.organization_id) return
    setSaving(true)
    try {
      const updated = await updateOrganization(profile.organization_id, {
        commercial_name: settings.commercial_name,
        legal_name: settings.legal_name,
        tax_id: settings.tax_id,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        city: settings.city,
        country: settings.country,
        currency: settings.currency,
        timezone: settings.timezone,
        brand_color: settings.brand_color,
        default_interest_rate: settings.default_interest_rate,
        default_interest_modality: settings.default_interest_modality,
        default_grace_days: settings.default_grace_days,
        default_term_months: settings.default_term_months,
        default_late_fee_rate: settings.default_late_fee_rate,
        payment_methods: settings.payment_methods,
        disbursement_methods: settings.disbursement_methods,
      })
      setSettings(updated)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoChange(file: File | null) {
    if (!file || !profile?.organization_id) return
    setUploadingLogo(true)
    try {
      const url = await uploadOrganizationLogo(profile.organization_id, file)
      setSettings((prev) => (prev ? { ...prev, logo_url: url } : prev))
    } finally {
      setUploadingLogo(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Configuración de la organización</h1>
          <p className="text-sm text-neutral-500">Personaliza la información y reglas de tu empresa</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/configuracion/auditoria" className="text-sm font-medium text-accent hover:underline">
            Auditoría y seguridad
          </Link>
          {section !== 'cuentas' && (
            <Button onClick={handleSave} loading={saving}>
              Guardar cambios
            </Button>
          )}
        </div>
      </div>

      {saved && <p className="mb-4 text-sm text-success-700">Cambios guardados.</p>}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="flex flex-col gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium',
                section === s.key ? 'bg-accent/10 text-accent' : 'text-neutral-500 hover:bg-neutral-100 hover:text-primary',
              )}
            >
              <s.icon size={16} /> {s.label}
            </button>
          ))}
        </div>

        <Card>
          {section === 'general' && (
            <div className="grid gap-6 md:grid-cols-[1fr_220px]">
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold text-primary">Datos básicos de tu organización</p>
                <Input label="Nombre comercial *" value={settings.commercial_name} onChange={(e) => patch('commercial_name', e.target.value)} />
                <Input label="Razón social" value={settings.legal_name ?? ''} onChange={(e) => patch('legal_name', e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="NIT" value={settings.tax_id ?? ''} onChange={(e) => patch('tax_id', e.target.value)} />
                  <Input label="Teléfono" value={settings.phone ?? ''} onChange={(e) => patch('phone', e.target.value)} />
                </div>
                <Input label="Correo electrónico" value={settings.email ?? ''} onChange={(e) => patch('email', e.target.value)} />
                <Input label="Dirección" value={settings.address ?? ''} onChange={(e) => patch('address', e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Ciudad" value={settings.city ?? ''} onChange={(e) => patch('city', e.target.value)} />
                  <Input label="País" value={settings.country ?? ''} onChange={(e) => patch('country', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Moneda principal" value={settings.currency ?? ''} onChange={(e) => patch('currency', e.target.value)} />
                  <Input label="Zona horaria" value={settings.timezone ?? ''} onChange={(e) => patch('timezone', e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-primary">Logo de la empresa</p>
                  <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 text-center text-xs text-neutral-400 hover:border-accent">
                    {settings.logo_url ? (
                      <img src={settings.logo_url} alt="Logo" className="h-16 object-contain" />
                    ) : (
                      <Upload size={20} />
                    )}
                    <span>{uploadingLogo ? 'Subiendo...' : 'PNG, JPG (máx. 2MB)'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
                <div>
                  <label className="text-sm font-medium text-primary">Color principal</label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.brand_color ?? '#2879AD'}
                      onChange={(e) => patch('brand_color', e.target.value)}
                      className="h-10 w-14 rounded border border-neutral-300"
                    />
                    <span className="text-sm text-neutral-500">{settings.brand_color ?? '#2879AD'}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">
                    Se guarda, pero todavía no se aplica automáticamente a la interfaz.
                  </p>
                </div>
              </div>
            </div>
          )}

          {section === 'financiera' && (
            <div className="flex flex-col gap-4 sm:max-w-md">
              <p className="text-sm font-semibold text-primary">Valores por defecto al crear un préstamo nuevo</p>
              <Input
                label="Tasa de interés por defecto (% mensual)"
                type="number"
                step="0.1"
                value={settings.default_interest_rate ?? ''}
                onChange={(e) => patch('default_interest_rate', Number(e.target.value))}
              />
              <div>
                <label className="text-sm font-medium text-primary">Modalidad de cálculo por defecto</label>
                <select
                  className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
                  value={settings.default_interest_modality ?? 'saldo_pendiente'}
                  onChange={(e) => patch('default_interest_modality', e.target.value)}
                >
                  <option value="saldo_pendiente">Sobre saldo pendiente</option>
                  <option value="capital_inicial">Sobre capital inicial</option>
                  <option value="fijo">Cuota fija (sistema francés)</option>
                </select>
              </div>
            </div>
          )}

          {section === 'prestamos' && (
            <div className="flex flex-col gap-4 sm:max-w-md">
              <p className="text-sm font-semibold text-primary">Plazo por defecto</p>
              <Input
                label="Plazo por defecto (meses)"
                type="number"
                value={settings.default_term_months ?? ''}
                onChange={(e) => patch('default_term_months', Number(e.target.value))}
              />
            </div>
          )}

          {section === 'mora' && (
            <div className="flex flex-col gap-4 sm:max-w-md">
              <p className="text-sm font-semibold text-primary">Reglas de mora por defecto</p>
              <Input
                label="Días de gracia por defecto"
                type="number"
                value={settings.default_grace_days ?? ''}
                onChange={(e) => patch('default_grace_days', Number(e.target.value))}
              />
              <Input
                label="Tasa de mora por defecto (% mensual)"
                type="number"
                step="0.1"
                value={settings.default_late_fee_rate ?? ''}
                onChange={(e) => patch('default_late_fee_rate', Number(e.target.value))}
              />
            </div>
          )}

          {section === 'pago' && (
            <div>
              <p className="mb-3 text-sm font-semibold text-primary">Métodos de pago disponibles</p>
              <MethodListEditor methods={settings.payment_methods} onChange={(m) => patch('payment_methods', m)} />
              <p className="mt-3 text-xs text-neutral-400">
                Esta lista se guarda, pero los formularios de "Registrar pago" todavía muestran un conjunto fijo de
                opciones -- conectarlos a esta lista es un paso aparte.
              </p>
            </div>
          )}

          {section === 'desembolso' && (
            <div>
              <p className="mb-3 text-sm font-semibold text-primary">Métodos de desembolso disponibles</p>
              <MethodListEditor methods={settings.disbursement_methods} onChange={(m) => patch('disbursement_methods', m)} />
              <p className="mt-3 text-xs text-neutral-400">
                Igual que con métodos de pago: se guarda, pero todavía no está conectado al formulario de
                desembolso.
              </p>
            </div>
          )}

          {section === 'cuentas' && (
            <div className="text-sm text-neutral-500">
              <p className="mb-3">Las cuentas de caja (efectivo, bancos, billeteras digitales) se administran desde Caja.</p>
              <Link to="/caja" className="font-medium text-accent hover:underline">
                Ir a Caja →
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}