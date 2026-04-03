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
  system_prompt: string | null
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
