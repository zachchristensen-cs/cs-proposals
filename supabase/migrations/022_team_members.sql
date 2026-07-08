-- 022_team_members.sql
-- Proposal team roster managed from Settings instead of hardcoded in the AI prompt.

create table team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  bio text not null default '',
  initials text not null default '',
  photo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table team_members enable row level security;

create policy "team_members_select" on team_members
  for select to authenticated
  using (true);

create policy "team_members_insert" on team_members
  for insert to authenticated
  with check (is_admin());

create policy "team_members_update" on team_members
  for update to authenticated
  using (is_admin());

create policy "team_members_delete" on team_members
  for delete to authenticated
  using (is_admin());

-- Seed the roster that was previously hardcoded in the system prompt
insert into team_members (name, role, initials, sort_order) values
  ('Shaan Singh', 'Founder', 'SS', 1),
  ('Zach Christensen', 'Technical Director', 'ZC', 2),
  ('Cem Ilhan', 'Design Director', 'CI', 3),
  ('Danny Somoza', 'Sales', 'DS', 4),
  ('Ankita Suri', 'Account Manager', 'AS', 5),
  ('Kayleigh Flaherty', 'Developer', 'KF', 6);

-- ─── Headshot storage ────────────────────────────────────────
-- Public bucket: headshot URLs are embedded in proposals viewed by clients.

insert into storage.buckets (id, name, public)
values ('team-headshots', 'team-headshots', true);

create policy "team_headshots_select"
  on storage.objects for select
  using (bucket_id = 'team-headshots');

create policy "team_headshots_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'team-headshots' and is_admin());

create policy "team_headshots_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'team-headshots' and is_admin());

create policy "team_headshots_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'team-headshots' and is_admin());

-- ─── Strip the hardcoded roster from the stored system prompt ─
-- The proposal-chat edge function now appends the roster from team_members,
-- so remove the static block seeded by 021. No-op if the admin already
-- edited that section.

-- Two variants: the 021 seed used em dashes, the live prompt uses hyphens.
UPDATE admin_settings SET system_prompt = replace(replace(system_prompt, $emdash$## Team Members

Always use these six when including the team section:
1. Shaan Singh — Founder (initials: SS)
2. Zach Christensen — Technical Director (initials: ZC)
3. Cem Ilhan — Design Director (initials: CI)
4. Danny Somoza — Sales (initials: DS)
5. Ankita Suri — Account Manager (initials: AS)
6. Kayleigh Flaherty — Developer (initials: KF)

Use the exact names and roles. Do NOT rewrite bios.

$emdash$, ''), $hyphen$## Team Members

Always use these six when including the team section:
1. Shaan Singh - Founder (initials: SS)
2. Zach Christensen - Technical Director (initials: ZC)
3. Cem Ilhan - Design Director (initials: CI)
4. Danny Somoza - Sales (initials: DS)
5. Ankita Suri - Account Manager (initials: AS)
6. Kayleigh Flaherty - Developer (initials: KF)

Use the exact names and roles. Do NOT rewrite bios.

$hyphen$, '')
WHERE system_prompt IS NOT NULL;
