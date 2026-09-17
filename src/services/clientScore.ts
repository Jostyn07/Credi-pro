import { supabase } from '@/lib/supabaseClient'
import { getClientProfileSummary, getClientEvaluationMetrics } from '@/services/clients'
import { computeClientRisk } from '@/utils/clientRisk'

export interface ClientScoreSnapshot {
  id: string
  organization_id: string
  client_id: string
  score: number
  risk_level: 'sin_historial' | 'bajo' | 'medio' | 'alto'
  reasons: string[]
  computed_at: string
  clients?: { full_name: string; identification: string | null; phone: string | null }
}

// Mismo heurístico que ya usa el asistente de "Nuevo préstamo"
// (utils/clientRisk.ts) -- aquí simplemente se persiste como fila para tener
// historial real, en vez de recalcularse cada vez sin dejar rastro.
export async function generateClientScore(clientId: string, organizationId: string): Promise<ClientScoreSnapshot> {
  const [summary, metrics] = await Promise.all([
    getClientProfileSummary(clientId),
    getClientEvaluationMetrics(clientId),
  ])
  const risk = computeClientRisk(summary)

  const reasons: string[] = []
  if (summary.loansTotal === 0) {
    reasons.push('Cliente sin préstamos previos en el sistema')
  } else {
    reasons.push(`${summary.loansTotal} préstamo(s) registrados, ${summary.loansLiquidated} liquidado(s)`)
    if (metrics.onTimePct !== null) reasons.push(`${metrics.onTimePct}% de cuotas pagadas a tiempo`)
    if (metrics.avgDaysLate !== null && metrics.avgDaysLate > 0) {
      reasons.push(`${metrics.avgDaysLate} días de atraso promedio`)
    }
    reasons.push(summary.loansInArrears > 0 ? `${summary.loansInArrears} préstamo(s) en mora actualmente` : 'Sin mora actual')
  }

  const { data, error } = await supabase
    .from('client_score_snapshots')
    .insert({
      organization_id: organizationId,
      client_id: clientId,
      score: risk.level === 'sin_historial' ? 0 : risk.score,
      risk_level: risk.level,
      reasons,
    })
    .select()
    .single()
  if (error) throw error
  return data as unknown as ClientScoreSnapshot
}

export interface LatestScoreRow extends ClientScoreSnapshot {
  previousScore: number | null
}

// El score más reciente de cada cliente que ya tiene al menos un análisis,
// más el anterior a ese (para la flecha de tendencia). No incluye clientes
// sin ningún análisis todavía -- esos aparecen al usar "Generar análisis".
export async function getLatestScores(): Promise<LatestScoreRow[]> {
  const { data, error } = await supabase
    .from('client_score_snapshots')
    .select('*, clients(full_name, identification, phone)')
    .order('computed_at', { ascending: false })
    .limit(1000)
  if (error) throw error

  const rows = (data ?? []) as unknown as ClientScoreSnapshot[]
  const byClient = new Map<string, ClientScoreSnapshot[]>()
  for (const r of rows) {
    const list = byClient.get(r.client_id) ?? []
    list.push(r)
    byClient.set(r.client_id, list)
  }

  const result: LatestScoreRow[] = []
  for (const list of byClient.values()) {
    const [latest, previous] = list // ya vienen ordenados desc
    result.push({ ...latest, previousScore: previous?.score ?? null })
  }
  return result
}

export async function getScoreHistory(clientId: string): Promise<ClientScoreSnapshot[]> {
  const { data, error } = await supabase
    .from('client_score_snapshots')
    .select('*')
    .eq('client_id', clientId)
    .order('computed_at', { ascending: true })
  if (error) throw error
  return data as unknown as ClientScoreSnapshot[]
}