-- 025_view_tracking.sql
-- Per-recipient share links and proposal view tracking.
-- Recipients get a unique token appended to the public URL (/p/:slug?r=token)
-- so opens can be attributed to a person. Views record duration, scroll depth,
-- and which sections were seen. Written only by the proposal-track edge
-- function (service role); read by agency staff.

-- ─── Recipients (unique share links) ────────────────────────

create table proposal_recipients (
  id uuid default gen_random_uuid() primary key,
  proposal_id uuid not null references proposals(id) on delete cascade,
  name text not null default '',
  email text not null,
  token text unique not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

create index idx_proposal_recipients_proposal on proposal_recipients(proposal_id);
create index idx_proposal_recipients_token on proposal_recipients(token);

-- ─── Views ───────────────────────────────────────────────────

create table proposal_views (
  id uuid default gen_random_uuid() primary key,
  proposal_id uuid not null references proposals(id) on delete cascade,
  recipient_id uuid references proposal_recipients(id) on delete set null,
  session_id text unique not null,
  user_agent text,
  referrer text,
  ip text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  duration_seconds integer not null default 0,
  max_scroll_pct integer not null default 0,
  sections_viewed jsonb not null default '[]'::jsonb
);

create index idx_proposal_views_proposal on proposal_views(proposal_id, started_at desc);
create index idx_proposal_views_session on proposal_views(session_id);

-- ─── RLS ─────────────────────────────────────────────────────

alter table proposal_recipients enable row level security;
alter table proposal_views enable row level security;

-- Recipients: agency staff manage them from the editor
create policy "Agency staff can view recipients"
  on proposal_recipients for select
  using (is_admin());

create policy "Agency staff can create recipients"
  on proposal_recipients for insert
  with check (is_admin());

create policy "Agency staff can delete recipients"
  on proposal_recipients for delete
  using (is_admin());

-- Views: read-only for agency staff; inserts/updates happen via the
-- proposal-track edge function using the service role (bypasses RLS)
create policy "Agency staff can view proposal views"
  on proposal_views for select
  using (is_admin());
