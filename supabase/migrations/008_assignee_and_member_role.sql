-- 008_assignee_and_member_role.sql
-- Adds ticket assignment, member role, and admin search RPC

-- ─── 1. Expand role enums ─────────────────────────────────────

-- user_roles: allow 'member' in addition to 'admin' and 'client'
alter table user_roles drop constraint user_roles_role_check;
alter table user_roles add constraint user_roles_role_check
  check (role in ('admin', 'member', 'client'));

-- client_invites: allow 'member' role in invitations
alter table client_invites drop constraint client_invites_role_check;
alter table client_invites add constraint client_invites_role_check
  check (role in ('admin', 'member', 'client'));

-- ─── 2. Add assigned_to on tickets ───────────────────────────

alter table tickets add column assigned_to uuid references users(id) on delete set null;
create index idx_tickets_assigned_to on tickets(assigned_to);

-- ─── 3. Update is_admin() to include members ─────────────────

-- Both 'admin' and 'member' are agency staff with full data access.
-- This means all 25+ existing RLS policies using is_admin() automatically
-- extend to members with zero changes.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role in ('admin', 'member')
  );
$$;

-- ─── 4. New is_workspace_admin() for Settings access ─────────

-- Only true for 'admin' role (not 'member'). Used solely for
-- gating workspace-level settings.
create or replace function is_workspace_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- ─── 5. Tighten admin_settings RLS to workspace admins ───────

drop policy if exists "admin_settings_select" on admin_settings;
create policy "admin_settings_select" on admin_settings
  for select to authenticated
  using (is_workspace_admin());

drop policy if exists "admin_settings_update" on admin_settings;
create policy "admin_settings_update" on admin_settings
  for update to authenticated
  using (is_workspace_admin());

-- ─── 6. RPC: search_admin_tickets ────────────────────────────

-- Server-side search across tickets with JOINs on organizations
-- and users, enabling search by org name and submitter email.
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
  assigned_to uuid,
  org_name text,
  submitter_email text,
  assignee_email text,
  assignee_name text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Only agency staff can call this
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
      t.assigned_to,
      o.name as org_name,
      u.email as submitter_email,
      a.email as assignee_email,
      a.full_name as assignee_name
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
    f.id, f.title, f.status, f.created_at, f.assigned_to,
    f.org_name, f.submitter_email, f.assignee_email, f.assignee_name,
    (select count(*) from filtered)::bigint as total_count
  from filtered f
  order by f.created_at desc
  limit page_size
  offset page_num * page_size;
end;
$$;

grant execute on function search_admin_tickets(text, text, uuid, boolean, int, int) to authenticated;

-- ─── 7. RPC: get_agency_staff ────────────────────────────────

-- Returns all admin + member users for assignee dropdowns.
create or replace function get_agency_staff()
returns table (id uuid, email text, full_name text, role text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email, u.full_name, ur.role
  from users u
  join user_roles ur on ur.user_id = u.id
  where ur.role in ('admin', 'member')
  order by u.full_name nulls last, u.email;
$$;

grant execute on function get_agency_staff() to authenticated;
