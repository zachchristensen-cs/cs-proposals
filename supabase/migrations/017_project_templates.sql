-- ============================================================
-- 017: Project Templates
-- ============================================================

create table project_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phases jsonb not null default '[]',
  is_default boolean default false,
  created_at timestamptz default now()
);

alter table project_templates enable row level security;

create policy "project_templates_select" on project_templates
  for select to authenticated using (is_admin());
create policy "project_templates_insert" on project_templates
  for insert to authenticated with check (is_admin());
create policy "project_templates_update" on project_templates
  for update to authenticated using (is_admin());
create policy "project_templates_delete" on project_templates
  for delete to authenticated using (is_admin());

-- Seed default templates
insert into project_templates (name, phases, is_default) values
  ('Full Website', '[{"name":"Sitemap","planned_rounds":2},{"name":"Content","planned_rounds":3},{"name":"Design","planned_rounds":3},{"name":"Development","planned_rounds":3}]'::jsonb, true),
  ('Small Website', '[{"name":"Content","planned_rounds":1},{"name":"Design","planned_rounds":1},{"name":"Development","planned_rounds":1}]'::jsonb, false);
