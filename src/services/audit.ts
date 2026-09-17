import { supabase } from '@/lib/supabaseClient'

export interface AuditLogEntry {
  id: string
  user_id: string | null
  action: string
  module: string
  detail: string
  record_id: string | null
  created_at: string
  profiles?: { full_name: string | null } | null
}

export interface AuditFilters {
  from?: string
  to?: string
  userId?: string
  module?: string
  action?: string
}

export async function getAuditLogs(filters: AuditFilters = {}): Promise<AuditLogEntry[]> {
  let query = supabase
    .from('audit_logs')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (filters.from) query = query.gte('created_at', filters.from)
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59`)
  if (filters.userId) query = query.eq('user_id', filters.userId)
  if (filters.module) query = query.eq('module', filters.module)
  if (filters.action) query = query.eq('action', filters.action)

  const { data, error } = await query
  if (error) throw error
  return data as unknown as AuditLogEntry[]
}

export interface AuthEvent {
  user_id: string
  event_type: string
  ip_address: string | null
  created_at: string
}

// Viene de auth.audit_log_entries (lo real que guarda Supabase Auth en cada
// inicio de sesión, con IP) -- no de nuestras propias tablas.
export async function getAuthEvents(limit = 200): Promise<AuthEvent[]> {
  const { data, error } = await supabase.rpc('get_org_auth_events', { p_limit: limit })
  if (error) throw error
  return data as unknown as AuthEvent[]
}