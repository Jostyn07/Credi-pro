import { supabase } from '@/lib/supabaseClient'
import { getInstallmentsByRange } from '@/services/calendar'
import { getPaymentsByDateRange, type Payment } from '@/services/payments'

export type PortfolioStatus = 'vigente' | 'en_mora' | 'en_gracia' | 'liquidado'

export interface PortfolioRow {
  loanId: string
  loanNumber: string
  clientName: string
  loansCount: number // cuántos préstamos tiene ese cliente en total
  originalAmount: number
  currentBalance: number
  daysOverdue: number
  status: PortfolioStatus
  registeredBy: string | null
}

export interface PortfolioSummary {
  totalCartera: number
  carteraVigente: number
  carteraMora: number
  carteraGracia: number
}

// Trae toda la cartera activa/liquidada con su estado real, calculado igual
// que en Cobranza (grace_days por préstamo, no un dato inventado).
export async function getPortfolioReport(asOfDate: string): Promise<{
  rows: PortfolioRow[]
  summary: PortfolioSummary
  topClients: { clientName: string; balance: number }[]
}> {
  const { data: loansRaw, error } = await supabase
    .from('loans')
    .select(
      'id, loan_number, status, client_id, created_by, clients(full_name), loan_conditions(principal, grace_days), profiles(full_name)',
    )
    .lte('created_at', `${asOfDate}T23:59:59`)
  if (error) throw error

  const loans = (loansRaw ?? []) as any[]
  const loanIds = loans.map((l) => l.id)
  const loanCountByClient = new Map<string, number>()
  for (const l of loans) loanCountByClient.set(l.client_id, (loanCountByClient.get(l.client_id) ?? 0) + 1)

  if (loanIds.length === 0) {
    return { rows: [], summary: { totalCartera: 0, carteraVigente: 0, carteraMora: 0, carteraGracia: 0 }, topClients: [] }
  }

  const { data: installmentsRaw } = await supabase
    .from('installments')
    .select('loan_id, due_date, capital, interest, capital_paid, interest_paid, status')
    .in('loan_id', loanIds)
    .lte('due_date', asOfDate)

  const installmentsByLoan = new Map<string, any[]>()
  for (const i of (installmentsRaw ?? []) as any[]) {
    const list = installmentsByLoan.get(i.loan_id) ?? []
    list.push(i)
    installmentsByLoan.set(i.loan_id, list)
  }

  const today = new Date(asOfDate)
  const rows: PortfolioRow[] = loans.map((l) => {
    const installments = installmentsByLoan.get(l.id) ?? []
    const pending = installments.filter((i) => i.status !== 'paid')
    const currentBalance = pending.reduce(
      (s, i) => s + Math.max(i.capital - i.capital_paid, 0) + Math.max(i.interest - i.interest_paid, 0),
      0,
    )
    const maxDaysOverdue = pending.reduce((max, i) => {
      const days = Math.round((today.getTime() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24))
      return Math.max(max, days)
    }, 0)
    const graceDays = l.loan_conditions?.grace_days ?? 0

    let status: PortfolioStatus = 'vigente'
    if (l.status === 'liquidated') status = 'liquidado'
    else if (maxDaysOverdue > graceDays) status = 'en_mora'
    else if (maxDaysOverdue > 0) status = 'en_gracia'

    return {
      loanId: l.id,
      loanNumber: l.loan_number,
      clientName: l.clients?.full_name ?? '—',
      loansCount: loanCountByClient.get(l.client_id) ?? 1,
      originalAmount: Number(l.loan_conditions?.principal ?? 0),
      currentBalance,
      daysOverdue: maxDaysOverdue,
      status,
      registeredBy: l.profiles?.full_name ?? null,
    }
  })

  const summary = rows.reduce(
    (acc, r) => {
      acc.totalCartera += r.currentBalance
      if (r.status === 'vigente') acc.carteraVigente += r.currentBalance
      if (r.status === 'en_mora') acc.carteraMora += r.currentBalance
      if (r.status === 'en_gracia') acc.carteraGracia += r.currentBalance
      return acc
    },
    { totalCartera: 0, carteraVigente: 0, carteraMora: 0, carteraGracia: 0 },
  )

  const balanceByClient = new Map<string, number>()
  for (const r of rows) balanceByClient.set(r.clientName, (balanceByClient.get(r.clientName) ?? 0) + r.currentBalance)
  const topClients = Array.from(balanceByClient.entries())
    .map(([clientName, balance]) => ({ clientName, balance }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)

  return { rows, summary, topClients }
}

export interface MonthlyEvolutionPoint {
  month: string
  programado: number
  recibido: number
}

// No hay ninguna tabla de snapshots históricos de cartera -- en vez de
// inventar una "evolución del saldo", esto muestra lo que sí es real y
// verificable mes a mes: cuánto se programó cobrar vs. cuánto se recibió de
// verdad, usando las mismas fuentes que ya usa el Calendario.
export async function getMonthlyEvolution(months = 6): Promise<MonthlyEvolutionPoint[]> {
  const points: MonthlyEvolutionPoint[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const startISO = start.toISOString().slice(0, 10)
    const endISO = end.toISOString().slice(0, 10)
    const [installments, payments] = await Promise.all([
      getInstallmentsByRange(startISO, endISO),
      getPaymentsByDateRange(startISO, endISO),
    ])
    points.push({
      month: start.toLocaleDateString('es-CO', { month: 'short' }),
      programado: installments.reduce((s, i) => s + i.capital + i.interest, 0),
      recibido: payments.reduce((s, p) => s + p.amount, 0),
    })
  }
  return points
}

export interface PaymentsReportRow extends Payment {
  clientName: string
  loanNumber: string
  registeredByName: string | null
}

export interface PaymentsSummary {
  total: number
  count: number
  average: number
  uniqueClients: number
}

export async function getPaymentsReport(
  from: string,
  to: string,
): Promise<{
  rows: PaymentsReportRow[]
  summary: PaymentsSummary
  byDay: { day: string; amount: number }[]
  byMethod: { method: string; amount: number }[]
  byType: { type: string; amount: number }[]
}> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, loans(loan_number, client_id, clients(full_name)), profiles(full_name)')
    .gte('payment_date', from)
    .lte('payment_date', to)
    .order('payment_date', { ascending: false })
  if (error) throw error

  const raw = (data ?? []) as any[]
  const rows: PaymentsReportRow[] = raw.map((p) => ({
    ...p,
    clientName: p.loans?.clients?.full_name ?? '—',
    loanNumber: p.loans?.loan_number ?? '—',
    registeredByName: p.profiles?.full_name ?? null,
  }))

  const uniqueClients = new Set(raw.map((p) => p.loans?.client_id).filter(Boolean)).size
  const total = rows.reduce((s, p) => s + p.amount, 0)
  const summary: PaymentsSummary = {
    total,
    count: rows.length,
    average: rows.length > 0 ? total / rows.length : 0,
    uniqueClients,
  }

  const dayMap = new Map<string, number>()
  for (const p of rows) dayMap.set(p.payment_date, (dayMap.get(p.payment_date) ?? 0) + p.amount)
  const byDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, amount]) => ({ day, amount }))

  const methodMap = new Map<string, number>()
  for (const p of rows) {
    const m = p.payment_method ?? 'Sin especificar'
    methodMap.set(m, (methodMap.get(m) ?? 0) + p.amount)
  }
  const byMethod = Array.from(methodMap.entries()).map(([method, amount]) => ({ method, amount }))

  // "Pagos por estado" del mockup no aplica: payments no tiene una columna de
  // estado (confirmado/cancelado) -- lo real y equivalente que sí existe es
  // is_liquidation (pago normal vs. liquidación total).
  const byType = [
    { type: 'Pago normal', amount: rows.filter((p) => !p.is_liquidation).reduce((s, p) => s + p.amount, 0) },
    { type: 'Liquidación', amount: rows.filter((p) => p.is_liquidation).reduce((s, p) => s + p.amount, 0) },
  ]

  return { rows, summary, byDay, byMethod, byType }
}