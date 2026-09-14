import { supabase } from '@/lib/supabaseClient'

export interface Client {
  id: string
  organization_id: string
  full_name: string
  identification: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  city: string | null
  birth_date: string | null
  occupation: string | null
  employer: string | null
  approximate_income: number | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  status: 'active' | 'inactive'
  created_at: string
}

export interface ClientInput {
  full_name: string
  identification?: string
  phone?: string
  whatsapp?: string
  email?: string
  address?: string
  city?: string
  birth_date?: string
  occupation?: string
  employer?: string
  approximate_income?: number
  emergency_contact_name?: string
  emergency_contact_phone?: string
}

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as Client[]
}

export async function getClient(id: string): Promise<Client> {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
  if (error) throw error
  return data as unknown as Client
}

// organization_id lo asigna la política RLS (with check) a partir de
// current_organization_id() — igual lo mandamos explícito porque la columna es NOT NULL.
export async function createClient(input: ClientInput, organizationId: string): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data as unknown as Client
}

export async function updateClient(id: string, input: Partial<ClientInput>): Promise<Client> {
  const { data, error } = await supabase.from('clients').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as unknown as Client
}