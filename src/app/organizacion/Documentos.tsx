import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, FileText, Receipt, FileCheck2, Contact, RefreshCcw, File as FileIcon } from 'lucide-react'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getAllContracts, type Contract } from '@/services/contracts'
import { getDocuments, getDocumentSignedUrl, deleteDocument, type DocumentRecord, type DocumentType } from '@/services/documents'
import { getClients, type Client } from '@/services/clients'
import { SubirDocumentoModal } from './SubirDocumentoModal'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO')
}

type UnifiedType = DocumentType
const TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'contrato', label: 'Contratos' },
  { key: 'recibo_pago', label: 'Recibos de pago' },
  { key: 'liquidacion', label: 'Liquidaciones' },
  { key: 'acuerdo', label: 'Acuerdos' },
  { key: 'documento_identidad', label: 'Clientes' },
] as const
type TabKey = (typeof TABS)[number]['key']

const typeLabel: Record<UnifiedType, string> = {
  contrato: 'Contrato',
  recibo_pago: 'Recibo de pago',
  liquidacion: 'Liquidación',
  acuerdo: 'Acuerdo',
  documento_identidad: 'Documento de identidad',
  reestructuracion: 'Reestructuración',
  otro: 'Otro',
}

const typeTone: Record<UnifiedType, 'info' | 'success' | 'danger' | 'warning' | 'neutral'> = {
  contrato: 'info',
  recibo_pago: 'success',
  liquidacion: 'danger',
  acuerdo: 'warning',
  documento_identidad: 'neutral',
  reestructuracion: 'warning',
  otro: 'neutral',
}

const typeIcon: Record<UnifiedType, typeof FileText> = {
  contrato: FileText,
  recibo_pago: Receipt,
  liquidacion: FileCheck2,
  acuerdo: FileCheck2,
  documento_identidad: Contact,
  reestructuracion: RefreshCcw,
  otro: FileIcon,
}

interface Row {
  id: string
  kind: 'contract' | 'upload'
  fileName: string
  type: UnifiedType
  clientName: string
  relatedTo: string
  relatedLink?: string
  date: string
  raw: Contract | DocumentRecord
}

const PAGE_SIZE = 8

export default function Documentos() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  const [tab, setTab] = useState<TabKey>('todos')
  const [typeFilter, setTypeFilter] = useState<'todos' | UnifiedType>('todos')
  const [clientFilter, setClientFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const loadData = useCallback(async () => {
    const [contractsData, documentsData, clientsData] = await Promise.all([
      getAllContracts(200),
      getDocuments(),
      getClients(),
    ])
    setContracts(contractsData)
    setDocuments(documentsData)
    setClients(clientsData)
  }, [])

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [loadData])

  useEffect(() => setPage(1), [tab, typeFilter, clientFilter, search])

  const rows: Row[] = useMemo(() => {
    const contractRows: Row[] = contracts.map((c) => ({
      id: c.id,
      kind: 'contract',
      fileName: `${c.contract_number}.pdf`,
      type: 'contrato',
      clientName: c.loans?.clients?.full_name ?? '—',
      relatedTo: c.loans?.loan_number ?? '—',
      relatedLink: undefined,
      date: c.generated_at,
      raw: c,
    }))
    const uploadRows: Row[] = documents.map((d) => ({
      id: d.id,
      kind: 'upload',
      fileName: d.file_name,
      type: d.document_type,
      clientName: d.clients?.full_name ?? '—',
      relatedTo: d.loans?.loan_number ?? (d.clients?.full_name ? 'Cliente' : '—'),
      relatedLink: undefined,
      date: d.created_at,
      raw: d,
    }))
    return [...contractRows, ...uploadRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [contracts, documents])

  const tabFiltered = rows.filter((r) => {
    if (tab === 'todos') return true
    return r.type === tab
  })

  const filtered = tabFiltered.filter((r) => {
    if (typeFilter !== 'todos' && r.type !== typeFilter) return false
    if (clientFilter && r.clientName !== clientFilter) return false
    if (search && !r.fileName.toLowerCase().includes(search.toLowerCase()) && !r.clientName.toLowerCase().includes(search.toLowerCase()))
      return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleView(row: Row) {
    if (row.kind === 'contract') return // se navega con el Link
    const doc = row.raw as DocumentRecord
    const url = await getDocumentSignedUrl(doc.file_path)
    window.open(url, '_blank')
  }

  async function handleDelete(row: Row) {
    if (row.kind === 'contract') return // los contratos no se borran desde aquí
    if (!confirm(`¿Eliminar "${row.fileName}"? Esta acción no se puede deshacer.`)) return
    const doc = row.raw as DocumentRecord
    await deleteDocument(doc.id, doc.file_path)
    loadData()
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Centro de documentos</h1>
          <p className="text-sm text-neutral-500">Gestiona contratos, recibos y documentos de tus clientes</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Plus size={16} /> Subir documento
        </Button>
      </div>

      <div className="mb-4 flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-neutral-500 hover:text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
        >
          <option value="todos">Todos los tipos</option>
          {Object.entries(typeLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-primary"
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
        >
          <option value="">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.full_name}>
              {c.full_name}
            </option>
          ))}
        </select>
        <div className="relative min-w-[220px] max-w-xs flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar documento..."
            className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-primary placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'documento',
                header: 'Documento',
                render: (r: Row) => {
                  const Icon = typeIcon[r.type]
                  return (
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="shrink-0 text-neutral-400" />
                      <span className="truncate">{r.fileName}</span>
                    </div>
                  )
                },
              },
              { key: 'cliente', header: 'Cliente', render: (r: Row) => r.clientName },
              { key: 'relacionado', header: 'Relacionado con', render: (r: Row) => r.relatedTo },
              {
                key: 'tipo',
                header: 'Tipo',
                render: (r: Row) => <Badge tone={typeTone[r.type]}>{typeLabel[r.type]}</Badge>,
              },
              { key: 'fecha', header: 'Fecha', render: (r: Row) => formatDate(r.date) },
              {
                key: 'acciones',
                header: '',
                render: (r: Row) =>
                  r.kind === 'contract' ? (
                    <Link to={`/documentos/${r.id}`} className="text-accent hover:underline">
                      Ver
                    </Link>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => handleView(r)} className="text-accent hover:underline">
                        Ver
                      </button>
                      <button onClick={() => handleDelete(r)} className="text-status-danger hover:underline">
                        Eliminar
                      </button>
                    </div>
                  ),
              },
            ]}
            data={pageRows}
            rowKey={(r) => `${r.kind}-${r.id}`}
            emptyMessage="No hay documentos para este filtro."
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

      <SubirDocumentoModal open={showUpload} onClose={() => setShowUpload(false)} onSuccess={loadData} />
    </div>
  )
}