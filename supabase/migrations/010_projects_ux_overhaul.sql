-- Migration 010: Projects UX Overhaul
-- Adds kanban column, payment milestones, Cal.com fields, client onboarding update policy

-- 1. Kanban column on projects
ALTER TABLE projects ADD COLUMN kanban_column text NOT NULL DEFAULT 'Onboarding';

-- Backfill existing projects
UPDATE projects SET kanban_column =
  CASE
    WHEN status = 'completed' THEN 'Done'
    WHEN status = 'archived' THEN 'Done'
    ELSE 'Onboarding'
  END;

-- 2. Admin settings: kanban columns + Cal.com
ALTER TABLE admin_settings ADD COLUMN kanban_columns jsonb NOT NULL
  DEFAULT '["Onboarding","Sitemap","Content","Design","Development","Launch & Training","Payment","Done"]'::jsonb;

ALTER TABLE admin_settings ADD COLUMN cal_com_base_url text;

-- 3. Per-user Cal.com booking link
ALTER TABLE users ADD COLUMN cal_com_link text;

-- 4. Payment terms on project_onboarding
ALTER TABLE project_onboarding ADD COLUMN payment_terms text
  CHECK (payment_terms IN ('full', 'fifty_fifty', 'monthly'));

ALTER TABLE project_onboarding ADD COLUMN payment_months integer;

ALTER TABLE project_onboarding ADD COLUMN payment_schedule jsonb DEFAULT '[]'::jsonb;

-- 5. Client onboarding update policy
-- Allow clients to update questionnaire and file upload fields on their own org's projects
CREATE POLICY "project_onboarding_update_client" ON project_onboarding
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_onboarding.project_id
        AND user_belongs_to_org(projects.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_onboarding.project_id
        AND user_belongs_to_org(projects.organization_id)
    )
  );

-- Also allow clients to insert project files for their org's projects
-- (The existing policy may only allow reads for clients)
-- Check if insert policy exists and recreate to include org members
