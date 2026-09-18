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
      preview_amortization: {
        Args: {
          p_principal: number
          p_interest_rate: number
          p_modality: string
          p_term_months: number
          p_first_payment_date: string
        }
        Returns: Record<string, unknown>[]
      }
      create_loan: {
        Args: {
          p_client_id: string
          p_principal: number
          p_interest_rate: number
          p_interest_modality: string
          p_term_months: number
          p_disbursement_date: string
          p_first_payment_date: string
          p_payment_day: number
          p_account_id: string
          p_grace_days?: number
          p_late_fee_rate?: number
          p_disbursement_method?: string | null
          p_notes?: string | null
        }
        Returns: Record<string, unknown>
      }
      activate_loan_draft: {
        Args: {
          p_loan_id: string
          p_account_id: string
          p_disbursement_method?: string | null
        }
        Returns: Record<string, unknown>
      }
      save_loan_draft: {
        Args: {
          p_client_id: string
          p_principal: number
          p_interest_rate: number
          p_interest_modality: string
          p_term_months: number
          p_disbursement_date: string
          p_first_payment_date: string
          p_payment_day: number
          p_grace_days?: number
          p_late_fee_rate?: number
          p_notes?: string | null
        }
        Returns: Record<string, unknown>
      }
      preview_payment_allocation: {
        Args: {
          p_loan_id: string
          p_amount: number
          p_payment_date?: string
        }
        Returns: Record<string, unknown>[]
      }
      register_payment: {
        Args: {
          p_loan_id: string
          p_amount: number
          p_payment_date?: string
          p_payment_method?: string | null
          p_reference?: string | null
          p_notes?: string | null
          p_prepayment_strategy?: string | null
          p_account_splits?: Record<string, unknown>[] | null
        }
        Returns: Record<string, unknown>
      }
      liquidate_loan: {
        Args: {
          p_loan_id: string
          p_payment_date?: string
          p_payment_method?: string | null
          p_reference?: string | null
          p_account_splits?: Record<string, unknown>[] | null
        }
        Returns: Record<string, unknown>
      }
      account_balance_asof: {
        Args: { p_account_id: string; p_as_of_date: string }
        Returns: number
      }
      register_cash_movement: {
        Args: {
          p_account_id: string
          p_movement_type: string
          p_amount: number
          p_description?: string | null
          p_movement_date?: string
          p_loan_id?: string | null
          p_payment_id?: string | null
        }
        Returns: Record<string, unknown>
      }
      register_cash_transfer: {
        Args: {
          p_from_account_id: string
          p_to_account_id: string
          p_amount: number
          p_description?: string | null
          p_movement_date?: string
        }
        Returns: undefined
      }
      register_expense: {
        Args: {
          p_account_id: string
          p_category: string
          p_amount: number
          p_description?: string | null
          p_expense_date?: string
        }
        Returns: Record<string, unknown>
      }
      close_cash_register: {
        Args: { p_account_id: string; p_closure_date?: string }
        Returns: Record<string, unknown>
      }
      generate_contract: {
        Args: { p_loan_id: string }
        Returns: Record<string, unknown>
      }
      get_org_last_sign_ins: {
        Args: Record<string, never>
        Returns: { user_id: string; last_sign_in_at: string | null }[]
      }
      get_org_auth_events: {
        Args: { p_limit?: number }
        Returns: { user_id: string; event_type: string; ip_address: string | null; created_at: string }[]
      }
      has_permission: {
        Args: { permission_key: string }
        Returns: boolean
      }
      get_platform_summary: {
        Args: Record<string, never>
        Returns: {
          organizations_count: number
          active_organizations_count: number
          trialing_subscriptions_count: number
          total_users_count: number
          active_loans_count: number
          total_active_portfolio: number
        }[]
      }
      get_platform_organizations: {
        Args: Record<string, never>
        Returns: {
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
        }[]
      }
      get_platform_recent_sign_ins: {
        Args: { p_limit?: number }
        Returns: {
          user_id: string
          full_name: string | null
          email: string | null
          organization_id: string | null
          organization_name: string | null
          last_sign_in_at: string | null
        }[]
      }
    }
    Enums: Record<string, any>
  }
}