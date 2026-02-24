-- 002_security_functions.sql
-- Security-definer helper functions for RLS policies

-- Returns the role text for the current authenticated user
create or replace function get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from user_roles where user_id = auth.uid();
$$;

-- Returns true if the current user is an admin
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Returns true if the current user belongs to the given organization
create or replace function user_belongs_to_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_organizations where user_id = auth.uid() and organization_id = org_id
  );
$$;

-- Returns an array of all organization IDs the current user belongs to
create or replace function get_user_org_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(organization_id), '{}') from user_organizations where user_id = auth.uid();
$$;
