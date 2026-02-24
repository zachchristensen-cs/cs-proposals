-- ─── Notion Project Sync Columns ────────────────────────────────
-- Allow syncing projects to Notion Clients Tracker

-- Projects: store Notion page + dashboard DB IDs
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS notion_page_id text,
  ADD COLUMN IF NOT EXISTS notion_dashboard_db_id text;

-- Phase rounds: map each round to a Notion row (page)
ALTER TABLE phase_rounds
  ADD COLUMN IF NOT EXISTS notion_row_id text;

-- Admin settings: store the Clients Tracker database ID
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS notion_clients_tracker_db_id text;
