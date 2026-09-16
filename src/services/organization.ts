import { supabase } from '@/lib/supabaseClient'

export interface OrganizationUsage {
  organizationName: string
  planName: string
  clientsUsed: number
  clientsLimit: number
  loansUsed: number
  loansLimit: number
  usersUsed: number
  usersLimit: number
  userRoleName: string | null
}

export async function getOrganizationUsage(organizationId: string, userId: string): Promise<OrganizationUsage> {
  const [orgResult, subResult, clientsCount, loansCount, usersCount, roleResult] = await Promise.all([
    supabase.from('organizations').select('commercial_name').eq('id', organizationId).single(),
    supabase
      .from('subscriptions')
      .select('plan_id, subscription_plans(name), subscription_plan_versions(included_clients, included_loans, included_users)')
      .eq('organization_id', organizationId)
      .maybeSingle(),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('loans').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const sub = subResult.data as unknown as
    | { subscription_plans?: { name: string }; subscription_plan_versions?: { included_clients: number; included_loans: number; included_users: number } }
    | null

  const org = orgResult.data as unknown as { commercial_name: string } | null

  return {
    organizationName: org?.commercial_name ?? '',
    planName: sub?.subscription_plans?.name ?? '—',
    clientsUsed: clientsCount.count ?? 0,
    clientsLimit: sub?.subscription_plan_versions?.included_clients ?? 0,
    loansUsed: loansCount.count ?? 0,
    loansLimit: sub?.subscription_plan_versions?.included_loans ?? 0,
    usersUsed: usersCount.count ?? 0,
    usersLimit: sub?.subscription_plan_versions?.included_users ?? 0,
    userRoleName: (roleResult.data as unknown as { roles?: { name: string } } | null)?.roles?.name ?? null,
  }
}