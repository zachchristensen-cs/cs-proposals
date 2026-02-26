// ─── Auth ────────────────────────────────────────────────

export type UserRole = 'admin' | 'member'

// ─── Core Tables ─────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  cal_com_link: string | null
  role: UserRole
  created_at: string
}

export interface TeamInvite {
  id: string
  email: string
  role: UserRole
  invited_by: string
  token: string
  accepted_at: string | null
  created_at: string
}

export interface AdminSettings {
  id: string
  admin_notification_emails: string[]
  client_emails_enabled: boolean
  admin_emails_enabled: boolean
  app_url: string
  agency_name: string
}

// ─── Proposals ──────────────────────────────────────────────

export type ProposalStatus = 'draft' | 'sent' | 'archived'
export type ProposalTier = 1 | 2 | 3

export interface ProposalLineItem {
  name: string
  description: string
  price: number
}

export interface ProposalPhaseGroup {
  name: string
  items: string[]
}

export interface ProposalPhase {
  name: string
  timeline?: string
  price: number
  subtotal: number
  narrative?: string
  groups?: ProposalPhaseGroup[]
  items: ProposalLineItem[]
}

export interface ProposalPaymentTerm {
  label: string
  amount: number
  description: string
}

export interface ProposalMaintenanceTier {
  name: string
  price: string
  summary: string
  description: string
}

export interface ProposalTeamMember {
  name: string
  role: string
  bio: string
  photo_url?: string
  initials: string
}

export interface ProposalPersona {
  icon: string
  title: string
  description: string
}

export interface ProposalContent {
  cover: {
    client_name: string
    prepared_for?: string
    date: string
    timeline?: string
    description: string
  }

  opportunity?: {
    paragraphs: string[]
  }

  personas?: {
    intro?: string
    items: ProposalPersona[]
  }

  phases: ProposalPhase[]

  total: number

  payment: {
    terms: ProposalPaymentTerm[]
  }

  maintenance?: {
    tiers: ProposalMaintenanceTier[]
    recommendation?: string
  }

  team?: {
    intro: string
    members: ProposalTeamMember[]
  }

  notes?: {
    items: string[]
  }

  timing_note?: string

  contact?: {
    name: string
    email: string
    phone: string
  }
}

export interface Proposal {
  id: string
  slug: string
  status: ProposalStatus
  tier: ProposalTier | null
  client_name: string | null
  client_contact: string | null
  date: string | null
  content: ProposalContent
  created_by: string
  created_at: string
  updated_at: string
}

export interface ProposalVersion {
  id: string
  proposal_id: string
  content: ProposalContent
  client_name: string | null
  created_by: string
  created_at: string
}

export interface ProposalAttachment {
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  extracted_text?: string
  base64?: string
}

export interface ProposalMessage {
  id: string
  proposal_id: string
  role: 'user' | 'assistant'
  content: string
  attachments: ProposalAttachment[]
  created_at: string
}

// ─── Contracts ──────────────────────────────────────────────

export type ContractStatus = 'draft' | 'review' | 'sent' | 'partially_signed' | 'signed' | 'declined' | 'expired' | 'cancelled'
export type PaymentStructure = 'full' | 'fifty_fifty' | 'monthly' | 'installment_3' | 'installment_6' | 'installment_12' | 'custom'
export type PaymentStatus = 'pending' | 'invoiced' | 'paid' | 'failed' | 'cancelled'

export interface VariableSchemaField {
  type: 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'select' | 'boolean'
  label: string
  required: boolean
  default?: unknown
  options?: string[]
  source?: 'organization' | 'proposal' | 'auto'
}

export interface SowData {
  phases: Array<{ name: string; rounds: number; description?: string }>
  page_count?: number
  scope_description?: string
  service_plan?: string
  billing_frequency?: string
  total_fee?: number
  fees?: {
    overage_rate: number
    re_engagement_fee: number
    additional_revision_fee: number
    rush_fee?: number
  }
}

export interface Contract {
  id: string
  organization_id: string | null
  proposal_id: string | null
  proposal_data: Record<string, unknown>
  sow_data: SowData
  variables: Record<string, unknown>
  template_version_ids: string[]
  payment_structure: PaymentStructure | null
  total_amount: number
  deposit_amount: number | null
  service_plan: 'hosting' | 'edits' | 'strategy' | null
  service_plan_billing: 'monthly' | 'annual' | null
  boldsign_document_id: string | null
  boldsign_template_id: string | null
  signed_pdf_url: string | null
  status: ContractStatus
  sent_at: string | null
  completed_at: string | null
  project_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ContractTemplate {
  id: string
  type: 'msa' | 'sow' | 'exhibit'
  name: string
  content: string
  variable_schema: Record<string, VariableSchemaField>
  version: number
  is_active: boolean
  created_by: string
  created_at: string
}

export interface ContractSigner {
  id: string
  contract_id: string
  role: 'client' | 'admin'
  name: string
  email: string
  title: string | null
  sign_order: number
  boldsign_signer_id: string | null
  signed_at: string | null
  created_at: string
}

export interface ContractPayment {
  id: string
  contract_id: string
  project_id: string | null
  payment_number: number
  amount: number
  description: string
  due_type: 'on_signing' | 'on_completion' | 'scheduled' | 'recurring'
  due_date: string | null
  status: PaymentStatus
  stripe_invoice_id: string | null
  stripe_subscription_id: string | null
  stripe_payment_intent_id: string | null
  paid_at: string | null
  created_at: string
}

export interface ContractLineItem {
  id: string
  contract_id: string
  type: 'phase' | 'addon' | 'recurring' | 'fee'
  name: string
  description: string | null
  amount: number
  sort_order: number
  created_at: string
}

export interface ServicePlan {
  id: string
  slug: 'hosting' | 'edits' | 'strategy'
  name: string
  description: string
  monthly_rate: number
  annual_rate: number
  service_hours: number
  includes_strategy_call: boolean
  overage_rate: number
  is_active: boolean
  created_at: string
}
