import { supabase } from '@/lib/supabaseClient'
import { pctChange, monthStart, type StatWithChange } from '@/services/dashboard'

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

export interface ClientStats {
  total: StatWithChange
  active: StatWithChange
  inArrears: StatWithChange
  newThisMonth: StatWithChange
}

// Igual que en el Dashboard: total/activos/nuevos son exactos (created_at no
// cambia); "en mora" no tiene un histórico real de comparación disponible.
export async function getClientStats(): Promise<ClientStats> {
  const now = new Date()
  const startThisMonth = monthStart(now, 0)
  const startLastMonth = monthStart(now, -1)

  const [totalNow, totalBefore, activeNow, activeBefore, newThisMonth, newLastMonth, overdueRows] =
    await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('clients').select('id', { count: 'exact', head: true }).lt('created_at', startThisMonth),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('created_at', startThisMonth),
      supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', startThisMonth),
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startLastMonth)
        .lt('created_at', startThisMonth),
      supabase.from('installments').select('loans(client_id)').eq('status', 'overdue'),
    ])

  const inArrearsNow = new Set(((overdueRows.data ?? []) as any[]).map((r) => r.loans?.client_id)).size

  return {
    total: { value: totalNow.count ?? 0, changePct: pctChange(totalNow.count ?? 0, totalBefore.count ?? 0) },
    active: { value: activeNow.count ?? 0, changePct: pctChange(activeNow.count ?? 0, activeBefore.count ?? 0) },
    inArrears: { value: inArrearsNow, changePct: null },
    newThisMonth: {
      value: newThisMonth.count ?? 0,
      changePct: pctChange(newThisMonth.count ?? 0, newLastMonth.count ?? 0),
    },
  }
}