import { supabase } from '@/lib/supabaseClient'

export interface CreateOrganizationInput {
  commercialName: string
  legalName?: string
  taxId?: string
  phone?: string
  email?: string
  country?: string
  city?: string
  currency?: string
}

// Llama a la función SQL create_organization() (security definer) definida en
// supabase/migrations/0001_core_schema.sql — crea la org, asigna al usuario
// como admin, y actualiza su profile.organization_id, todo en una transacción.
export async function createOrganization(input: CreateOrganizationInput) {
  const { data, error } = await supabase.rpc('create_organization', {
    p_commercial_name: input.commercialName,
    p_legal_name: input.legalName ?? null,
    p_tax_id: input.taxId ?? null,
    p_phone: input.phone ?? null,
    p_email: input.email ?? null,
    p_country: input.country ?? 'CO',
    p_city: input.city ?? null,
    p_currency: input.currency ?? 'COP',
  })
  if (error) throw error
  return data
}