import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getAuditLogs, getAuthEvents, type AuditLogEntry, type AuthEvent } from '@/services/audit'
import { getOrganizationUsers, type OrgUser } from '@/services/users'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

const actionTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  CREAR: 'success',
  ACTUALIZAR: 'info',
  ANULAR: 'danger',
  ELIMINAR: 'danger',
}

const TABS = ['Registro de auditoría', 'Actividad financiera', 'Sesiones / accesos'] as const
const PAGE_SIZE = 8

export default function Auditoria() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Registro de auditoría')
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([])
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const today = new Date().toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [userFilter, setUserFilter] = useState('todos')
  const [moduleFilter, setModuleFilter] = useState('todos')
  const [actionFilter, setActionFilter] = useState('todos')

  const loadData = useCallback(async () => {
    const [logsData, authData, usersData] = await Promise.all([
      getAuditLogs({ from: fromDate, to: toDate }),
      getAuthEvents(),
      getOrganizationUsers(),
    ])
    setLogs(logsData)
    setAuthEvents(authData)
    setUsers(usersData)
  }, [fromDate, toDate])

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [loadData])

  useEffect(() => setPage(1), [tab, userFilter, moduleFilter, actionFilter])

  const userNameById = useMemo(() => new Map(users.map((u) => [u.id, u.full_name ?? u.email ?? '—'])), [users])

  const financialModules = ['Préstamos', 'Pagos']
  const baseRows =
    tab === 'Actividad financiera' ? logs.filter((l) => financialModules.includes(l.module)) : logs

  const filteredLogs = baseRows.filter((l) => {
    if (userFilter !== 'todos' && l.user_id !== userFilter) return false
    if (moduleFilter !== 'todos' && l.module !== moduleFilter) return false
    if (actionFilter !== 'todos' && l.action !== actionFilter) return false
    return true
  })

  const modules = Array.from(new Set(logs.map((l) => l.module)))
  const actions = Array.from(new Set(logs.map((l) => l.action)))

  const currentRows: (AuditLogEntry | AuthEvent)[] = tab === 'Sesiones / accesos' ? authEvents : filteredLogs
  const totalPages = Math.max(1, Math.ceil(currentRows.length / PAGE_SIZE))
  const pageRows = currentRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleExport() {
    const isSessions = tab === 'Sesiones / accesos'
    const header = isSessions
      ? ['Fecha y hora', 'Usuario', 'Evento', 'IP']
      : ['Fecha y hora', 'Usuario', 'Acción', 'Módulo', 'Detalle']
    const rows = currentRows.map((r: any) =>
      isSessions
        ? [formatDateTime(r.created_at), userNameById.get(r.user_id) ?? r.user_id, r.event_type, r.ip_address ?? '']
        : [formatDateTime(r.created_at), r.profiles?.full_name ?? '', r.action, r.module, r.detail],
    )
    const csv = [header, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `auditoria-${tab.toLowerCase().replace(/[^a-z]+/g, '-')}-${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <Link to="/configuracion" className="text-sm text-accent hover:underline">
        ← Volver a configuración
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Auditoría y seguridad</h1>
          <p className="text-sm text-neutral-500">Mantén un registro de las actividades del sistema</p>
        </div>
        <button
          onClick={handleExport}
          disabled={currentRows.length === 0}
          className="flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-primary hover:bg-neutral-100 disabled:opacity-50"
        >
          <Download size={16} /> Exportar
        </button>
      </div>

      <div className="mb-4 flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-neutral-500 hover:text-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab !== 'Sesiones / accesos' && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-neutral-500">Fecha desde</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 block h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">Fecha hasta</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 block h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
            />
          </div>
          <select
            className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          >
            <option value="todos">Todos los usuarios</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
          {tab === 'Registro de auditoría' && (
            <select
              className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              <option value="todos">Todos los módulos</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <select
            className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="todos">Todas las acciones</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : currentRows.length === 0 ? (
        <Card className="text-sm text-neutral-400">No hay actividad registrada para este filtro.</Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-neutral-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-100 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Fecha y hora</th>
                  <th className="px-4 py-2 font-medium">Usuario</th>
                  {tab === 'Sesiones / accesos' ? (
                    <>
                      <th className="px-4 py-2 font-medium">Evento</th>
                      <th className="px-4 py-2 font-medium">IP</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-2 font-medium">Acción</th>
                      <th className="px-4 py-2 font-medium">Módulo</th>
                      <th className="px-4 py-2 font-medium">Detalle</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {tab === 'Sesiones / accesos'
                  ? (pageRows as AuthEvent[]).map((e, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-primary">{formatDateTime(e.created_at)}</td>
                        <td className="px-4 py-2 text-primary">{userNameById.get(e.user_id) ?? '—'}</td>
                        <td className="px-4 py-2">
                          <Badge tone="info">{e.event_type}</Badge>
                        </td>
                        <td className="px-4 py-2 text-neutral-500">{e.ip_address ?? '—'}</td>
                      </tr>
                    ))
                  : (pageRows as AuditLogEntry[]).map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-2 text-primary">{formatDateTime(l.created_at)}</td>
                        <td className="px-4 py-2 text-primary">{l.profiles?.full_name ?? '—'}</td>
                        <td className="px-4 py-2">
                          <Badge tone={actionTone[l.action] ?? 'neutral'}>{l.action}</Badge>
                        </td>
                        <td className="px-4 py-2 text-neutral-500">{l.module}</td>
                        <td className="px-4 py-2 text-primary">{l.detail}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
            <span>
              Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, currentRows.length)} de{' '}
              {currentRows.length} registros
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
        </>
      )}
    </div>
  )
}