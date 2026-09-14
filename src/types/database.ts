// Este archivo se reemplaza por completo una vez apliques las migraciones y corras:
//   npx supabase gen types typescript --project-id <tu-project-ref> > src/types/database.ts
//
// Mientras tanto, este placeholder declara manualmente las funciones RPC que ya
// usamos (create_organization, start_subscription, create_pending_invoice) para
// que TypeScript pueda validar los argumentos en las llamadas a supabase.rpc(...).
//
// Tables/Views quedan como "any": supabase-js exige que cada tabla tenga la forma
// { Row, Insert, Update, Relationships }, y no vale la pena declararla a mano
// para todas las tablas — con "any" el constraint interno (GenericSchema) queda
// satisfecho sin bloquear el resto del tipado (el de las funciones sí es real).

export type Database = {
  public: {
    Tables: Record<string, any>
    Views: Record<string, any>
    Functions: {
      create_organization: {
        Args: {
          p_commercial_name: string
          p_legal_name?: string | null
          p_tax_id?: string | null
          p_phone?: string | null
          p_email?: string | null
          p_country?: string
          p_city?: string | null
          p_currency?: string
        }
        Returns: Record<string, unknown>
      }
      start_subscription: {
        Args: { p_plan_key: string }
        Returns: Record<string, unknown>
      }
      create_pending_invoice: {
        Args: Record<string, never>
        Returns: Record<string, unknown>
      }
      get_active_plan_version: {
        Args: { p_plan_key: string }
        Returns: Record<string, unknown>
      }
    }
    Enums: Record<string, any>
  }
}