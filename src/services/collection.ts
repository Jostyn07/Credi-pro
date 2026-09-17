import { supabase } from '@/lib/supabaseClient'

export interface CollectionAction {
  id: string
  client_id: string
  loan_id: string | null
  action_type: string
  result: string
  notes: string | null
  action_date: string
  clients?: { full_name: string }
}

export interface PaymentPromise {
  id: string
  loan_id: string
  promised_date: string
  promised_amount: number
  status: 'pending' | 'kept' | 'broken'
  notes: string | null
  loans?: { loan_number: string; clients?: { full_name: string } }
}

export async function getCollectionActions(clientId?: string, loanId?: string): Promise<CollectionAction[]> {
  let query = supabase
    .from('collection_actions')
    .select('*, clients(full_name)')
    .order('action_date', { ascending: false })
  if (clientId) query = query.eq('client_id', clientId)
  if (loanId) query = query.eq('loan_id', loanId)
  const { data, error } = await query
  if (error) throw error
  return data as unknown as CollectionAction[]
}

export async function registerCollectionAction(input: {
  clientId: string
  loanId?: string
  actionType: string
  result: string
  notes?: string
  actionDate?: string
  organizationId: string
}): Promise<CollectionAction> {
  const { data, error } = await supabase
    .from('collection_actions')
    .insert({
      client_id: input.clientId,
      loan_id: input.loanId ?? null,
      action_type: input.actionType,
      result: input.result,
      notes: input.notes ?? null,
      action_date: input.actionDate ?? new Date().toISOString().slice(0, 10),
      organization_id: input.organizationId,
    })
    .select()
    .single()
  if (error) throw error
  return data as unknown as CollectionAction
}

export interface CollectionRow {
  clientId: string
  clientName: string
  clientIdentification: string | null
  loanId: string
  loanNumber: string
  estado: 'en_mora' | 'en_gracia' | 'por_vencer'
  diasAtraso: number // negativo = días que faltan (por_vencer)
  monto: number
  ultimaGestion: string | null
}

// Worklist unificado para "Gestión de cobranza": junta cuotas vencidas
// (separando "en mora" de "en gracia" según loan_conditions.grace_days, que
// hoy no se usa en ningún otro cálculo del backend) con las que vencen en
// los próximos 7 días. No es un solo query porque son tres fuentes distintas
// (installments overdue, installments próximos, loan_conditions.grace_days)
// que no comparten una vista ya armada.
export async function getCollectionWorklist(): Promise<CollectionRow[]> {
  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)
  const in7 = new Date(today)
  in7.setDate(in7.getDate() + 7)
  const in7ISO = in7.toISOString().slice(0, 10)

  const [overdueResult, upcomingResult] = await Promise.all([
    supabase
      .from('installments')
      .select('id, loan_id, due_date, capital, interest, capital_paid, interest_paid, loans(loan_number, client_id, clients(full_name, identification))')
      .eq('status', 'overdue'),
    supabase
      .from('installments')
      .select('id, loan_id, due_date, capital, interest, capital_paid, interest_paid, loans(loan_number, client_id, clients(full_name, identification))')
      .eq('status', 'pending')
      .gte('due_date', todayISO)
      .lte('due_date', in7ISO),
  ])

  const overdue = (overdueResult.data ?? []) as any[]
  const upcoming = (upcomingResult.data ?? []) as any[]
  const loanIds = Array.from(new Set([...overdue, ...upcoming].map((i) => i.loan_id)))
  if (loanIds.length === 0) return []

  const [conditionsResult, actionsResult] = await Promise.all([
    supabase.from('loan_conditions').select('loan_id, grace_days').in('loan_id', loanIds),
    supabase
      .from('collection_actions')
      .select('loan_id, action_date')
      .in('loan_id', loanIds)
      .order('action_date', { ascending: false }),
  ])

  const graceByLoan = new Map<string, number>()
  for (const c of (conditionsResult.data ?? []) as any[]) graceByLoan.set(c.loan_id, c.grace_days ?? 0)

  const lastActionByLoan = new Map<string, string>()
  for (const a of (actionsResult.data ?? []) as any[]) {
    if (!lastActionByLoan.has(a.loan_id)) lastActionByLoan.set(a.loan_id, a.action_date)
  }

  const rows: CollectionRow[] = []

  for (const i of overdue) {
    const daysOverdue = Math.round((today.getTime() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24))
    const graceDays = graceByLoan.get(i.loan_id) ?? 0
    rows.push({
      clientId: i.loans?.client_id ?? '',
      clientName: i.loans?.clients?.full_name ?? '—',
      clientIdentification: i.loans?.clients?.identification ?? null,
      loanId: i.loan_id,
      loanNumber: i.loans?.loan_number ?? '—',
      estado: daysOverdue <= graceDays ? 'en_gracia' : 'en_mora',
      diasAtraso: daysOverdue,
      monto: Math.max(i.capital - i.capital_paid, 0) + Math.max(i.interest - i.interest_paid, 0),
      ultimaGestion: lastActionByLoan.get(i.loan_id) ?? null,
    })
  }

  for (const i of upcoming) {
    const daysUntil = Math.round((new Date(i.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    rows.push({
      clientId: i.loans?.client_id ?? '',
      clientName: i.loans?.clients?.full_name ?? '—',
      clientIdentification: i.loans?.clients?.identification ?? null,
      loanId: i.loan_id,
      loanNumber: i.loans?.loan_number ?? '—',
      estado: 'por_vencer',
      diasAtraso: -daysUntil,
      monto: i.capital + i.interest,
      ultimaGestion: lastActionByLoan.get(i.loan_id) ?? null,
    })
  }

  return rows.sort((a, b) => b.diasAtraso - a.diasAtraso)
}

export async function getPaymentPromises(loanId?: string): Promise<PaymentPromise[]> {
  let query = supabase
    .from('payment_promises')
    .select('*, loans(loan_number, clients(full_name))')
    .order('promised_date', { ascending: true })
  if (loanId) query = query.eq('loan_id', loanId)
  const { data, error } = await query
  if (error) throw error
  return data as unknown as PaymentPromise[]
}

export async function registerPaymentPromise(input: {
  loanId: string
  promisedDate: string
  promisedAmount: number
  notes?: string
  organizationId: string
}): Promise<PaymentPromise> {
  const { data, error } = await supabase
    .from('payment_promises')
    .insert({
      loan_id: input.loanId,
      promised_date: input.promisedDate,
      promised_amount: input.promisedAmount,
      notes: input.notes ?? null,
      organization_id: input.organizationId,
    })
    .select()
    .single()
  if (error) throw error
  return data as unknown as PaymentPromise
}

export async function updatePaymentPromiseStatus(
  id: string,
  status: 'kept' | 'broken',
): Promise<void> {
  const { error } = await supabase.from('payment_promises').update({ status }).eq('id', id)
  if (error) throw error
}