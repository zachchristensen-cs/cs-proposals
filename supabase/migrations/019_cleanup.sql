-- 019_cleanup.sql
-- Remove maintenance, projects, clients, org system.
-- Move role to users table, rename client_invites to team_invites.

-- ═══════════════════════════════════════════════════════════
-- PART 1: Drop RLS policies on all tables being removed
-- ═══════════════════════════════════════════════════════════

-- ticket_activity (016)
DROP POLICY IF EXISTS "ticket_activity_select" ON ticket_activity;
DROP POLICY IF EXISTS "ticket_activity_insert_admin" ON ticket_activity;

-- tickets (003, 007, 016)
DROP POLICY IF EXISTS "tickets_select" ON tickets;
DROP POLICY IF EXISTS "tickets_insert" ON tickets;
DROP POLICY IF EXISTS "tickets_update" ON tickets;
DROP POLICY IF EXISTS "tickets_delete" ON tickets;
DROP POLICY IF EXISTS "tickets_update_admin" ON tickets;
DROP POLICY IF EXISTS "tickets_update_client_reopen" ON tickets;

-- ticket_attachments (003, 007)
DROP POLICY IF EXISTS "ticket_attachments_select" ON ticket_attachments;
DROP POLICY IF EXISTS "ticket_attachments_insert" ON ticket_attachments;
DROP POLICY IF EXISTS "ticket_attachments_update" ON ticket_attachments;
DROP POLICY IF EXISTS "ticket_attachments_delete" ON ticket_attachments;

-- phase_rounds (003)
DROP POLICY IF EXISTS "phase_rounds_select" ON phase_rounds;
DROP POLICY IF EXISTS "phase_rounds_insert" ON phase_rounds;
DROP POLICY IF EXISTS "phase_rounds_update_admin" ON phase_rounds;
DROP POLICY IF EXISTS "phase_rounds_update_client_feedback" ON phase_rounds;
DROP POLICY IF EXISTS "phase_rounds_delete" ON phase_rounds;

-- project_phases (003)
DROP POLICY IF EXISTS "project_phases_select" ON project_phases;
DROP POLICY IF EXISTS "project_phases_insert" ON project_phases;
DROP POLICY IF EXISTS "project_phases_update" ON project_phases;
DROP POLICY IF EXISTS "project_phases_delete" ON project_phases;

-- project_onboarding (003, 010)
DROP POLICY IF EXISTS "project_onboarding_select" ON project_onboarding;
DROP POLICY IF EXISTS "project_onboarding_insert" ON project_onboarding;
DROP POLICY IF EXISTS "project_onboarding_update" ON project_onboarding;
DROP POLICY IF EXISTS "project_onboarding_delete" ON project_onboarding;
DROP POLICY IF EXISTS "project_onboarding_update_client" ON project_onboarding;

-- project_files (003, 009)
DROP POLICY IF EXISTS "project_files_select" ON project_files;
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
DROP POLICY IF EXISTS "project_files_update" ON project_files;
DROP POLICY IF EXISTS "project_files_delete" ON project_files;

-- projects (003)
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;

-- project_templates (017)
DROP POLICY IF EXISTS "project_templates_select" ON project_templates;
DROP POLICY IF EXISTS "project_templates_insert" ON project_templates;
DROP POLICY IF EXISTS "project_templates_update" ON project_templates;
DROP POLICY IF EXISTS "project_templates_delete" ON project_templates;

-- questionnaire_templates (003)
DROP POLICY IF EXISTS "questionnaire_templates_select" ON questionnaire_templates;
DROP POLICY IF EXISTS "questionnaire_templates_insert" ON questionnaire_templates;
DROP POLICY IF EXISTS "questionnaire_templates_update" ON questionnaire_templates;
DROP POLICY IF EXISTS "questionnaire_templates_delete" ON questionnaire_templates;

-- organization_modules (003)
DROP POLICY IF EXISTS "organization_modules_select" ON organization_modules;
DROP POLICY IF EXISTS "organization_modules_insert" ON organization_modules;
DROP POLICY IF EXISTS "organization_modules_update" ON organization_modules;
DROP POLICY IF EXISTS "organization_modules_delete" ON organization_modules;

-- modules (003)
DROP POLICY IF EXISTS "modules_select" ON modules;

-- user_organizations (003)
DROP POLICY IF EXISTS "user_organizations_select" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_insert" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_update" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_delete" ON user_organizations;

-- organizations (003)
DROP POLICY IF EXISTS "organizations_select" ON organizations;
DROP POLICY IF EXISTS "organizations_insert" ON organizations;
DROP POLICY IF EXISTS "organizations_update" ON organizations;
DROP POLICY IF EXISTS "organizations_delete" ON organizations;

-- user_roles (003) - table will be dropped
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;

-- client_invites (003, 005) - will be renamed
DROP POLICY IF EXISTS "client_invites_select_admin" ON client_invites;
DROP POLICY IF EXISTS "client_invites_select_owner" ON client_invites;
DROP POLICY IF EXISTS "client_invites_select_own_email" ON client_invites;
DROP POLICY IF EXISTS "client_invites_insert" ON client_invites;
DROP POLICY IF EXISTS "client_invites_update" ON client_invites;
DROP POLICY IF EXISTS "client_invites_update_own" ON client_invites;
DROP POLICY IF EXISTS "client_invites_delete" ON client_invites;

-- Storage policies (004, 007, 009)
DROP POLICY IF EXISTS "ticket_attachments_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "project_files_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "project_files_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "project_files_storage_delete" ON storage.objects;

-- ═══════════════════════════════════════════════════════════
-- PART 2: Drop functions that reference removed tables
-- ═══════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS user_belongs_to_org(uuid);
DROP FUNCTION IF EXISTS get_user_org_ids();
DROP FUNCTION IF EXISTS increment_tickets_used(uuid);
DROP FUNCTION IF EXISTS add_hours_used(uuid, numeric);
DROP FUNCTION IF EXISTS remove_org_member(uuid, uuid);
DROP FUNCTION IF EXISTS log_ticket_activity(uuid, text, text, text, jsonb);
DROP FUNCTION IF EXISTS get_maintenance_clients();
-- search_admin_tickets has multiple overloads
DROP FUNCTION IF EXISTS search_admin_tickets(text, text, uuid, boolean, int, int);
DROP FUNCTION IF EXISTS search_admin_tickets(text, text, uuid, boolean, int, int, uuid);

-- ═══════════════════════════════════════════════════════════
-- PART 3: Break FK dependencies before dropping tables
-- ═══════════════════════════════════════════════════════════

-- client_invites has a FK to organizations — drop the column first
ALTER TABLE client_invites DROP COLUMN IF EXISTS organization_id;

-- Rename client_invites → team_invites now (before dropping organizations)
ALTER TABLE client_invites RENAME TO team_invites;

-- ═══════════════════════════════════════════════════════════
-- PART 4: Drop tables (leaf to root, now safe from FK deps)
-- ═══════════════════════════════════════════════════════════

DROP TABLE IF EXISTS ticket_activity;
DROP TABLE IF EXISTS ticket_attachments;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS phase_rounds;
DROP TABLE IF EXISTS project_phases;
DROP TABLE IF EXISTS project_onboarding;
DROP TABLE IF EXISTS project_files;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS project_templates;
DROP TABLE IF EXISTS questionnaire_templates;
DROP TABLE IF EXISTS organization_modules;
DROP TABLE IF EXISTS user_organizations;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS modules;

-- ═══════════════════════════════════════════════════════════
-- PART 5: Storage buckets (ticket-attachments, project-files)
-- must be deleted manually via Supabase Dashboard > Storage
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- PART 6: Move role to users table, drop user_roles
-- ═══════════════════════════════════════════════════════════

-- Add role column with default
ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'member'
  CHECK (role IN ('admin', 'member'));

-- Migrate existing roles
UPDATE users SET role = ur.role
FROM user_roles ur
WHERE users.id = ur.user_id AND ur.role IN ('admin', 'member');

-- Drop user_roles table
DROP TABLE user_roles;

-- ═══════════════════════════════════════════════════════════
-- PART 7: Configure team_invites (constraints + RLS)
-- ═══════════════════════════════════════════════════════════

-- Delete any leftover client invites first (before adding constraint)
DELETE FROM team_invites WHERE role NOT IN ('admin', 'member');

-- Update role constraint
ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS client_invites_role_check;
ALTER TABLE team_invites ADD CONSTRAINT team_invites_role_check
  CHECK (role IN ('admin', 'member'));

-- New RLS policies for team_invites
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_invites_select" ON team_invites
  FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "team_invites_insert" ON team_invites
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "team_invites_update" ON team_invites
  FOR UPDATE TO authenticated USING (
    is_admin() OR (email = (SELECT email FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "team_invites_delete" ON team_invites
  FOR DELETE TO authenticated USING (is_admin());

-- ═══════════════════════════════════════════════════════════
-- PART 8: Clean up admin_settings columns
-- ═══════════════════════════════════════════════════════════

ALTER TABLE admin_settings
  DROP COLUMN IF EXISTS default_monthly_hours_limit,
  DROP COLUMN IF EXISTS default_sla_days,
  DROP COLUMN IF EXISTS default_billing_cycle_day,
  DROP COLUMN IF EXISTS kanban_columns,
  DROP COLUMN IF EXISTS notion_clients_tracker_db_id,
  DROP COLUMN IF EXISTS notion_database_id,
  DROP COLUMN IF EXISTS notion_api_key,
  DROP COLUMN IF EXISTS notion_auto_sync,
  DROP COLUMN IF EXISTS slack_webhook_url,
  DROP COLUMN IF EXISTS slack_bot_token,
  DROP COLUMN IF EXISTS slack_channel_id,
  DROP COLUMN IF EXISTS boldsign_api_key,
  DROP COLUMN IF EXISTS cal_com_base_url;

-- ═══════════════════════════════════════════════════════════
-- PART 9: Recreate security functions to use users.role
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'member')
  );
$$;

CREATE OR REPLACE FUNCTION is_workspace_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION get_agency_staff()
RETURNS TABLE (id uuid, email text, full_name text, role text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.email, u.full_name, u.role
  FROM users u
  WHERE u.role IN ('admin', 'member')
  ORDER BY u.full_name NULLS LAST, u.email;
$$;
