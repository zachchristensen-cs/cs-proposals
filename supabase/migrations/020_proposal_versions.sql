create table proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  content jsonb not null,
  client_name text,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create index idx_proposal_versions_lookup
  on proposal_versions(proposal_id, created_at desc);

alter table proposal_versions enable row level security;

-- Same RLS as proposals: is_admin() only
create policy "staff_select_versions" on proposal_versions for select using (is_admin());
create policy "staff_insert_versions" on proposal_versions for insert with check (is_admin());
create policy "staff_delete_versions" on proposal_versions for delete using (is_admin());

-- Auto-cleanup: keep last 50 per proposal
create or replace function cleanup_old_versions() returns trigger as $$
begin
  delete from proposal_versions where id in (
    select id from proposal_versions
    where proposal_id = NEW.proposal_id
    order by created_at desc offset 50
  );
  return NEW;
end;
$$ language plpgsql;

create trigger trg_version_cleanup after insert on proposal_versions
  for each row execute function cleanup_old_versions();
