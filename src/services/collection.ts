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