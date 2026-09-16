import { supabase } from '@/lib/supabaseClient'

export interface ContractContent {
  organization: {
    commercial_name: string
    legal_name: string | null
    tax_id: string | null
    address: string | null
    phone: string | null
    email: string | null
  }
  client: {
    full_name: string
    identification: string | null
    phone: string | null
    address: string | null
  }
  loan: {
    loan_number: string
    principal: number
    interest_rate: number
    interest_modality: string
    term_months: number
    disbursement_date: string
    first_payment_date: string
    payment_day: number
    grace_days: number
    late_fee_rate: number
  }
}

export interface Contract {
  id: string
  loan_id: string
  contract_number: string
  version: number
  content: ContractContent
  status: string
  generated_at: string
  loans?: { loan_number: string; clients?: { full_name: string } }
}

// Genera un nuevo contrato para el préstamo (se llama justo después de
// createLoan() desde el frontend — create_loan() en sí no genera el contrato,
// para no volver a tocar esa función ya validada).
export async function generateContract(loanId: string): Promise<Contract> {
  const { data, error } = await supabase.rpc('generate_contract', { p_loan_id: loanId })
  if (error) throw error
  return data as unknown as Contract
}

export async function getContractsByLoan(loanId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('loan_id', loanId)
    .order('version', { ascending: false })
  if (error) throw error
  return data as unknown as Contract[]
}

export async function getContract(id: string): Promise<Contract> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*, loans(loan_number, clients(full_name))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as Contract
}

export async function getAllContracts(limit = 50): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*, loans(loan_number, clients(full_name))')
    .order('generated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as unknown as Contract[]
}