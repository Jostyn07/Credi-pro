import { supabase } from '@/lib/supabaseClient'

export type InterestModality = 'saldo_pendiente' | 'capital_inicial' | 'fijo'
export type PaymentFrequency = 'semanal' | 'quincenal' | 'mensual'
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
  notes: string | null
  created_at: string
  clients?: { full_name: string; identification: string | null }
}

export interface LoanConditions {
  loan_id: string
  principal: number
  interest_rate: number
  interest_modality: InterestModality
  payment_frequency: PaymentFrequency
  term_installments: number
  disbursement_date: string
  first_payment_date: string
  payment_day: number | null
  biweekly_day_1: number | null
  biweekly_day_2: number | null
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
  // La tasa (interestRate) SIEMPRE es por período: si frequency es
  // 'semanal', es tasa semanal; si es 'quincenal', tasa quincenal; si es
  // 'mensual', tasa mensual. No hay conversión automática entre frecuencias.
  frequency: PaymentFrequency
  // Número de cuotas -- reemplaza al antiguo termMonths, vale para las 3 frecuencias.
  termInstallments: number
  disbursementDate: string
  firstPaymentDate: string
<<<<<<< HEAD
  // Solo aplica a frecuencia 'mensual' (día del mes). En 'semanal' el día
  // de la semana lo fija firstPaymentDate; en 'quincenal' se usan
  // biweeklyDay1/biweeklyDay2 en su lugar.
  paymentDay?: number
  // Obligatorios solo si frequency === 'quincenal'.
  biweeklyDay1?: number
  biweeklyDay2?: number
=======
  paymentDay: number
>>>>>>> a2d79fc1492d8e3ac62b57b5f18cd17ade2299c5
  accountId: string
  graceDays?: number
  lateFeeRate?: number
  disbursementMethod?: string
  notes?: string
}

// Un borrador aún no se desembolsa, así que no exige cuenta de caja todavía
// (esa decisión se toma cuando el préstamo pasa a activo de verdad).
export type SaveLoanDraftInput = Omit<CreateLoanInput, 'accountId'>
<<<<<<< HEAD

=======
>>>>>>> a2d79fc1492d8e3ac62b57b5f18cd17ade2299c5
// Vista previa del calendario SIN crear el préstamo — usada en el wizard
export async function previewAmortization(
  principal: number,
  interestRate: number,
  modality: InterestModality,
  frequency: PaymentFrequency,
  termInstallments: number,
  firstPaymentDate: string,
  biweeklyDay1?: number | null,
  biweeklyDay2?: number | null,
): Promise<AmortizationRow[]> {
  const { data, error } = await supabase.rpc('preview_amortization', {
    p_principal: principal,
    p_interest_rate: interestRate,
    p_modality: modality,
    p_frequency: frequency,
    p_term_installments: termInstallments,
    p_first_payment_date: firstPaymentDate,
    p_biweekly_day_1: biweeklyDay1 ?? null,
    p_biweekly_day_2: biweeklyDay2 ?? null,
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
    p_frequency: input.frequency,
    p_term_installments: input.termInstallments,
    p_disbursement_date: input.disbursementDate,
    p_first_payment_date: input.firstPaymentDate,
<<<<<<< HEAD
    p_payment_day: input.paymentDay ?? null,
=======
    p_payment_day: input.paymentDay,
>>>>>>> a2d79fc1492d8e3ac62b57b5f18cd17ade2299c5
    p_account_id: input.accountId,
    p_grace_days: input.graceDays ?? 0,
    p_late_fee_rate: input.lateFeeRate ?? 0,
    p_disbursement_method: input.disbursementMethod ?? null,
    p_notes: input.notes ?? null,
    p_biweekly_day_1: input.biweeklyDay1 ?? null,
    p_biweekly_day_2: input.biweeklyDay2 ?? null,
  })
  if (error) throw error
  return data as unknown as Loan
}

// Guarda el préstamo con estado 'draft': cliente + condiciones, sin
<<<<<<< HEAD
// desembolso ni cuotas todavía. Requiere la migración 0010_payment_frequency.sql.
=======
// desembolso ni cuotas todavía. Requiere crear la función save_loan_draft()
// en Supabase, la migración 0009_loan_drafts.sql.
>>>>>>> a2d79fc1492d8e3ac62b57b5f18cd17ade2299c5
export async function saveLoanDraft(input: SaveLoanDraftInput): Promise<Loan> {
  const { data, error } = await supabase.rpc('save_loan_draft', {
    p_client_id: input.clientId,
    p_principal: input.principal,
    p_interest_rate: input.interestRate,
    p_interest_modality: input.interestModality,
    p_frequency: input.frequency,
    p_term_installments: input.termInstallments,
    p_disbursement_date: input.disbursementDate,
    p_first_payment_date: input.firstPaymentDate,
    p_payment_day: input.paymentDay ?? null,
    p_grace_days: input.graceDays ?? 0,
    p_late_fee_rate: input.lateFeeRate ?? 0,
    p_notes: input.notes ?? null,
    p_biweekly_day_1: input.biweeklyDay1 ?? null,
    p_biweekly_day_2: input.biweeklyDay2 ?? null,
  })
  if (error) throw error
  return data as unknown as Loan
}

// Aprueba un préstamo en borrador: exige cuenta de caja, genera el
// desembolso, el movimiento de caja y las cuotas — recién ahí queda 'active'.
export async function activateLoanDraft(loanId: string, accountId: string, disbursementMethod?: string): Promise<Loan> {
  const { data, error } = await supabase.rpc('activate_loan_draft', {
    p_loan_id: loanId,
    p_account_id: accountId,
    p_disbursement_method: disbursementMethod ?? null,
  })
  if (error) throw error
  return data as unknown as Loan
}

// Aprueba un préstamo en borrador: exige cuenta de caja, genera el
// desembolso, el movimiento de caja y las cuotas — recién ahí queda 'active'.
export async function activateLoanDraft(loanId: string, accountId: string, disbursementMethod?: string): Promise<Loan> {
  const { data, error } = await supabase.rpc('activate_loan_draft', {
    p_loan_id: loanId,
    p_account_id: accountId,
    p_disbursement_method: disbursementMethod ?? null,
  })
  if (error) throw error
  return data as unknown as Loan
}

export async function getLoans(): Promise<Loan[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*, clients(full_name, identification)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as Loan[]
}

export async function getLoansByClient(clientId: string): Promise<Loan[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*, clients(full_name, identification)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as Loan[]
}

export async function getLoan(id: string): Promise<Loan> {
  const { data, error } = await supabase.from('loans').select('*, clients(full_name, identification)').eq('id', id).single()
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