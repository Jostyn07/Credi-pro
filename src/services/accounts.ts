import { supabase } from '@/lib/supabaseClient'

export interface Account {
  id: string
  organization_id: string
  name: string
  type: 'cash' | 'bank' | 'wallet'
  is_active: boolean
}

export interface CashMovement {
  id: string
  account_id: string
  movement_type: string
  amount: number
  description: string | null
  movement_date: string
  loan_id: string | null
  payment_id: string | null
  created_at: string
  accounts?: { name: string }
}

export interface Expense {
  id: string
  account_id: string
  category: string | null
  amount: number
  description: string | null
  expense_date: string
}

export interface CashClosure {
  id: string
  account_id: string
  closure_date: string
  opening_balance: number
  total_income: number
  total_expense: number
  closing_balance: number
  accounts?: { name: string }
}

export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from('accounts').select('*').eq('is_active', true).order('name')
  if (error) throw error
  return data as unknown as Account[]
}

export async function createAccount(name: string, type: Account['type'], organizationId: string): Promise<Account> {
  const { data, error } = await supabase
    .from('accounts')
    .insert({ name, type, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data as unknown as Account
}

export async function getAccountBalance(accountId: string, asOfDate?: string): Promise<number> {
  const { data, error } = await supabase.rpc('account_balance_asof', {
    p_account_id: accountId,
    p_as_of_date: asOfDate ?? new Date().toISOString().slice(0, 10),
  })
  if (error) throw error
  return Number(data)
}

export async function registerCashMovement(input: {
  accountId: string
  movementType: string
  amount: number
  description?: string
  movementDate?: string
}): Promise<CashMovement> {
  const { data, error } = await supabase.rpc('register_cash_movement', {
    p_account_id: input.accountId,
    p_movement_type: input.movementType,
    p_amount: input.amount,
    p_description: input.description ?? null,
    p_movement_date: input.movementDate ?? new Date().toISOString().slice(0, 10),
  })
  if (error) throw error
  return data as unknown as CashMovement
}

export async function registerCashTransfer(input: {
  fromAccountId: string
  toAccountId: string
  amount: number
  description?: string
  movementDate?: string
}): Promise<void> {
  const { error } = await supabase.rpc('register_cash_transfer', {
    p_from_account_id: input.fromAccountId,
    p_to_account_id: input.toAccountId,
    p_amount: input.amount,
    p_description: input.description ?? null,
    p_movement_date: input.movementDate ?? new Date().toISOString().slice(0, 10),
  })
  if (error) throw error
}

export async function registerExpense(input: {
  accountId: string
  category: string
  amount: number
  description?: string
  expenseDate?: string
}): Promise<Expense> {
  const { data, error } = await supabase.rpc('register_expense', {
    p_account_id: input.accountId,
    p_category: input.category,
    p_amount: input.amount,
    p_description: input.description ?? null,
    p_expense_date: input.expenseDate ?? new Date().toISOString().slice(0, 10),
  })
  if (error) throw error
  return data as unknown as Expense
}

export async function closeCashRegister(accountId: string, closureDate?: string): Promise<CashClosure> {
  const { data, error } = await supabase.rpc('close_cash_register', {
    p_account_id: accountId,
    p_closure_date: closureDate ?? new Date().toISOString().slice(0, 10),
  })
  if (error) throw error
  return data as unknown as CashClosure
}

export async function getCashMovements(limit = 50): Promise<CashMovement[]> {
  const { data, error } = await supabase
    .from('cash_movements')
    .select('*, accounts(name)')
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as unknown as CashMovement[]
}

export async function getExpenses(limit = 50): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as unknown as Expense[]
}

export async function getCashClosures(limit = 30): Promise<CashClosure[]> {
  const { data, error } = await supabase
    .from('cash_closures')
    .select('*, accounts(name)')
    .order('closure_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as unknown as CashClosure[]
}