import type { ClientProfileSummary } from '@/services/clients'

export type RiskLevel = 'sin_historial' | 'bajo' | 'medio' | 'alto'

export interface ClientRisk {
  score: number // 0-100
  level: RiskLevel
  label: string
  tone: 'neutral' | 'success' | 'warning' | 'danger'
}

// IMPORTANTE: esto NO es un modelo de riesgo crediticio real (no hay buró, no
// hay históricos de mora por cuota, no hay scoring estadístico). Es una
// heurística simple calculada en el cliente a partir de lo que ya tenemos en
// ClientProfileSummary, siguiendo el mismo patrón del resto del código: nada
// se guarda aparte, todo se deriva de los datos reales en el momento.
//
// Reglas:
// - Cliente sin préstamos todavía -> "Sin historial" (no es ni bueno ni malo).
// - Cada préstamo en mora actualmente resta fuerte.
// - Cada préstamo liquidado sin problemas suma un poco.
// - El resultado se recorta entre 0 y 100.
export function computeClientRisk(summary: ClientProfileSummary): ClientRisk {
  if (summary.loansTotal === 0) {
    return { score: 0, level: 'sin_historial', label: 'Sin historial', tone: 'neutral' }
  }

  let score = 70
  score -= summary.loansInArrears * 25
  score += Math.min(summary.loansLiquidated * 3, 15)
  score = Math.max(0, Math.min(100, score))

  if (score >= 80) return { score, level: 'bajo', label: 'Riesgo bajo', tone: 'success' }
  if (score >= 50) return { score, level: 'medio', label: 'Riesgo medio', tone: 'warning' }
  return { score, level: 'alto', label: 'Riesgo alto', tone: 'danger' }
}