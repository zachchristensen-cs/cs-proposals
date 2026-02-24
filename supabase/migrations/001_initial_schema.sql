-- 001_initial_schema.sql
-- Creates all tables for Cambridge Studio

-- ─── Core Tables ─────────────────────────────────────────────

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('admin', 'client')),
  unique (user_id)
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  monthly_ticket_limit integer not null default 10,
  sla_days integer not null default 5,
  billing_cycle_day integer not null default 1,
  tickets_used integer not null default 0,
  created_at timestamptz not null default now()
);

create table user_organizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  is_owner boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create index idx_user_organizations_user_id on user_organizations(user_id);
create index idx_user_organizations_organization_id on user_organizations(organization_id);

create table modules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('maintenance', 'projects')),
  name text not null,
  enabled boolean not null default true
);

create table organization_modules (
  organization_id uuid not null references organizations(id) on delete cascade,
  module_slug text not null references modules(slug) on delete cascade,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  primary key (organization_id, module_slug)
);

create table client_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('admin', 'client')),
  invited_by uuid not null references users(id) on delete cascade,
  token text not null unique,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_client_invites_email on client_invites(email);
create index idx_client_invites_token on client_invites(token);

create table admin_settings (
  id uuid primary key default gen_random_uuid(),
  notion_database_id text,
  notion_api_key text,
  notion_auto_sync boolean not null default false,
  admin_notification_emails text[] not null default '{}',
  client_emails_enabled boolean not null default true,
  admin_emails_enabled boolean not null default true,
  app_url text not null default '',
  agency_name text not null default 'Cambridge Studio',
  default_monthly_ticket_limit integer not null default 10,
  default_sla_days integer not null default 5,
  default_billing_cycle_day integer not null default 1,
  slack_webhook_url text,
  boldsign_api_key text
);

-- ─── Maintenance Tables ──────────────────────────────────────

create table tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  raw_message text not null,
  processed_content text,
  status text not null default 'submitted'
    check (status in ('submitted', 'processing', 'in_dev', 'in_progress', 'completed')),
  notion_page_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_tickets_organization_id on tickets(organization_id);
create index idx_tickets_user_id on tickets(user_id);

create table ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint not null,
  file_type text not null,
  created_at timestamptz not null default now()
);

-- ─── Projects Tables ─────────────────────────────────────────

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  status text not null default 'onboarding'
    check (status in ('onboarding', 'active', 'completed', 'archived')),
  assigned_am uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_projects_organization_id on projects(organization_id);

create table project_onboarding (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade unique,
  step_contract boolean not null default false,
  step_payment boolean not null default false,
  step_questionnaire boolean not null default false,
  step_files boolean not null default false,
  contract_status text not null default 'pending'
    check (contract_status in ('pending', 'sent', 'signed', 'not_required')),
  contract_boldsign_id text,
  contract_signed_at timestamptz,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'deposit_paid', 'fully_paid', 'not_required')),
  deposit_amount numeric not null default 0,
  total_amount numeric not null default 0,
  stripe_invoice_id text,
  questionnaire_completed boolean not null default false,
  questionnaire_data jsonb,
  files_uploaded boolean not null default false,
  completed_at timestamptz
);

create table questionnaire_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  questions jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  planned_rounds integer not null default 1,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_project_phases_project_id on project_phases(project_id);

create table phase_rounds (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references project_phases(id) on delete cascade,
  round_number integer not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'delivered', 'review', 'approved', 'not_needed')),
  feedback_url text,
  delivery_date timestamptz,
  feedback_notes text,
  feedback_submitted_at timestamptz,
  is_scope_addition boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_phase_rounds_phase_id on phase_rounds(phase_id);

create table project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  uploaded_by uuid not null references users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint not null,
  file_type text not null,
  category text not null default 'reference'
    check (category in ('onboarding', 'asset', 'deliverable', 'reference')),
  created_at timestamptz not null default now()
);
