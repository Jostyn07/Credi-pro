import { supabase } from '@/lib/supabaseClient'

export type InterestModality = 'saldo_pendiente' | 'capital_inicial' | 'fijo'
export type LoanStatus = 'draft' | 'active' | 'liquidated' | 'cancelled' | 'refinanced' | 'restructured'

export interface AmortizationRow {
  number: number
  due_date: string
  capital: number
  interest: number
  total: number
  balance: number
}

export interface Loan {
  id: string
  organization_id: string
  client_id: string
  loan_number: string
  status: LoanStatus
  created_at: string
  clients?: { full_name: string }
}

export interface LoanConditions {
  loan_id: string
  principal: number
  interest_rate: number
  interest_modality: InterestModality
  term_months: number
  disbursement_date: string
  first_payment_date: string
  payment_day: number
  grace_days: number
  late_fee_rate: number
}

export interface Installment {
  id: string
  loan_id: string
  number: number
  due_date: string
  capital: number
  interest: number
  total: number
  capital_paid: number
  interest_paid: number
  late_fee_paid: number
  status: 'pending' | 'partial' | 'paid' | 'overdue'
}

export interface CreateLoanInput {
  clientId: string
  principal: number
  interestRate: number
  interestModality: InterestModality
  termMonths: number
  disbursementDate: string
  firstPaymentDate: string
  paymentDay: number
  graceDays?: number
  lateFeeRate?: number
  disbursementMethod?: string
}

// Vista previa del calendario SIN crear el préstamo — usada en el wizard
export async function previewAmortization(
  principal: number,
  interestRate: number,
  modality: InterestModality,
  termMonths: number,
  firstPaymentDate: string,
): Promise<AmortizationRow[]> {
  const { data, error } = await supabase.rpc('preview_amortization', {
    p_principal: principal,
    p_interest_rate: interestRate,
    p_modality: modality,
    p_term_months: termMonths,
    p_first_payment_date: firstPaymentDate,
  })
  if (error) throw error
  return data as unknown as AmortizationRow[]
}

export async function createLoan(input: CreateLoanInput): Promise<Loan> {
  const { data, error } = await supabase.rpc('create_loan', {
    p_client_id: input.clientId,
    p_principal: input.principal,
    p_interest_rate: input.interestRate,
    p_interest_modality: input.interestModality,
    p_term_months: input.termMonths,
    p_disbursement_date: input.disbursementDate,
    p_first_payment_date: input.firstPaymentDate,
    p_payment_day: input.paymentDay,
    p_grace_days: input.graceDays ?? 0,
    p_late_fee_rate: input.lateFeeRate ?? 0,
    p_disbursement_method: input.disbursementMethod ?? null,
  })
  if (error) throw error
  return data as unknown as Loan
}

export async function getLoans(): Promise<Loan[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*, clients(full_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as Loan[]
}

export async function getLoan(id: string): Promise<Loan> {
  const { data, error } = await supabase.from('loans').select('*, clients(full_name)').eq('id', id).single()
  if (error) throw error
  return data as unknown as Loan
}

export async function getLoanConditions(loanId: string): Promise<LoanConditions> {
  const { data, error } = await supabase
    .from('loan_conditions')
    .select('*')
    .eq('loan_id', loanId)
    .single()
  if (error) throw error
  return data as unknown as LoanConditions
}

export async function getInstallments(loanId: string): Promise<Installment[]> {
  const { data, error } = await supabase
    .from('installments')
    .select('*')
    .eq('loan_id', loanId)
    .order('number')
  if (error) throw error
  return data as unknown as Installment[]
}