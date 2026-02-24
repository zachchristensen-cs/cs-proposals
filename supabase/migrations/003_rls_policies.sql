-- 003_rls_policies.sql
-- Row Level Security policies for all tables

-- ─── Enable RLS on all tables ────────────────────────────────

alter table users enable row level security;
alter table user_roles enable row level security;
alter table organizations enable row level security;
alter table user_organizations enable row level security;
alter table modules enable row level security;
alter table organization_modules enable row level security;
alter table client_invites enable row level security;
alter table admin_settings enable row level security;
alter table tickets enable row level security;
alter table ticket_attachments enable row level security;
alter table projects enable row level security;
alter table project_onboarding enable row level security;
alter table questionnaire_templates enable row level security;
alter table project_phases enable row level security;
alter table phase_rounds enable row level security;
alter table project_files enable row level security;

-- ─── users ───────────────────────────────────────────────────

create policy "users_select" on users
  for select to authenticated
  using (id = auth.uid() or is_admin());

create policy "users_update" on users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ─── user_roles ──────────────────────────────────────────────

create policy "user_roles_select" on user_roles
  for select to authenticated
  using (user_id = auth.uid() or is_admin());

-- ─── organizations ──────────────────────────────────────────

create policy "organizations_select" on organizations
  for select to authenticated
  using (user_belongs_to_org(id) or is_admin());

create policy "organizations_insert" on organizations
  for insert to authenticated
  with check (is_admin());

create policy "organizations_update" on organizations
  for update to authenticated
  using (is_admin());

create policy "organizations_delete" on organizations
  for delete to authenticated
  using (is_admin());

-- ─── user_organizations ─────────────────────────────────────

create policy "user_organizations_select" on user_organizations
  for select to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "user_organizations_insert" on user_organizations
  for insert to authenticated
  with check (is_admin());

create policy "user_organizations_update" on user_organizations
  for update to authenticated
  using (is_admin());

create policy "user_organizations_delete" on user_organizations
  for delete to authenticated
  using (is_admin());

-- ─── modules ─────────────────────────────────────────────────

create policy "modules_select" on modules
  for select to authenticated
  using (true);

-- ─── organization_modules ───────────────────────────────────

create policy "organization_modules_select" on organization_modules
  for select to authenticated
  using (user_belongs_to_org(organization_id) or is_admin());

create policy "organization_modules_insert" on organization_modules
  for insert to authenticated
  with check (is_admin());

create policy "organization_modules_update" on organization_modules
  for update to authenticated
  using (is_admin());

create policy "organization_modules_delete" on organization_modules
  for delete to authenticated
  using (is_admin());

-- ─── client_invites ─────────────────────────────────────────

create policy "client_invites_select_admin" on client_invites
  for select to authenticated
  using (is_admin());

create policy "client_invites_select_owner" on client_invites
  for select to authenticated
  using (
    exists (
      select 1 from user_organizations
      where user_organizations.user_id = auth.uid()
        and user_organizations.organization_id = client_invites.organization_id
        and user_organizations.is_owner = true
    )
  );

create policy "client_invites_insert" on client_invites
  for insert to authenticated
  with check (is_admin());

create policy "client_invites_update" on client_invites
  for update to authenticated
  using (is_admin());

create policy "client_invites_delete" on client_invites
  for delete to authenticated
  using (is_admin());

-- ─── admin_settings ─────────────────────────────────────────

create policy "admin_settings_select" on admin_settings
  for select to authenticated
  using (is_admin());

create policy "admin_settings_update" on admin_settings
  for update to authenticated
  using (is_admin());

-- ─── tickets ─────────────────────────────────────────────────

create policy "tickets_select" on tickets
  for select to authenticated
  using (user_belongs_to_org(organization_id) or is_admin());

create policy "tickets_insert" on tickets
  for insert to authenticated
  with check (user_belongs_to_org(organization_id));

create policy "tickets_update" on tickets
  for update to authenticated
  using (is_admin());

create policy "tickets_delete" on tickets
  for delete to authenticated
  using (is_admin());

-- ─── ticket_attachments ─────────────────────────────────────

create policy "ticket_attachments_select" on ticket_attachments
  for select to authenticated
  using (
    exists (
      select 1 from tickets
      where tickets.id = ticket_attachments.ticket_id
        and (user_belongs_to_org(tickets.organization_id) or is_admin())
    )
  );

create policy "ticket_attachments_insert" on ticket_attachments
  for insert to authenticated
  with check (
    exists (
      select 1 from tickets
      where tickets.id = ticket_attachments.ticket_id
        and user_belongs_to_org(tickets.organization_id)
    )
  );

create policy "ticket_attachments_update" on ticket_attachments
  for update to authenticated
  using (is_admin());

create policy "ticket_attachments_delete" on ticket_attachments
  for delete to authenticated
  using (is_admin());

-- ─── projects ────────────────────────────────────────────────

create policy "projects_select" on projects
  for select to authenticated
  using (user_belongs_to_org(organization_id) or is_admin());

create policy "projects_insert" on projects
  for insert to authenticated
  with check (is_admin());

create policy "projects_update" on projects
  for update to authenticated
  using (is_admin());

create policy "projects_delete" on projects
  for delete to authenticated
  using (is_admin());

-- ─── project_onboarding ─────────────────────────────────────

create policy "project_onboarding_select" on project_onboarding
  for select to authenticated
  using (
    exists (
      select 1 from projects
      where projects.id = project_onboarding.project_id
        and (user_belongs_to_org(projects.organization_id) or is_admin())
    )
  );

create policy "project_onboarding_insert" on project_onboarding
  for insert to authenticated
  with check (is_admin());

create policy "project_onboarding_update" on project_onboarding
  for update to authenticated
  using (is_admin());

create policy "project_onboarding_delete" on project_onboarding
  for delete to authenticated
  using (is_admin());

-- ─── questionnaire_templates ────────────────────────────────

create policy "questionnaire_templates_select" on questionnaire_templates
  for select to authenticated
  using (true);

create policy "questionnaire_templates_insert" on questionnaire_templates
  for insert to authenticated
  with check (is_admin());

create policy "questionnaire_templates_update" on questionnaire_templates
  for update to authenticated
  using (is_admin());

create policy "questionnaire_templates_delete" on questionnaire_templates
  for delete to authenticated
  using (is_admin());

-- ─── project_phases ─────────────────────────────────────────

create policy "project_phases_select" on project_phases
  for select to authenticated
  using (
    exists (
      select 1 from projects
      where projects.id = project_phases.project_id
        and (user_belongs_to_org(projects.organization_id) or is_admin())
    )
  );

create policy "project_phases_insert" on project_phases
  for insert to authenticated
  with check (is_admin());

create policy "project_phases_update" on project_phases
  for update to authenticated
  using (is_admin());

create policy "project_phases_delete" on project_phases
  for delete to authenticated
  using (is_admin());

-- ─── phase_rounds ───────────────────────────────────────────

create policy "phase_rounds_select" on phase_rounds
  for select to authenticated
  using (
    exists (
      select 1 from project_phases
      join projects on projects.id = project_phases.project_id
      where project_phases.id = phase_rounds.phase_id
        and (user_belongs_to_org(projects.organization_id) or is_admin())
    )
  );

create policy "phase_rounds_insert" on phase_rounds
  for insert to authenticated
  with check (is_admin());

create policy "phase_rounds_update_admin" on phase_rounds
  for update to authenticated
  using (is_admin());

create policy "phase_rounds_update_client_feedback" on phase_rounds
  for update to authenticated
  using (
    exists (
      select 1 from project_phases
      join projects on projects.id = project_phases.project_id
      where project_phases.id = phase_rounds.phase_id
        and user_belongs_to_org(projects.organization_id)
    )
  )
  with check (
    exists (
      select 1 from project_phases
      join projects on projects.id = project_phases.project_id
      where project_phases.id = phase_rounds.phase_id
        and user_belongs_to_org(projects.organization_id)
    )
  );

create policy "phase_rounds_delete" on phase_rounds
  for delete to authenticated
  using (is_admin());

-- ─── project_files ──────────────────────────────────────────

create policy "project_files_select" on project_files
  for select to authenticated
  using (
    exists (
      select 1 from projects
      where projects.id = project_files.project_id
        and (user_belongs_to_org(projects.organization_id) or is_admin())
    )
  );

create policy "project_files_insert" on project_files
  for insert to authenticated
  with check (
    exists (
      select 1 from projects
      where projects.id = project_files.project_id
        and user_belongs_to_org(projects.organization_id)
    )
  );

create policy "project_files_update" on project_files
  for update to authenticated
  using (is_admin());

create policy "project_files_delete" on project_files
  for delete to authenticated
  using (is_admin());
