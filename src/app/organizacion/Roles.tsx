import { useCallback, useEffect, useState } from 'react'
import { Shield, Users, PhoneCall, Eye, Settings2, Plus, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  getRoles,
  getAllPermissions,
  getRolePermissionIds,
  setRolePermissions,
  getUsersByRole,
  createRole,
  type RoleWithCounts,
  type Permission,
  type OrgUser,
} from '@/services/users'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'

function roleIcon(key: string) {
  if (key.includes('admin')) return Shield
  if (key.includes('gerente') || key.includes('manager')) return Users
  if (key.includes('cobr')) return PhoneCall
  if (key.includes('consulta')) return Eye
  return Settings2
}

// Un permiso como "clients.write" se agrupa por lo que hay antes del punto.
function permissionCategory(key: string): string {
  const [prefix] = key.split('.')
  const labels: Record<string, string> = {
    clients: 'Clientes',
    loans: 'Préstamos',
    payments: 'Pagos',
    cash: 'Caja',
    collection: 'Cobranza',
    documents: 'Documentos',
    settings: 'Configuración',
    users: 'Usuarios',
  }
  return labels[prefix] ?? prefix
}

const TOP_TABS = ['Roles', 'Permisos'] as const

export default function Roles() {
  const { profile } = useAuth()
  const [topTab, setTopTab] = useState<(typeof TOP_TABS)[number]>('Roles')
  const [roles, setRoles] = useState<RoleWithCounts[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [roleTab, setRoleTab] = useState<'permisos' | 'usuarios'>('permisos')
  const [rolePermissionIds, setRolePermissionIds] = useState<Set<number>>(new Set())
  const [roleUsers, setRoleUsers] = useState<OrgUser[]>([])
  const [permSearch, setPermSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const [showNewRole, setShowNewRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleKey, setNewRoleKey] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [creatingRole, setCreatingRole] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)

  const loadRoles = useCallback(async () => {
    const [rolesData, permsData] = await Promise.all([getRoles(), getAllPermissions()])
    setRoles(rolesData)
    setPermissions(permsData)
    setSelectedRoleId((prev) => prev ?? rolesData[0]?.id ?? null)
  }, [])

  useEffect(() => {
    loadRoles().finally(() => setLoading(false))
  }, [loadRoles])

  useEffect(() => {
    if (!selectedRoleId) return
    getRolePermissionIds(selectedRoleId).then((ids) => setRolePermissionIds(new Set(ids)))
    getUsersByRole(selectedRoleId).then(setRoleUsers)
  }, [selectedRoleId])

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null
  const isSystemRole = selectedRole ? selectedRole.organization_id === null : false

  function togglePermission(id: number) {
    if (isSystemRole) return
    setRolePermissionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSavePermissions() {
    if (!selectedRoleId) return
    setSaving(true)
    try {
      await setRolePermissions(selectedRoleId, Array.from(rolePermissionIds))
      await loadRoles()
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateRole() {
    if (!profile?.organization_id || !newRoleKey || !newRoleName) return
    setRoleError(null)
    setCreatingRole(true)
    try {
      const role = await createRole({
        key: newRoleKey,
        name: newRoleName,
        description: newRoleDescription || undefined,
        organizationId: profile.organization_id,
      })
      setShowNewRole(false)
      setNewRoleName('')
      setNewRoleKey('')
      setNewRoleDescription('')
      await loadRoles()
      setSelectedRoleId(role.id)
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'No se pudo crear el rol')
    } finally {
      setCreatingRole(false)
    }
  }

  const filteredPermissions = permissions.filter((p) => p.key.toLowerCase().includes(permSearch.toLowerCase()))

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <Link to="/usuarios" className="text-sm text-accent hover:underline">
        ← Volver a usuarios
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Roles y permisos</h1>
          <p className="text-sm text-neutral-500">Define roles y asigna permisos</p>
        </div>
        {topTab === 'Roles' && (
          <Button onClick={() => setShowNewRole(true)}>
            <Plus size={16} /> Nuevo rol
          </Button>
        )}
      </div>

      <div className="mb-6 flex rounded-lg border border-neutral-300 p-1 sm:w-fit">
        {TOP_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTopTab(t)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium',
              topTab === t ? 'bg-accent text-white' : 'text-neutral-500 hover:text-primary',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {topTab === 'Permisos' ? (
        <Card>
          <p className="mb-3 text-sm text-neutral-500">
            Estos son los {permissions.length} permisos que existen hoy en el sistema. Para asignarlos a un rol, ve a
            la pestaña "Roles".
          </p>
          <div className="overflow-x-auto rounded-card border border-neutral-200">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-neutral-100 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Permiso</th>
                  <th className="px-4 py-2 font-medium">Descripción</th>
                  <th className="px-4 py-2 font-medium">Categoría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {permissions.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 font-mono text-xs text-primary">{p.key}</td>
                    <td className="px-4 py-2 text-primary">{p.description}</td>
                    <td className="px-4 py-2 text-neutral-500">{permissionCategory(p.key)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="flex flex-col gap-3">
            {roles.map((r) => {
              const Icon = roleIcon(r.key)
              const isSelected = r.id === selectedRoleId
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                    isSelected ? 'border-accent bg-accent/5' : 'border-neutral-200 hover:border-primary-500',
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary">{r.name}</p>
                    <p className="truncate text-xs text-neutral-400">{r.userCount} usuario(s)</p>
                  </div>
                </button>
              )
            })}
          </div>

          {selectedRole && (
            <Card>
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-primary">{selectedRole.name}</p>
                    {isSystemRole && (
                      <Badge tone="neutral">
                        <Lock size={10} className="mr-1 inline" /> Rol de sistema
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500">{selectedRole.description}</p>
                </div>
              </div>

              <div className="mb-4 mt-4 flex gap-1 border-b border-neutral-200">
                <button
                  onClick={() => setRoleTab('permisos')}
                  className={`border-b-2 px-3 py-2 text-sm font-medium ${
                    roleTab === 'permisos' ? 'border-accent text-accent' : 'border-transparent text-neutral-500'
                  }`}
                >
                  Permisos ({rolePermissionIds.size})
                </button>
                <button
                  onClick={() => setRoleTab('usuarios')}
                  className={`border-b-2 px-3 py-2 text-sm font-medium ${
                    roleTab === 'usuarios' ? 'border-accent text-accent' : 'border-transparent text-neutral-500'
                  }`}
                >
                  Usuarios ({selectedRole.userCount})
                </button>
              </div>

              {roleTab === 'permisos' ? (
                <div className="flex flex-col gap-3">
                  {isSystemRole && (
                    <p className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">
                      Este es un rol de sistema, compartido por todas las organizaciones de la plataforma -- sus
                      permisos no se pueden editar aquí. Crea un rol nuevo si necesitas una combinación distinta.
                    </p>
                  )}
                  <Input
                    placeholder="Buscar permiso..."
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                  />
                  <div className="overflow-x-auto rounded-card border border-neutral-200">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead className="bg-neutral-100 text-xs uppercase text-neutral-500">
                        <tr>
                          <th className="w-10 px-4 py-2" />
                          <th className="px-4 py-2 font-medium">Permiso</th>
                          <th className="px-4 py-2 font-medium">Descripción</th>
                          <th className="px-4 py-2 font-medium">Categoría</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {filteredPermissions.map((p) => (
                          <tr key={p.id}>
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={rolePermissionIds.has(p.id)}
                                disabled={isSystemRole}
                                onChange={() => togglePermission(p.id)}
                                className="h-4 w-4 rounded border-neutral-300 text-accent focus:ring-accent/30 disabled:opacity-40"
                              />
                            </td>
                            <td className="px-4 py-2 font-mono text-xs text-primary">{p.key}</td>
                            <td className="px-4 py-2 text-primary">{p.description}</td>
                            <td className="px-4 py-2 text-neutral-500">{permissionCategory(p.key)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!isSystemRole && (
                    <Button onClick={handleSavePermissions} loading={saving} className="self-start">
                      Guardar cambios
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {roleUsers.length === 0 ? (
                    <p className="text-sm text-neutral-400">Nadie tiene este rol todavía.</p>
                  ) : (
                    roleUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                        <div>
                          <p className="text-sm font-medium text-primary">{u.full_name}</p>
                          <p className="text-xs text-neutral-400">{u.email}</p>
                        </div>
                        <Badge tone={u.status === 'active' ? 'success' : 'neutral'}>
                          {u.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      <Modal open={showNewRole} onClose={() => setShowNewRole(false)} title="Nuevo rol">
        <div className="flex flex-col gap-4">
          <Input label="Nombre del rol" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
          <Input
            label="Clave (sin espacios, ej. supervisor)"
            value={newRoleKey}
            onChange={(e) => setNewRoleKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
          />
          <Input
            label="Descripción (opcional)"
            value={newRoleDescription}
            onChange={(e) => setNewRoleDescription(e.target.value)}
          />
          {roleError && <p className="text-sm text-status-danger">{roleError}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowNewRole(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleCreateRole}
              loading={creatingRole}
              disabled={!newRoleName || !newRoleKey}
              className="flex-1"
            >
              Crear rol
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}