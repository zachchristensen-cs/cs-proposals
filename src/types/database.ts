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

export interface AgencyTeamMember {
  id: string
  name: string
  role: string
  bio: string
  initials: string
  photo_url: string | null
  sort_order: number
  created_at: string
}

// ─── Proposals ──────────────────────────────────────────────

export type ProposalStatus = 'draft' | 'sent' | 'signed' | 'archived'
export type ProposalTier = 1 | 2 | 3

export interface ProposalLineItem {
  name: string
  description: string
  price: number
  /** Client can toggle this item on/off on the public proposal page */
  optional?: boolean
}

export interface ProposalPackage {
  /** Stable id used to record the client's choice */
  id: string
  name: string
  /** One-time price (or, for retainer packages, the monthly amount) that becomes the proposal total when chosen */
  price: number
  summary?: string
  /** Bullet list of what's included in this package */
  features?: string[]
  /** Visually highlighted and selected by default */
  recommended?: boolean
}

/** A set of mutually-exclusive packages/tiers; the client picks exactly one and pays that. */
export interface ProposalPackageGroup {
  intro?: string
  /** id of the package selected by default; falls back to the recommended one, then the first */
  default_id?: string
  options: ProposalPackage[]
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
  /** Hide this phase's price in the rendered proposal; still counts toward the total */
  hide_price?: boolean
  /** Client can toggle this whole phase on/off on the public proposal page */
  optional?: boolean
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

export interface ProposalDiscount {
  label: string
  /** Fixed dollar amount off */
  amount?: number
  /** Percentage off the subtotal (0-100); used when amount is not set */
  percent?: number
}

export interface ProposalContent {
  /** Which agency the proposal is branded as; defaults to Cambridge Studio */
  brand?: 'cambridge' | 'ammo'

  /** project = 50/25/25 installments; retainer = full recurring amount */
  proposal_type?: 'project' | 'retainer'

  /** Billing cadence for retainers; defaults to monthly */
  retainer_interval?: 'monthly' | 'quarterly' | 'semiannual' | 'annual'

  /** Monthly amount for retainer proposals; defaults to total */
  retainer_amount?: number

  /** Discounts subtracted from the subtotal on the public page and invoices */
  discounts?: ProposalDiscount[]

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

  /** Optional pick-one packages/tiers; when present, the chosen package's price drives the total */
  packages?: ProposalPackageGroup

  total: number
  hide_total?: boolean

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
  signed_at?: string | null
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

export interface ProposalRecipient {
  id: string
  proposal_id: string
  name: string
  email: string
  token: string
  created_at: string
}

export interface ProposalView {
  id: string
  proposal_id: string
  recipient_id: string | null
  session_id: string
  user_agent: string | null
  referrer: string | null
  ip: string | null
  started_at: string
  last_seen_at: string
  duration_seconds: number
  max_scroll_pct: number
  sections_viewed: string[]
}

export interface ProposalSignature {
  id: string
  proposal_id: string
  recipient_id: string | null
  first_name: string
  last_name: string
  email: string
  signature_type: 'typed' | 'drawn'
  signature_data: string
  consent: boolean
  ip: string | null
  user_agent: string | null
  signed_at: string
  content_snapshot: ProposalContent
}
