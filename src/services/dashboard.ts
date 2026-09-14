import { supabase } from '@/lib/supabaseClient'

export interface DashboardStats {
  totalClients: number
  activeLoans: number
  capitalLent: number
  capitalPending: number
  overdueBalance: number
  upcomingPayments: { loanNumber: string; clientName: string; dueDate: string; total: number }[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [{ count: totalClients }, loansResult, installmentsResult] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('loans').select('id, status'),
    supabase
      .from('installments')
      .select('id, loan_id, due_date, capital, interest, capital_paid, interest_paid, status, loans(loan_number, clients(full_name))'),
  ])

  const loans = (loansResult.data ?? []) as unknown as { id: string; status: string }[]
  const installments = (installmentsResult.data ?? []) as any[]

  const activeLoans = loans.filter((l) => l.status === 'active').length

  let capitalLent = 0
  let capitalPending = 0
  let overdueBalance = 0
  const upcoming: DashboardStats['upcomingPayments'] = []
  const today = new Date().toISOString().slice(0, 10)
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  for (const inst of installments) {
    capitalLent += Number(inst.capital)
    const pendingCapital = Number(inst.capital) - Number(inst.capital_paid)
    const pendingInterest = Number(inst.interest) - Number(inst.interest_paid)
    capitalPending += Math.max(pendingCapital, 0)

    if (inst.status === 'overdue') {
      overdueBalance += Math.max(pendingCapital + pendingInterest, 0)
    }
    if (inst.status !== 'paid' && inst.due_date >= today && inst.due_date <= in7Days) {
      upcoming.push({
        loanNumber: inst.loans?.loan_number ?? '',
        clientName: inst.loans?.clients?.full_name ?? '',
        dueDate: inst.due_date,
        total: Number(inst.capital) + Number(inst.interest),
      })
    }
  }

  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  return {
    totalClients: totalClients ?? 0,
    activeLoans,
    capitalLent,
    capitalPending,
    overdueBalance,
    upcomingPayments: upcoming.slice(0, 8),
  }
}