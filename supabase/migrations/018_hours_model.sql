-- 018_hours_model.sql
-- Switches maintenance from count-based tickets to hours-based model.
-- Adds AI time estimation, multi-ticket splitting support, and admin submit fix.

-- ─── 1. Rename and retype organization columns ──────────────────

alter table organizations
  rename column monthly_ticket_limit to monthly_hours_limit;

alter table organizations
  alter column monthly_hours_limit type numeric(8,2) using monthly_hours_limit::numeric(8,2);

alter table organizations
  rename column tickets_used to hours_used;

alter table organizations
  alter column hours_used type numeric(8,2) using hours_used::numeric(8,2);

-- Set reasonable defaults (existing integer values get preserved as-is)
alter table organizations
  alter column monthly_hours_limit set default 10.0;

alter table organizations
  alter column hours_used set default 0.0;

-- ─── 2. Add hours columns to tickets ────────────────────────────

alter table tickets
  add column if not exists estimated_hours numeric(6,2),
  add column if not exists actual_hours numeric(6,2);

-- ─── 3. Update admin_settings ───────────────────────────────────

alter table admin_settings
  rename column default_monthly_ticket_limit to default_monthly_hours_limit;

alter table admin_settings
  alter column default_monthly_hours_limit type numeric(8,2)
    using default_monthly_hours_limit::numeric(8,2);

alter table admin_settings
  alter column default_monthly_hours_limit set default 10.0;

-- ─── 4. Replace increment_tickets_used with add_hours_used ──────

drop function if exists increment_tickets_used(uuid);

create or replace function add_hours_used(p_org_id uuid, p_hours numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total numeric;
begin
  -- Allow if user belongs to org OR is admin/member (fixes submit-on-behalf bug)
  if not user_belongs_to_org(p_org_id) and not is_admin() then
    raise exception 'Access denied: user does not belong to organization';
  end if;

  -- Atomically add hours (no cap — overages are billed at $150/hr)
  update organizations
  set hours_used = hours_used + p_hours
  where id = p_org_id
  returning hours_used into new_total;

  if new_total is null then
    raise exception 'Organization not found';
  end if;

  return new_total;
end;
$$;

grant execute on function add_hours_used(uuid, numeric) to authenticated;

-- ─── 5. Create get_maintenance_clients RPC ──────────────────────

create or replace function get_maintenance_clients()
returns table (
  org_id uuid,
  org_name text,
  monthly_hours_limit numeric,
  hours_used numeric,
  sla_days integer,
  billing_cycle_day integer,
  outstanding_ticket_count bigint
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
  select
    o.id as org_id,
    o.name as org_name,
    o.monthly_hours_limit,
    o.hours_used,
    o.sla_days,
    o.billing_cycle_day,
    coalesce(
      (select count(*) from tickets t
       where t.organization_id = o.id
         and t.status not in ('completed', 'archived')),
      0
    )::bigint as outstanding_ticket_count
  from organizations o
  join organization_modules om on om.organization_id = o.id
  where om.module_slug = 'maintenance'
    and om.enabled = true
  order by o.name;
end;
$$;

grant execute on function get_maintenance_clients() to authenticated;

-- ─── 6. Update search_admin_tickets with hours + org filter ─────

-- Drop old function first (signature is changing)
drop function if exists search_admin_tickets(text, text, uuid, boolean, int, int);

create or replace function search_admin_tickets(
  search_term text default '',
  status_filter text default 'all',
  assignee_filter uuid default null,
  unassigned_only boolean default false,
  page_num int default 0,
  page_size int default 25,
  org_id_filter uuid default null
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
  estimated_hours numeric,
  actual_hours numeric,
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
      exists (select 1 from ticket_attachments ta where ta.ticket_id = t.id) as has_attachments,
      t.estimated_hours,
      t.actual_hours
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
      and (org_id_filter is null or t.organization_id = org_id_filter)
  )
  select
    f.id, f.title, f.status, f.created_at, f.completed_at,
    f.assigned_to, f.org_name, f.org_id, f.submitter_email, f.submitter_name,
    f.assignee_email, f.assignee_name, f.notion_page_id, f.has_attachments,
    f.estimated_hours, f.actual_hours,
    (select count(*) from filtered)::bigint as total_count
  from filtered f
  order by f.created_at desc
  limit page_size
  offset page_num * page_size;
end;
$$;

grant execute on function search_admin_tickets(text, text, uuid, boolean, int, int, uuid) to authenticated;

-- ─── 7. Add Slack bot token + channel for interactive messages ───

alter table admin_settings
  add column if not exists slack_bot_token text,
  add column if not exists slack_channel_id text;
