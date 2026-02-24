-- 006_ticket_counter_and_team.sql
-- Adds atomic ticket counter increment and team member removal functions

-- Atomically increment tickets_used for an organization.
-- Returns the new count, or -1 if the monthly limit is reached.
create or replace function increment_tickets_used(org_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  -- Verify the calling user belongs to this org
  if not user_belongs_to_org(org_id) then
    raise exception 'Access denied: user does not belong to organization';
  end if;

  -- Atomic increment with limit check
  update organizations
  set tickets_used = tickets_used + 1
  where id = org_id
    and tickets_used < monthly_ticket_limit
  returning tickets_used into new_count;

  -- If no row was updated, the limit was reached
  if new_count is null then
    return -1;
  end if;

  return new_count;
end;
$$;

grant execute on function increment_tickets_used(uuid) to authenticated;

-- Allow org owners to remove non-owner members from their organization.
create or replace function remove_org_member(org_id uuid, member_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verify caller is org owner
  if not exists (
    select 1 from user_organizations
    where user_id = auth.uid()
      and organization_id = org_id
      and is_owner = true
  ) then
    raise exception 'Only org owners can remove members';
  end if;

  -- Cannot remove yourself
  if member_user_id = auth.uid() then
    raise exception 'Cannot remove yourself';
  end if;

  -- Cannot remove other owners
  if exists (
    select 1 from user_organizations
    where user_id = member_user_id
      and organization_id = org_id
      and is_owner = true
  ) then
    raise exception 'Cannot remove org owners';
  end if;

  delete from user_organizations
  where user_id = member_user_id
    and organization_id = org_id;

  return true;
end;
$$;

grant execute on function remove_org_member(uuid, uuid) to authenticated;
