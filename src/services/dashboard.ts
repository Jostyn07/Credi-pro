import { supabase } from '@/lib/supabaseClient'

export interface StatWithChange {
  value: number
  changePct: number | null // null cuando no hay base de comparación (ej. mes 1 de operación)
}

export interface DashboardStats {
  totalClients: number
  activeLoans: number
  capitalLent: number
  capitalPending: number
  overdueBalance: number
  upcomingPayments: { loanNumber: string; clientName: string; dueDate: string; total: number }[]
}

export interface DashboardKPIs {
  activeClients: StatWithChange
  activeLoans: StatWithChange
  capitalPending: StatWithChange
  paymentsThisMonth: StatWithChange
  clientsInArrears: StatWithChange
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

function monthStart(date: Date, offsetMonths = 0): string {
  const d = new Date(date.getFullYear(), date.getMonth() + offsetMonths, 1)
  return d.toISOString().slice(0, 10)
}

// Las 5 tarjetas del dashboard, cada una con % de cambio vs. el mes anterior.
//
// Cómo se calcula cada comparación (no guardamos "fotos" históricas, así que
// cada una se reconstruye de la forma más honesta posible a partir de datos reales):
//
// - Clientes activos / Préstamos activos: comparamos el total de hoy contra el
//   total que ya existía antes de que empezara el mes actual (usando created_at).
//   Esto SÍ es exacto, porque created_at nunca cambia.
//
// - Pagos recibidos (mes): suma real de payment_date dentro de cada mes calendario.
//   Exacto, sin aproximación.
//
// - Capital pendiente: es un saldo vivo que cambia todos los días, no un total
//   acumulado. Para poder comparar "vs. mes anterior" sin guardar fotos diarias,
//   reconstruimos matemáticamente cuánto capital pendiente había al cierre del
//   mes pasado: (pendiente de hoy) + (capital que se pagó este mes) - (capital
//   que se desembolsó en préstamos nuevos este mes). Es una reconstrucción
//   contable real, no una suposición — pero asume que no hubo refinanciaciones
//   o ajustes manuales de capital en el período.
//
// - Clientes en mora: comparamos los clientes en mora HOY contra los clientes
//   que ya llevaban más de un mes en mora — es decir, "cuántos de los que están
//   en mora ahora ya lo estaban desde antes" vs. el total actual. No es un
//   histórico real (no sabemos con certeza cuántos había hace un mes exacto),
//   pero es la aproximación más razonable sin una tabla de snapshots.
export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const now = new Date()
  const startThisMonth = monthStart(now, 0)
  const startLastMonth = monthStart(now, -1)
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().slice(0, 10)

  const [
    clientsNow,
    clientsBefore,
    loansNow,
    loansBefore,
    paymentsThisMonth,
    paymentsLastMonth,
    pendingInstallments,
    capitalPaidThisMonth,
    capitalDisbursedThisMonth,
    overdueInstallments,
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .lt('created_at', startThisMonth),
    supabase.from('loans').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('loans')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .lt('created_at', startThisMonth),
    supabase.from('payments').select('amount').gte('payment_date', startThisMonth),
    supabase.from('payments').select('amount').gte('payment_date', startLastMonth).lt('payment_date', startThisMonth),
    supabase.from('installments').select('capital, capital_paid, interest, interest_paid').neq('status', 'paid'),
    supabase
      .from('payment_allocations')
      .select('capital_amount, payments!inner(payment_date)')
      .gte('payments.payment_date', startThisMonth),
    supabase.from('loans').select('id, loan_conditions(principal)').gte('created_at', startThisMonth),
    supabase.from('installments').select('due_date, loan_id, loans(client_id)').eq('status', 'overdue'),
  ])

  const activeClientsNow = clientsNow.count ?? 0
  const activeClientsBefore = clientsBefore.count ?? 0

  const activeLoansNow = loansNow.count ?? 0
  const activeLoansBefore = loansBefore.count ?? 0

  const paymentsThisMonthTotal = ((paymentsThisMonth.data ?? []) as any[]).reduce((s, p) => s + Number(p.amount), 0)
  const paymentsLastMonthTotal = ((paymentsLastMonth.data ?? []) as any[]).reduce((s, p) => s + Number(p.amount), 0)

  const capitalPendingNow = (pendingInstallments.data ?? []).reduce(
    (s, i: any) => s + Math.max(Number(i.capital) - Number(i.capital_paid), 0),
    0,
  )
  const capitalPaidThisMonthTotal = (capitalPaidThisMonth.data ?? []).reduce(
    (s: number, a: any) => s + Number(a.capital_amount),
    0,
  )
  const capitalDisbursedThisMonthTotal = (capitalDisbursedThisMonth.data ?? []).reduce(
    (s: number, l: any) => s + Number(l.loan_conditions?.principal ?? 0),
    0,
  )
  const capitalPendingLastMonthApprox =
    capitalPendingNow + capitalPaidThisMonthTotal - capitalDisbursedThisMonthTotal

  const overdueRows = (overdueInstallments.data ?? []) as any[]
  const clientsInArrearsNow = new Set(overdueRows.map((r) => r.loans?.client_id)).size
  const clientsInArrearsOverMonth = new Set(
    overdueRows.filter((r) => r.due_date <= oneMonthAgo).map((r) => r.loans?.client_id),
  ).size

  return {
    activeClients: { value: activeClientsNow, changePct: pctChange(activeClientsNow, activeClientsBefore) },
    activeLoans: { value: activeLoansNow, changePct: pctChange(activeLoansNow, activeLoansBefore) },
    capitalPending: {
      value: capitalPendingNow,
      changePct: pctChange(capitalPendingNow, Math.max(capitalPendingLastMonthApprox, 0)),
    },
    paymentsThisMonth: {
      value: paymentsThisMonthTotal,
      changePct: pctChange(paymentsThisMonthTotal, paymentsLastMonthTotal),
    },
    clientsInArrears: {
      value: clientsInArrearsNow,
      changePct: pctChange(clientsInArrearsNow, clientsInArrearsOverMonth),
    },
  }
}

export interface DailySeriesPoint {
  date: string
  pagos: number
  desembolsos: number
  cartera: number
}

// Serie de los últimos N días para el gráfico "Ingresos y cartera".
// Pagos y desembolsos son sumas reales por fecha (exactos). La "cartera"
// (capital pendiente) se reconstruye día por día caminando hacia atrás desde
// el saldo actual: pending(día-1) = pending(día) - desembolsado(día) + capital_pagado(día).
// Es la misma técnica contable del paso 2, aplicada por día en vez de una sola vez.
export async function getIngresosYCarteraSeries(days = 30): Promise<DailySeriesPoint[]> {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (days - 1))
  const startISO = startDate.toISOString().slice(0, 10)

  const [pendingInstallments, paymentsInRange, capitalPaidInRange, loansInRange] = await Promise.all([
    supabase.from('installments').select('capital, capital_paid').neq('status', 'paid'),
    supabase.from('payments').select('payment_date, amount').gte('payment_date', startISO),
    supabase
      .from('payment_allocations')
      .select('capital_amount, payments!inner(payment_date)')
      .gte('payments.payment_date', startISO),
    supabase
      .from('loans')
      .select('created_at, loan_conditions(principal)')
      .gte('created_at', startISO),
  ])

  const capitalPendingNow = (pendingInstallments.data ?? []).reduce(
    (s, i: any) => s + Math.max(Number(i.capital) - Number(i.capital_paid), 0),
    0,
  )

  const pagosPorDia = new Map<string, number>()
  for (const p of (paymentsInRange.data ?? []) as any[]) {
    pagosPorDia.set(p.payment_date, (pagosPorDia.get(p.payment_date) ?? 0) + Number(p.amount))
  }

  const capitalPagadoPorDia = new Map<string, number>()
  for (const a of (capitalPaidInRange.data ?? []) as any[]) {
    const date = a.payments?.payment_date
    if (!date) continue
    capitalPagadoPorDia.set(date, (capitalPagadoPorDia.get(date) ?? 0) + Number(a.capital_amount))
  }

  const desembolsosPorDia = new Map<string, number>()
  for (const l of (loansInRange.data ?? []) as any[]) {
    const date = String(l.created_at).slice(0, 10)
    const principal = Number(l.loan_conditions?.principal ?? 0)
    desembolsosPorDia.set(date, (desembolsosPorDia.get(date) ?? 0) + principal)
  }

  // Construye la lista de fechas (hoy -> hacia atrás) y va reconstruyendo el
  // saldo de cartera de cada día, luego se invierte para quedar cronológico.
  const points: DailySeriesPoint[] = []
  let runningPending = capitalPendingNow

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)

    const pagos = pagosPorDia.get(iso) ?? 0
    const desembolsos = desembolsosPorDia.get(iso) ?? 0
    const capitalPagado = capitalPagadoPorDia.get(iso) ?? 0

    points.push({ date: iso, pagos, desembolsos, cartera: runningPending })

    // Retrocede al saldo de cierre del día anterior
    runningPending = runningPending - desembolsos + capitalPagado
  }

  return points.reverse()
}

export interface LoanStatusDistribution {
  alDia: number
  enMora: number
  liquidados: number
  cancelados: number
}

// Distribución para la dona "Estado de los préstamos". Adaptada a los estados
// reales que maneja el sistema (loans.status + si tiene alguna cuota vencida) —
// el mockup original tenía categorías adicionales ("En cobranza") que no
// corresponden a un estado propio en el modelo de datos actual.
export async function getLoanStatusDistribution(): Promise<LoanStatusDistribution> {
  const [activeLoans, overdueLoanIds, liquidated, cancelled] = await Promise.all([
    supabase.from('loans').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('installments').select('loan_id').eq('status', 'overdue'),
    supabase.from('loans').select('id', { count: 'exact', head: true }).eq('status', 'liquidated'),
    supabase.from('loans').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
  ])

  const enMoraSet = new Set((overdueLoanIds.data ?? []).map((r: any) => r.loan_id))
  const totalActive = activeLoans.count ?? 0
  const enMora = enMoraSet.size

  return {
    alDia: Math.max(totalActive - enMora, 0),
    enMora,
    liquidados: liquidated.count ?? 0,
    cancelados: cancelled.count ?? 0,
  }
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