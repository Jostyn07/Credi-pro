import { supabase } from '@/lib/supabaseClient'

export interface SearchResult {
  type: 'cliente' | 'prestamo' | 'pago'
  id: string
  title: string
  subtitle: string
  to: string
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const [clientsResult, loansResult, paymentsResult] = await Promise.all([
    supabase
      .from('clients')
      .select('id, full_name, identification, phone')
      .or(`full_name.ilike.%${q}%,identification.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(5),
    supabase
      .from('loans')
      .select('id, loan_number, clients(full_name)')
      .ilike('loan_number', `%${q}%`)
      .limit(5),
    supabase
      .from('payments')
      .select('id, amount, payment_date, loan_id, loans(loan_number, clients(full_name))')
      .ilike('reference', `%${q}%`)
      .limit(5),
  ])

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

  const results: SearchResult[] = []

  for (const c of (clientsResult.data ?? []) as any[]) {
    results.push({
      type: 'cliente',
      id: c.id,
      title: c.full_name,
      subtitle: c.identification || c.phone || '',
      to: `/clientes/${c.id}`,
    })
  }
  for (const l of (loansResult.data ?? []) as any[]) {
    results.push({
      type: 'prestamo',
      id: l.id,
      title: l.loan_number,
      subtitle: l.clients?.full_name ?? '',
      to: `/prestamos/${l.id}`,
    })
  }
  for (const p of (paymentsResult.data ?? []) as any[]) {
    results.push({
      type: 'pago',
      id: p.id,
      title: formatCOP(Number(p.amount)),
      subtitle: `${p.loans?.clients?.full_name ?? ''} · ${p.loans?.loan_number ?? ''}`,
      to: `/prestamos/${p.loan_id}`,
    })
  }

  return results
}