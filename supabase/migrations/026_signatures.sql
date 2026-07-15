-- 026_signatures.sql
-- E-signature on the public proposal page. The signer types or draws a
-- signature, provides name + email, and consents. We snapshot the proposal
-- content at signing so the signed version is locked, and record IP,
-- user agent, and timestamp as an audit trail.

-- Allow the 'signed' status on proposals and expose signing state publicly
alter table proposals drop constraint proposals_status_check;
alter table proposals add constraint proposals_status_check
  check (status in ('draft', 'sent', 'signed', 'archived'));

alter table proposals add column signed_at timestamptz;

create table proposal_signatures (
  id uuid default gen_random_uuid() primary key,
  proposal_id uuid not null references proposals(id) on delete cascade,
  recipient_id uuid references proposal_recipients(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  signature_type text not null check (signature_type in ('typed', 'drawn')),
  -- typed: the typed name; drawn: PNG data URL of the canvas
  signature_data text not null,
  consent boolean not null default false,
  ip text,
  user_agent text,
  signed_at timestamptz not null default now(),
  -- Locked copy of the proposal content exactly as signed
  content_snapshot jsonb not null
);

create unique index idx_proposal_signatures_proposal on proposal_signatures(proposal_id);

alter table proposal_signatures enable row level security;

-- Read-only for agency staff; inserts happen via the proposal-sign edge
-- function using the service role (bypasses RLS)
create policy "Agency staff can view signatures"
  on proposal_signatures for select
  using (is_admin());
