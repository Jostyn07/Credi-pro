import { supabase } from '@/lib/supabaseClient'

export interface Payment {
  id: string
  loan_id: string
  organization_id: string
  payment_date: string
  amount: number
  payment_method: string | null
  reference: string | null
  notes: string | null
  is_liquidation: boolean
  created_at: string
  loans?: { loan_number: string; clients?: { full_name: string } }
}

// Una cuenta con su monto — para pagos divididos entre varias cajas
// (ej. $60.000 efectivo + $40.000 Nequi). La suma debe ser exacta.
export interface AccountSplit {
  accountId: string
  amount: number
}

export interface RegisterPaymentInput {
  loanId: string
  amount: number
  paymentDate?: string
  paymentMethod?: string
  reference?: string
  notes?: string
  prepaymentStrategy?: PrepaymentStrategy
  accountSplits: AccountSplit[]
}

export type PrepaymentStrategy = 'none' | 'reduce_term' | 'reduce_installment'

export interface PaymentAllocationPreview {
  late_fee_amount: number
  interest_amount: number
  capital_amount: number
  prepayment_amount: number
}

function toSplitsJson(splits: AccountSplit[]) {
  return splits.map((s) => ({ account_id: s.accountId, amount: s.amount }))
}

// Calcula cómo se distribuiría un pago ANTES de registrarlo — se usa para
// detectar si hay abono anticipado a capital y, de haberlo, preguntarle al
// prestamista qué hacer con las cuotas futuras antes de confirmar.
export async function previewPaymentAllocation(
  loanId: string,
  amount: number,
  paymentDate?: string,
): Promise<PaymentAllocationPreview> {
  const { data, error } = await supabase.rpc('preview_payment_allocation', {
    p_loan_id: loanId,
    p_amount: amount,
    p_payment_date: paymentDate ?? new Date().toISOString().slice(0, 10),
  })
  if (error) throw error
  const row = (data as unknown as PaymentAllocationPreview[])[0]
  return row
}

// Código que devuelve register_payment cuando hay abono anticipado y no se
// mandó una estrategia — el frontend lo detecta para mostrar el diálogo de elección.
export const PREPAYMENT_STRATEGY_REQUIRED_PREFIX = 'PREPAYMENT_STRATEGY_REQUIRED:'

// La distribución entre cuentas ahora es obligatoria (ver migración
// 0008_caja_obligatoria.sql) — un pago siempre debe decir de dónde "entra"
// el dinero, aunque sea a una sola cuenta.
export async function registerPayment(input: RegisterPaymentInput): Promise<Payment> {
  const { data, error } = await supabase.rpc('register_payment', {
    p_loan_id: input.loanId,
    p_amount: input.amount,
    p_payment_date: input.paymentDate ?? new Date().toISOString().slice(0, 10),
    p_payment_method: input.paymentMethod ?? null,
    p_reference: input.reference ?? null,
    p_notes: input.notes ?? null,
    p_prepayment_strategy: input.prepaymentStrategy ?? null,
    p_account_splits: toSplitsJson(input.accountSplits),
  })
  if (error) throw error
  return data as unknown as Payment
}

export interface LiquidateLoanInput {
  loanId: string
  paymentDate?: string
  paymentMethod?: string
  reference?: string
  accountSplits: AccountSplit[]
}

export async function liquidateLoan(input: LiquidateLoanInput): Promise<Payment> {
  const { data, error } = await supabase.rpc('liquidate_loan', {
    p_loan_id: input.loanId,
    p_payment_date: input.paymentDate ?? new Date().toISOString().slice(0, 10),
    p_payment_method: input.paymentMethod ?? null,
    p_reference: input.reference ?? null,
    p_account_splits: toSplitsJson(input.accountSplits),
  })
  if (error) throw error
  return data as unknown as Payment
}

export async function getPaymentsByLoan(loanId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('loan_id', loanId)
    .order('payment_date', { ascending: false })
  if (error) throw error
  return data as unknown as Payment[]
}

// payments no tiene client_id directo -- se llega por loans.client_id.
export async function getPaymentsByClient(clientId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, loans!inner(loan_number, client_id)')
    .eq('loans.client_id', clientId)
    .order('payment_date', { ascending: false })
  if (error) throw error
  return data as unknown as Payment[]
}

export async function getRecentPayments(limit = 10): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, loans(loan_number, clients(full_name))')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as unknown as Payment[]
}

// Para el "Resumen del mes" del Calendario: pagos reales recibidos en el
// rango, no cuotas -- un pago puede cubrir varias cuotas o solo una parte.
export async function getPaymentsByDateRange(startDate: string, endDate: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate)
  if (error) throw error
  return data as unknown as Payment[]
}