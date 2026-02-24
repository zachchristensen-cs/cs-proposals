-- ─── Helper function ────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─── Proposals ───────────────────────────────────────────────

create table proposals (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'archived')),
  tier smallint check (tier in (1, 2, 3)),

  -- Client info
  client_name text,
  client_contact text,
  date text,

  -- Proposal content (structured JSON)
  content jsonb not null default '{}'::jsonb,

  -- Metadata
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_proposals_slug on proposals(slug);
create index idx_proposals_status on proposals(status);
create index idx_proposals_updated on proposals(updated_at desc);

-- Auto-update updated_at
create trigger proposals_updated_at
  before update on proposals
  for each row execute function update_updated_at();

-- ─── Proposal Messages ──────────────────────────────────────

create table proposal_messages (
  id uuid default gen_random_uuid() primary key,
  proposal_id uuid not null references proposals(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_proposal_messages_proposal on proposal_messages(proposal_id, created_at asc);

-- ─── Storage ────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('proposal-attachments', 'proposal-attachments', false)
on conflict (id) do nothing;

-- ─── RLS ────────────────────────────────────────────────────

alter table proposals enable row level security;
alter table proposal_messages enable row level security;

-- Proposals: admin/member only
create policy "Agency staff can view proposals"
  on proposals for select
  using (is_admin());

create policy "Agency staff can create proposals"
  on proposals for insert
  with check (is_admin());

create policy "Agency staff can update proposals"
  on proposals for update
  using (is_admin());

create policy "Agency staff can delete proposals"
  on proposals for delete
  using (is_admin());

-- Proposal messages: admin/member only
create policy "Agency staff can view proposal messages"
  on proposal_messages for select
  using (is_admin());

create policy "Agency staff can create proposal messages"
  on proposal_messages for insert
  with check (is_admin());

create policy "Agency staff can delete proposal messages"
  on proposal_messages for delete
  using (is_admin());

-- Storage: proposal-attachments bucket
create policy "Agency staff can read proposal attachments"
  on storage.objects for select
  using (bucket_id = 'proposal-attachments' and is_admin());

create policy "Agency staff can upload proposal attachments"
  on storage.objects for insert
  with check (bucket_id = 'proposal-attachments' and is_admin());

create policy "Agency staff can delete proposal attachments"
  on storage.objects for delete
  using (bucket_id = 'proposal-attachments' and is_admin());
