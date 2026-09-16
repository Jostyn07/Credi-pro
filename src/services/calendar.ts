import { supabase } from '@/lib/supabaseClient'

export interface CalendarInstallment {
  id: string
  loan_id: string
  number: number
  due_date: string
  capital: number
  interest: number
  capital_paid: number
  interest_paid: number
  status: string
  loans?: { loan_number: string; client_id?: string; clients?: { full_name: string; phone?: string } }
}

export async function getInstallmentsByRange(startDate: string, endDate: string): Promise<CalendarInstallment[]> {
  const { data, error } = await supabase
    .from('installments')
    .select('*, loans(loan_number, clients(full_name))')
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date')
  if (error) throw error
  return data as unknown as CalendarInstallment[]
}

export async function getOverdueInstallments(): Promise<CalendarInstallment[]> {
  const { data, error } = await supabase
    .from('installments')
    .select('*, loans(loan_number, client_id, clients(full_name, phone))')
    .eq('status', 'overdue')
    .order('due_date')
  if (error) throw error
  return data as unknown as CalendarInstallment[]
}