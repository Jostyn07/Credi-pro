import { useCallback, useEffect, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import {
  getOrganizationUsers,
  getLastSignIns,
  getRoles,
  updateUserStatus,
  inviteUser,
  type OrgUser,
  type RoleWithCounts,
} from '@/services/users'
import { useAuth } from '@/contexts/AuthContext'

function formatDate(value: string | null) {
  if (!value) return 'Nunca'
  return new Date(value).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

const PAGE_SIZE = 8

export default function Usuarios() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<OrgUser[]>([])
  const [lastSignIns, setLastSignIns] = useState<Map<string, string | null>>(new Map())
  const [roles, setRoles] = useState<RoleWithCounts[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [page, setPage] = useState(1)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState<number | ''>('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [usersData, signInsData, rolesData] = await Promise.all([
      getOrganizationUsers(),
      getLastSignIns(),
      getRoles(),
    ])
    setUsers(usersData)
    setLastSignIns(signInsData)
    setRoles(rolesData)
  }, [])

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [loadData])

  useEffect(() => setPage(1), [search, roleFilter, statusFilter])

  const filtered = users.filter((u) => {
    if (roleFilter !== 'todos' && !u.roles.some((r) => r.key === roleFilter)) return false
    if (statusFilter !== 'todos' && u.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(u.full_name ?? '').toLowerCase().includes(q) && !(u.email ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleToggleStatus(u: OrgUser) {
    await updateUserStatus(u.id, u.status === 'active' ? 'inactive' : 'active')
    loadData()
  }

  async function handleInvite() {
    if (!inviteEmail || !inviteName || !inviteRoleId) return
    setInviteError(null)
    setInviting(true)
    try {
      await inviteUser({ email: inviteEmail, fullName: inviteName, roleId: Number(inviteRoleId) })
      setShowInvite(false)
      setInviteEmail('')
      setInviteName('')
      setInviteRoleId('')
      loadData()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'No se pudo invitar al usuario')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Usuarios</h1>
          <p className="text-sm text-neutral-500">Gestiona los usuarios de tu organización</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/usuarios/roles" className="text-sm font-medium text-accent hover:underline">
            Roles y permisos
          </Link>
          <Button onClick={() => setShowInvite(true)}>
            <Plus size={16} /> Nuevo usuario
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] max-w-xs flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-primary placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <select
          className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="todos">Todos los roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.key}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="todos">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <>
          <Table
            columns={[
              { key: 'nombre', header: 'Nombre', render: (u: OrgUser) => u.full_name ?? '—' },
              { key: 'correo', header: 'Correo electrónico', render: (u: OrgUser) => u.email ?? '—' },
              {
                key: 'rol',
                header: 'Rol principal',
                render: (u: OrgUser) => (u.roles[0] ? <Badge tone="info">{u.roles[0].name}</Badge> : <Badge tone="neutral">Sin rol</Badge>),
              },
              {
                key: 'estado',
                header: 'Estado',
                render: (u: OrgUser) => <Badge tone={u.status === 'active' ? 'success' : 'danger'}>{u.status === 'active' ? 'Activo' : 'Inactivo'}</Badge>,
              },
              {
                key: 'acceso',
                header: 'Último acceso',
                render: (u: OrgUser) => formatDate(lastSignIns.get(u.id) ?? null),
              },
              {
                key: 'acciones',
                header: '',
                render: (u: OrgUser) =>
                  u.id === profile?.id ? (
                    <span className="text-xs text-neutral-400">Tú</span>
                  ) : (
                    <button onClick={() => handleToggleStatus(u)} className="text-accent hover:underline">
                      {u.status === 'active' ? 'Desactivar' : 'Activar'}
                    </button>
                  ),
              },
            ]}
            data={pageRows}
            rowKey={(u) => u.id}
          />

          {filtered.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
              <span>
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filtered.length)} de{' '}
                {filtered.length} registros
              </span>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 rounded-lg text-sm ${
                      p === page ? 'bg-accent text-white' : 'border border-neutral-300 text-primary hover:bg-neutral-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invitar nuevo usuario">
        <div className="flex flex-col gap-4">
          <Input label="Nombre completo" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
          <Input
            label="Correo electrónico"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <div>
            <label className="text-sm font-medium text-primary">Rol</label>
            <select
              className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-primary"
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Selecciona un rol</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <Card className="border-info-100 bg-info-100/40 text-xs text-info-700">
            Se le enviará un correo de invitación para que confirme su cuenta y establezca su contraseña.
          </Card>

          {inviteError && <p className="text-sm text-status-danger">{inviteError}</p>}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowInvite(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleInvite}
              loading={inviting}
              disabled={!inviteEmail || !inviteName || !inviteRoleId}
              className="flex-1"
            >
              Enviar invitación
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}