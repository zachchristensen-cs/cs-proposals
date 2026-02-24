import type { ModuleSlug, UserRole } from './modules'

// ─── Core Tables ─────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface UserRole_Row {
  id: string
  user_id: string
  role: UserRole
}

export interface Organization {
  id: string
  name: string
  monthly_ticket_limit: number
  sla_days: number
  billing_cycle_day: number
  tickets_used: number
  created_at: string
}

export interface UserOrganization {
  id: string
  user_id: string
  organization_id: string
  is_owner: boolean
  joined_at: string
}

export interface Module {
  id: string
  slug: ModuleSlug
  name: string
  enabled: boolean
}

export interface OrganizationModule {
  organization_id: string
  module_slug: string
  enabled: boolean
  config: Record<string, unknown>
}

export interface ClientInvite {
  id: string
  email: string
  organization_id: string
  role: UserRole
  invited_by: string
  token: string
  accepted_at: string | null
  created_at: string
}

export interface AdminSettings {
  id: string
  notion_database_id: string | null
  notion_api_key: string | null
  notion_auto_sync: boolean
  admin_notification_emails: string[]
  client_emails_enabled: boolean
  admin_emails_enabled: boolean
  app_url: string
  agency_name: string
  default_monthly_ticket_limit: number
  default_sla_days: number
  default_billing_cycle_day: number
  slack_webhook_url: string | null
  boldsign_api_key: string | null
}

// ─── Maintenance Tables ──────────────────────────────────────

export type TicketStatus =
  | 'submitted'
  | 'processing'
  | 'in_dev'
  | 'in_progress'
  | 'completed'

export interface Ticket {
  id: string
  organization_id: string
  user_id: string
  title: string
  raw_message: string
  processed_content: string | null
  status: TicketStatus
  notion_page_id: string | null
  created_at: string
  completed_at: string | null
}

export interface TicketAttachment {
  id: string
  ticket_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  created_at: string
}

// ─── Projects Tables ─────────────────────────────────────────

export type ProjectStatus =
  | 'onboarding'
  | 'active'
  | 'completed'
  | 'archived'

export type ContractStatus =
  | 'pending'
  | 'sent'
  | 'signed'
  | 'not_required'

export type PaymentStatus =
  | 'pending'
  | 'deposit_paid'
  | 'fully_paid'
  | 'not_required'

export type PhaseStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'

export type RoundStatus =
  | 'not_started'
  | 'in_progress'
  | 'delivered'
  | 'review'
  | 'approved'
  | 'not_needed'

export type FileCategory =
  | 'onboarding'
  | 'asset'
  | 'deliverable'
  | 'reference'

export interface Project {
  id: string
  organization_id: string
  name: string
  status: ProjectStatus
  assigned_am: string | null
  created_at: string
}

export interface ProjectOnboarding {
  id: string
  project_id: string
  step_contract: boolean
  step_payment: boolean
  step_questionnaire: boolean
  step_files: boolean
  contract_status: ContractStatus
  contract_boldsign_id: string | null
  contract_signed_at: string | null
  payment_status: PaymentStatus
  deposit_amount: number
  total_amount: number
  stripe_invoice_id: string | null
  questionnaire_completed: boolean
  questionnaire_data: Record<string, unknown>[] | null
  files_uploaded: boolean
  completed_at: string | null
}

export interface QuestionnaireQuestion {
  id: string
  question: string
  required: boolean
  order: number
}

export interface QuestionnaireTemplate {
  id: string
  name: string
  questions: QuestionnaireQuestion[]
  is_default: boolean
  created_at: string
}

export interface ProjectPhase {
  id: string
  project_id: string
  name: string
  planned_rounds: number
  status: PhaseStatus
  sort_order: number
  created_at: string
}

export interface PhaseRound {
  id: string
  phase_id: string
  round_number: number
  status: RoundStatus
  feedback_url: string | null
  delivery_date: string | null
  feedback_notes: string | null
  feedback_submitted_at: string | null
  is_scope_addition: boolean
  created_at: string
}

export interface ProjectFile {
  id: string
  project_id: string
  uploaded_by: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  category: FileCategory
  created_at: string
}
