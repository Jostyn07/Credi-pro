import type { ClientRisk } from './clientRisk'
import type { ClientProfileSummary, ClientEvaluationMetrics } from '@/services/clients'

export interface LoanRecommendation {
  suggestedAmount: number
  confidence: 'Alta' | 'Media' | 'Baja'
  reasons: string[]
}

// IMPORTANTE: esto es un motor de reglas determinístico, NO una llamada a un
// modelo de lenguaje. Conectar esto a un LLM real (para que sea una
// recomendación "de IA" de verdad) requeriría una Edge Function que guarde la
// API key del proveedor del lado del servidor -- nunca en el cliente -- y
// tendría un costo por llamada. Si más adelante quieres eso, esta función es
// el reemplazo exacto: misma firma de entrada/salida, cambia solo el cuerpo.
export function computeLoanRecommendation(
  requestedAmount: number,
  risk: ClientRisk,
  summary: ClientProfileSummary,
  metrics: ClientEvaluationMetrics,
): LoanRecommendation {
  const reasons: string[] = []
  let factor = 1
  let confidence: LoanRecommendation['confidence'] = 'Media'

  if (risk.level === 'sin_historial') {
    factor = 0.8
    confidence = 'Media'
    reasons.push('Cliente sin préstamos anteriores en el sistema')
  } else if (risk.level === 'bajo') {
    factor = 1
    confidence = 'Alta'
    reasons.push('Historial de pagos puntual')
  } else if (risk.level === 'medio') {
    factor = 0.85
    confidence = 'Media'
    reasons.push('Historial de pagos con algunas irregularidades')
  } else {
    factor = 0.6
    confidence = 'Baja'
    reasons.push('Historial de mora reciente')
  }

  if (metrics.onTimePct !== null) {
    reasons.push(`${metrics.onTimePct}% de cuotas pagadas a tiempo en préstamos anteriores`)
  }
  if (metrics.avgDaysLate !== null && metrics.avgDaysLate > 0) {
    reasons.push(`${metrics.avgDaysLate} días de atraso promedio`)
  }
  if (summary.loansInArrears > 0) {
    reasons.push(`${summary.loansInArrears} préstamo(s) en mora actualmente`)
    factor = Math.min(factor, 0.6)
    confidence = 'Baja'
  } else if (summary.loansTotal > 0) {
    reasons.push('Sin mora actual')
  }

  return {
    suggestedAmount: Math.round((requestedAmount * factor) / 10000) * 10000,
    confidence,
    reasons,
  }
}