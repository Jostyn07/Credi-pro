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

export interface ClientLoanSummary {
  loanCount: number
  pendingBalance: number
}

// Cantidad de préstamos y saldo pendiente por cliente, para las columnas
// nuevas de la tabla. Se calcula agregando installments reales, no se guarda
// como total aparte en ningún lado.
export async function getClientLoanSummaries(): Promise<Map<string, ClientLoanSummary>> {
  const [loansResult, installmentsResult] = await Promise.all([
    supabase.from('loans').select('id, client_id'),
    supabase.from('installments').select('loan_id, capital, capital_paid, interest, interest_paid').neq('status', 'paid'),
  ])

  const loanToClient = new Map<string, string>()
  const summary = new Map<string, ClientLoanSummary>()

  for (const l of (loansResult.data ?? []) as any[]) {
    loanToClient.set(l.id, l.client_id)
    const s = summary.get(l.client_id) ?? { loanCount: 0, pendingBalance: 0 }
    s.loanCount += 1
    summary.set(l.client_id, s)
  }

  for (const i of (installmentsResult.data ?? []) as any[]) {
    const clientId = loanToClient.get(i.loan_id)
    if (!clientId) continue
    const s = summary.get(clientId) ?? { loanCount: 0, pendingBalance: 0 }
    s.pendingBalance += Math.max(i.capital - i.capital_paid, 0) + Math.max(i.interest - i.interest_paid, 0)
    summary.set(clientId, s)
  }

  return summary
}

export interface ClientProfileSummary {
  loansTotal: number
  loansActive: number
  loansInArrears: number
  loansLiquidated: number
  pendingBalance: number
  totalPaid: number
  recentActivity: { title: string; subtitle: string; timestamp: string }[]
}

// Perfil completo para el panel lateral: cuenta los préstamos del cliente por
// estado, suma lo pagado y pendiente, y arma una mini actividad reciente
// combinando pagos y cuotas generadas — igual que hicimos en el Dashboard,
// pero acotado a un solo cliente.
export async function getClientProfileSummary(clientId: string): Promise<ClientProfileSummary> {
  const { data: loansRaw } = await supabase.from('loans').select('id, status, loan_number').eq('client_id', clientId)
  const loans = (loansRaw ?? []) as any[]
  const loanIds = loans.map((l) => l.id)

  if (loanIds.length === 0) {
    return { loansTotal: 0, loansActive: 0, loansInArrears: 0, loansLiquidated: 0, pendingBalance: 0, totalPaid: 0, recentActivity: [] }
  }

  const [installmentsResult, paymentsResult] = await Promise.all([
    supabase
      .from('installments')
      .select('loan_id, capital, capital_paid, interest, interest_paid, status')
      .in('loan_id', loanIds),
    supabase
      .from('payments')
      .select('amount, payment_date, created_at, loans(loan_number)')
      .in('loan_id', loanIds)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const loansInArrearsSet = new Set(
    (installmentsResult.data ?? []).filter((i: any) => i.status === 'overdue').map((i: any) => i.loan_id),
  )

  const pendingBalance = (installmentsResult.data ?? []).reduce(
    (s, i: any) => s + Math.max(i.capital - i.capital_paid, 0) + Math.max(i.interest - i.interest_paid, 0),
    0,
  )
  const totalPaid = (installmentsResult.data ?? []).reduce((s, i: any) => s + i.capital_paid + i.interest_paid, 0)

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

  const recentActivity = ((paymentsResult.data ?? []) as any[]).map((p) => ({
    title: 'Pago registrado',
    subtitle: `${p.loans?.loan_number ?? ''} · ${formatCOP(Number(p.amount))}`,
    timestamp: p.created_at,
  }))

  return {
    loansTotal: (loans ?? []).length,
    loansActive: (loans ?? []).filter((l) => l.status === 'active').length,
    loansInArrears: loansInArrearsSet.size,
    loansLiquidated: (loans ?? []).filter((l) => l.status === 'liquidated').length,
    pendingBalance,
    totalPaid,
    recentActivity,
  }
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