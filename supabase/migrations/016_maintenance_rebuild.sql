-- 016_maintenance_rebuild.sql
-- Expands ticket statuses, adds reopen flow, client sub-roles, and activity log

-- ─── 1. Expand ticket status options ─────────────────────────────

alter table tickets drop constraint tickets_status_check;
alter table tickets add constraint tickets_status_check
  check (status in (
    'submitted', 'processing', 'synced_to_notion', 'needs_context',
    'over_90_min', 'in_progress', 'dev_complete', 'pending_review',
    'completed', 'reopened'
  ));

-- Migrate old 'in_dev' status to 'in_progress' if any exist
update tickets set status = 'in_progress' where status = 'in_dev';

-- ─── 2. Reopen columns on tickets ───────────────────────────────

alter table tickets
  add column if not exists reopen_reason text,
  add column if not exists reopen_requested_at timestamptz,
  add column if not exists reopen_approved boolean,
  add column if not exists reopen_approved_by uuid references users(id) on delete set null,
  add column if not exists reopen_token text unique;

create index idx_tickets_reopen_token on tickets(reopen_token) where reopen_token is not null;

-- ─── 3. Client sub-roles on user_organizations ──────────────────

alter table user_organizations
  add column if not exists client_role text not null default 'member'
    check (client_role in ('admin', 'member'));

-- Set existing org owners as client_role = 'admin'
update user_organizations set client_role = 'admin' where is_owner = true;

-- ─── 4. Ticket activity log ─────────────────────────────────────

create table ticket_activity (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  action text not null,
  old_status text,
  new_status text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_ticket_activity_ticket_id on ticket_activity(ticket_id);
create index idx_ticket_activity_created_at on ticket_activity(created_at);

-- ─── 5. RLS for ticket_activity ─────────────────────────────────

alter table ticket_activity enable row level security;

create policy "ticket_activity_select" on ticket_activity
  for select to authenticated
  using (
    exists (
      select 1 from tickets
      where tickets.id = ticket_activity.ticket_id
        and (user_belongs_to_org(tickets.organization_id) or is_admin())
    )
  );

create policy "ticket_activity_insert_admin" on ticket_activity
  for insert to authenticated
  with check (is_admin());

-- ─── 6. Update tickets update policies for reopen flow ──────────

-- Drop existing update policy so clients can reopen their tickets
drop policy if exists "tickets_update" on tickets;

-- Admin/member: full update access
create policy "tickets_update_admin" on tickets
  for update to authenticated
  using (is_admin());

-- Client: can only change completed → reopened on their own org's tickets
create policy "tickets_update_client_reopen" on tickets
  for update to authenticated
  using (
    user_belongs_to_org(organization_id)
    and status = 'completed'
  )
  with check (
    user_belongs_to_org(organization_id)
    and status = 'reopened'
  );

-- ─── 7. Update search_admin_tickets with new fields ─────────────

-- Drop old version first (return type changed, can't use create or replace)
drop function if exists search_admin_tickets(text, text, uuid, boolean, int, int);

create or replace function search_admin_tickets(
  search_term text default '',
  status_filter text default 'all',
  assignee_filter uuid default null,
  unassigned_only boolean default false,
  page_num int default 0,
  page_size int default 25
)
returns table (
  id uuid,
  title text,
  status text,
  created_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid,
  org_name text,
  org_id uuid,
  submitter_email text,
  submitter_name text,
  assignee_email text,
  assignee_name text,
  notion_page_id text,
  has_attachments boolean,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  with filtered as (
    select
      t.id,
      t.title,
      t.status,
      t.created_at,
      t.completed_at,
      t.assigned_to,
      o.name as org_name,
      o.id as org_id,
      u.email as submitter_email,
      u.full_name as submitter_name,
      a.email as assignee_email,
      a.full_name as assignee_name,
      t.notion_page_id,
      exists (select 1 from ticket_attachments ta where ta.ticket_id = t.id) as has_attachments
    from tickets t
    join organizations o on o.id = t.organization_id
    join users u on u.id = t.user_id
    left join users a on a.id = t.assigned_to
    where
      (search_term = '' or (
        t.title ilike '%' || search_term || '%'
        or t.raw_message ilike '%' || search_term || '%'
        or o.name ilike '%' || search_term || '%'
        or u.email ilike '%' || search_term || '%'
      ))
      and (status_filter = 'all' or t.status = status_filter)
      and (
        (assignee_filter is null and not unassigned_only)
        or (unassigned_only and t.assigned_to is null)
        or t.assigned_to = assignee_filter
      )
  )
  select
    f.id, f.title, f.status, f.created_at, f.completed_at,
    f.assigned_to, f.org_name, f.org_id, f.submitter_email, f.submitter_name,
    f.assignee_email, f.assignee_name, f.notion_page_id, f.has_attachments,
    (select count(*) from filtered)::bigint as total_count
  from filtered f
  order by f.created_at desc
  limit page_size
  offset page_num * page_size;
end;
$$;

grant execute on function search_admin_tickets(text, text, uuid, boolean, int, int) to authenticated;

-- ─── 8. RPC: log_ticket_activity ────────────────────────────────

create or replace function log_ticket_activity(
  p_ticket_id uuid,
  p_action text,
  p_old_status text default null,
  p_new_status text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  activity_id uuid;
begin
  insert into ticket_activity (ticket_id, actor_id, action, old_status, new_status, metadata)
  values (p_ticket_id, auth.uid(), p_action, p_old_status, p_new_status, p_metadata)
  returning id into activity_id;

  return activity_id;
end;
$$;

grant execute on function log_ticket_activity(uuid, text, text, text, jsonb) to authenticated;
