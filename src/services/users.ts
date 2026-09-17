import { supabase } from '@/lib/supabaseClient'

export interface OrgUser {
  id: string
  full_name: string | null
  email: string | null
  status: string
  created_at: string
  updated_at: string
  roles: { id: number; key: string; name: string }[]
}

// profiles no tiene una sola "columna de rol" -- un usuario puede tener
// varios roles (user_roles es una tabla puente). "Rol principal" en la UI es
// simplemente el primero que traiga la consulta.
export async function getOrganizationUsers(): Promise<OrgUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, status, created_at, updated_at, user_roles(roles(id, key, name))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as any[]).map((p) => ({
    ...p,
    roles: (p.user_roles ?? []).map((ur: any) => ur.roles).filter(Boolean),
  }))
}

export async function getLastSignIns(): Promise<Map<string, string | null>> {
  const { data, error } = await supabase.rpc('get_org_last_sign_ins')
  if (error) throw error
  const map = new Map<string, string | null>()
  for (const row of (data ?? []) as any[]) map.set(row.user_id, row.last_sign_in_at)
  return map
}

export async function updateUserStatus(userId: string, status: 'active' | 'inactive'): Promise<void> {
  const { error } = await supabase.from('profiles').update({ status }).eq('id', userId)
  if (error) throw error
}

export interface Role {
  id: number
  key: string
  name: string
  description: string | null
  organization_id: string | null // null = rol de sistema, compartido y de solo lectura
}

export interface RoleWithCounts extends Role {
  userCount: number
  permissionCount: number
}

export async function getRoles(): Promise<RoleWithCounts[]> {
  const [rolesResult, userRolesResult, rolePermsResult] = await Promise.all([
    supabase.from('roles').select('*').order('id'),
    supabase.from('user_roles').select('role_id'),
    supabase.from('role_permissions').select('role_id'),
  ])
  if (rolesResult.error) throw rolesResult.error

  const userCountByRole = new Map<number, number>()
  for (const r of (userRolesResult.data ?? []) as any[]) {
    userCountByRole.set(r.role_id, (userCountByRole.get(r.role_id) ?? 0) + 1)
  }
  const permCountByRole = new Map<number, number>()
  for (const r of (rolePermsResult.data ?? []) as any[]) {
    permCountByRole.set(r.role_id, (permCountByRole.get(r.role_id) ?? 0) + 1)
  }

  return ((rolesResult.data ?? []) as unknown as Role[]).map((r) => ({
    ...r,
    userCount: userCountByRole.get(r.id) ?? 0,
    permissionCount: permCountByRole.get(r.id) ?? 0,
  }))
}

export async function createRole(input: {
  key: string
  name: string
  description?: string
  organizationId: string
}): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .insert({
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      organization_id: input.organizationId,
    })
    .select()
    .single()
  if (error) throw error
  return data as unknown as Role
}

export interface Permission {
  id: number
  key: string
  description: string | null
}

export async function getAllPermissions(): Promise<Permission[]> {
  const { data, error } = await supabase.from('permissions').select('*').order('key')
  if (error) throw error
  return data as unknown as Permission[]
}

export async function getRolePermissionIds(roleId: number): Promise<number[]> {
  const { data, error } = await supabase.from('role_permissions').select('permission_id').eq('role_id', roleId)
  if (error) throw error
  return (data ?? []).map((r: any) => r.permission_id)
}

// Reemplaza el conjunto de permisos de un rol por el que se pasa -- calcula
// la diferencia y solo inserta/borra lo que cambió.
export async function setRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
  const current = await getRolePermissionIds(roleId)
  const currentSet = new Set(current)
  const nextSet = new Set(permissionIds)

  const toAdd = permissionIds.filter((id) => !currentSet.has(id))
  const toRemove = current.filter((id) => !nextSet.has(id))

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('role_permissions')
      .insert(toAdd.map((permission_id) => ({ role_id: roleId, permission_id })))
    if (error) throw error
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .in('permission_id', toRemove)
    if (error) throw error
  }
}

export async function getUsersByRole(roleId: number): Promise<OrgUser[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('profiles(id, full_name, email, status, created_at, updated_at)')
    .eq('role_id', roleId)
  if (error) throw error
  return ((data ?? []) as any[]).map((r) => ({ ...r.profiles, roles: [] }))
}

export async function assignUserRole(userId: string, roleId: number, organizationId: string): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role_id: roleId, organization_id: organizationId })
  if (error) throw error
}

export async function removeUserRole(userId: string, roleId: number): Promise<void> {
  const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role_id', roleId)
  if (error) throw error
}

// Invitar a alguien nuevo requiere la Admin API de Supabase (service_role),
// que nunca puede llamarse desde el navegador -- por eso pasa por la Edge
// Function invite-user (ver supabase/functions/invite-user/index.ts).
export async function inviteUser(input: { email: string; fullName: string; roleId: number }): Promise<void> {
  const { error } = await supabase.functions.invoke('invite-user', {
    body: { email: input.email, fullName: input.fullName, roleId: input.roleId },
  })
  if (error) throw error
}