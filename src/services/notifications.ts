import { supabase } from '@/lib/supabaseClient'

export interface Notification {
  id: string
  type: 'vencido' | 'proximo' | 'promesa_vencida' | 'promesa_hoy'
  title: string
  subtitle: string
  to: string
  timestamp: string
}

function formatCOP(v: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
}

// No existe una tabla de notificaciones propia todavía (eso implicaría marcar
// leído/no leído, preferencias, etc. — una fase aparte). Esto arma una
// campana funcional con datos 100% reales: cuotas ya vencidas, cuotas que
// vencen mañana, y promesas de pago vencidas o que vencen hoy.
export async function getNotifications(): Promise<Notification[]> {
  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = tomorrow.toISOString().slice(0, 10)

  const [overdueResult, dueTomorrowResult, promisesResult] = await Promise.all([
    supabase
      .from('installments')
      .select('id, loan_id, capital, interest, capital_paid, interest_paid, loans(loan_number, clients(full_name))')
      .eq('status', 'overdue')
      .limit(5),
    supabase
      .from('installments')
      .select('id, loan_id, capital, interest, loans(loan_number, clients(full_name))')
      .eq('status', 'pending')
      .eq('due_date', tomorrowISO)
      .limit(5),
    supabase
      .from('payment_promises')
      .select('id, loan_id, promised_date, promised_amount, status, loans(loan_number, clients(full_name))')
      .eq('status', 'pending')
      .lte('promised_date', tomorrowISO)
      .limit(5),
  ])

  const notifications: Notification[] = []

  for (const i of (overdueResult.data ?? []) as any[]) {
    const monto = Math.max(i.capital - i.capital_paid, 0) + Math.max(i.interest - i.interest_paid, 0)
    notifications.push({
      id: `venc-${i.id}`,
      type: 'vencido',
      title: `Pago vencido — ${i.loans?.clients?.full_name ?? ''}`,
      subtitle: `${i.loans?.loan_number ?? ''} · ${formatCOP(monto)}`,
      to: `/prestamos/${i.loan_id}`,
      timestamp: todayISO,
    })
  }

  for (const i of (dueTomorrowResult.data ?? []) as any[]) {
    notifications.push({
      id: `prox-${i.id}`,
      type: 'proximo',
      title: `Vence mañana — ${i.loans?.clients?.full_name ?? ''}`,
      subtitle: `${i.loans?.loan_number ?? ''} · ${formatCOP(i.capital + i.interest)}`,
      to: `/prestamos/${i.loan_id}`,
      timestamp: todayISO,
    })
  }

  for (const p of (promisesResult.data ?? []) as any[]) {
    const isToday = p.promised_date === todayISO
    notifications.push({
      id: `prom-${p.id}`,
      type: isToday ? 'promesa_hoy' : 'promesa_vencida',
      title: `${isToday ? 'Promesa de pago hoy' : 'Promesa de pago vencida'} — ${p.loans?.clients?.full_name ?? ''}`,
      subtitle: `${p.loans?.loan_number ?? ''} · ${formatCOP(p.promised_amount)}`,
      to: `/cobranza?tab=promesas`,
      timestamp: p.promised_date,
    })
  }

  return notifications
}