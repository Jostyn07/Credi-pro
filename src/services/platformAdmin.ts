import { supabase } from '@/lib/supabaseClient'

export interface PlatformSummary {
  organizations_count: number
  active_organizations_count: number
  trialing_subscriptions_count: number
  total_users_count: number
  active_loans_count: number
  total_active_portfolio: number
}

export async function getPlatformSummary(): Promise<PlatformSummary> {
  const { data, error } = await supabase.rpc('get_platform_summary')
  if (error) throw error
  return (data as unknown as PlatformSummary[])[0]
}

export interface PlatformOrganization {
  organization_id: string
  commercial_name: string
  status: string
  created_at: string
  plan_key: string | null
  plan_name: string | null
  subscription_status: string | null
  users_count: number
  clients_count: number
  loans_count: number
  included_users: number | null
  included_clients: number | null
  included_loans: number | null
}

export async function getPlatformOrganizations(): Promise<PlatformOrganization[]> {
  const { data, error } = await supabase.rpc('get_platform_organizations')
  if (error) throw error
  return data as unknown as PlatformOrganization[]
}

export interface PlatformRecentSignIn {
  user_id: string
  full_name: string | null
  email: string | null
  organization_id: string | null
  organization_name: string | null
  last_sign_in_at: string | null
}

export async function getPlatformRecentSignIns(limit = 50): Promise<PlatformRecentSignIn[]> {
  const { data, error } = await supabase.rpc('get_platform_recent_sign_ins', { p_limit: limit })
  if (error) throw error
  return data as unknown as PlatformRecentSignIn[]
}