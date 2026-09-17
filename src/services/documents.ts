import { supabase } from '@/lib/supabaseClient'

export type DocumentType =
  | 'contrato'
  | 'recibo_pago'
  | 'liquidacion'
  | 'acuerdo'
  | 'documento_identidad'
  | 'reestructuracion'
  | 'otro'

export interface DocumentRecord {
  id: string
  organization_id: string
  client_id: string | null
  loan_id: string | null
  document_type: DocumentType
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  created_at: string
  clients?: { full_name: string } | null
  loans?: { loan_number: string } | null
}

export async function getDocuments(): Promise<DocumentRecord[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*, clients(full_name), loans(loan_number)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as DocumentRecord[]
}

export interface UploadDocumentInput {
  file: File
  documentType: DocumentType
  organizationId: string
  clientId?: string
  loanId?: string
}

// La ruta dentro del bucket empieza con el organization_id -- así es como las
// políticas de RLS de storage.objects aíslan los archivos por organización
// (ver la migración 20260919_documents.sql).
export async function uploadDocument(input: UploadDocumentInput): Promise<DocumentRecord> {
  const path = `${input.organizationId}/${crypto.randomUUID()}-${input.file.name}`

  const { error: uploadError } = await supabase.storage.from('documents').upload(path, input.file)
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('documents')
    .insert({
      organization_id: input.organizationId,
      client_id: input.clientId ?? null,
      loan_id: input.loanId ?? null,
      document_type: input.documentType,
      file_name: input.file.name,
      file_path: path,
      file_size: input.file.size,
      mime_type: input.file.type || null,
    })
    .select()
    .single()

  if (error) {
    // El registro falló después de subir el archivo -- lo limpiamos para no
    // dejar un archivo huérfano en el bucket sin fila que lo referencie.
    await supabase.storage.from('documents').remove([path])
    throw error
  }

  return data as unknown as DocumentRecord
}

// URL temporal (10 minutos) -- el bucket es privado, nunca se genera un link
// público permanente.
export async function getDocumentSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 60 * 10)
  if (error) throw error
  return data.signedUrl
}

export async function deleteDocument(id: string, filePath: string): Promise<void> {
  const { error: storageError } = await supabase.storage.from('documents').remove([filePath])
  if (storageError) throw storageError
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw error
}