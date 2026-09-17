import { supabase } from '@/lib/supabaseClient'

export interface OrganizationSettings {
  id: string
  commercial_name: string
  legal_name: string | null
  tax_id: string | null
  phone: string | null
  email: string | null
  address: string | null
  country: string | null
  city: string | null
  currency: string | null
  timezone: string | null
  logo_url: string | null
  brand_color: string | null
  default_interest_rate: number | null
  default_interest_modality: string | null
  default_grace_days: number | null
  default_term_months: number | null
  default_late_fee_rate: number | null
  payment_methods: string[]
  disbursement_methods: string[]
}

export async function getOrganization(organizationId: string): Promise<OrganizationSettings> {
  const { data, error } = await supabase.from('organizations').select('*').eq('id', organizationId).single()
  if (error) throw error
  return data as unknown as OrganizationSettings
}

export async function updateOrganization(
  organizationId: string,
  patch: Partial<Omit<OrganizationSettings, 'id'>>,
): Promise<OrganizationSettings> {
  const { data, error } = await supabase
    .from('organizations')
    .update(patch)
    .eq('id', organizationId)
    .select()
    .single()
  if (error) throw error
  return data as unknown as OrganizationSettings
}

// El bucket "branding" es público (a diferencia de "documents") -- un logo
// se muestra en la interfaz, no tiene sentido detrás de una URL firmada que
// expira. La ruta empieza con el organization_id por el mismo motivo que en
// "documents": así las políticas de RLS aíslan la escritura por organización.
export async function uploadOrganizationLogo(organizationId: string, file: File): Promise<string> {
  const path = `${organizationId}/logo-${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('branding').upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('branding').getPublicUrl(path)
  await updateOrganization(organizationId, { logo_url: data.publicUrl })
  return data.publicUrl
}