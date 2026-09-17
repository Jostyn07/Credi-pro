import { supabase } from '@/lib/supabaseClient'
import type { LoanRecommendation } from '@/utils/loanRecommendation'

export type RecommendationDecision = 'en_revision' | 'aprobado' | 'ajustado' | 'rechazado'

export interface LoanRecommendationRecord {
  id: string
  organization_id: string
  client_id: string
  requested_amount: number
  suggested_amount: number
  suggested_term_months: number
  risk_level: string
  confidence: string
  reasons: string[]
  decision: RecommendationDecision
  resulting_loan_id: string | null
  created_at: string
  clients?: { full_name: string; identification: string | null }
}

export async function createRecommendationRecord(input: {
  clientId: string
  organizationId: string
  requestedAmount: number
  suggestedTermMonths: number
  riskLevel: string
  recommendation: LoanRecommendation
}): Promise<LoanRecommendationRecord> {
  const { data, error } = await supabase
    .from('loan_recommendations')
    .insert({
      organization_id: input.organizationId,
      client_id: input.clientId,
      requested_amount: input.requestedAmount,
      suggested_amount: input.recommendation.suggestedAmount,
      suggested_term_months: input.suggestedTermMonths,
      risk_level: input.riskLevel,
      confidence: input.recommendation.confidence,
      reasons: input.recommendation.reasons,
    })
    .select()
    .single()
  if (error) throw error
  return data as unknown as LoanRecommendationRecord
}

export async function updateRecommendationDecision(
  id: string,
  decision: RecommendationDecision,
  resultingLoanId?: string,
): Promise<void> {
  const { error } = await supabase
    .from('loan_recommendations')
    .update({ decision, resulting_loan_id: resultingLoanId ?? null })
    .eq('id', id)
  if (error) throw error
}

export async function getRecommendationHistory(): Promise<LoanRecommendationRecord[]> {
  const { data, error } = await supabase
    .from('loan_recommendations')
    .select('*, clients(full_name, identification)')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return data as unknown as LoanRecommendationRecord[]
}