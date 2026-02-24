import type { ModuleSlug, UserRole } from './modules'

// ─── Core Tables ─────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  cal_com_link: string | null
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
  kanban_columns: string[]
  cal_com_base_url: string | null
  notion_clients_tracker_db_id: string | null
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

export interface ProposalAttachment {
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  extracted_text?: string
}

export interface ProposalMessage {
  id: string
  proposal_id: string
  role: 'user' | 'assistant'
  content: string
  attachments: ProposalAttachment[]
  created_at: string
}
