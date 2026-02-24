-- seed.sql
-- Default seed data for Cambridge Studio

-- Insert modules
insert into modules (slug, name, enabled) values
  ('maintenance', 'Maintenance', true),
  ('projects', 'Projects', true);

-- Insert default admin settings
insert into admin_settings (
  agency_name,
  default_monthly_ticket_limit,
  default_sla_days,
  default_billing_cycle_day,
  app_url,
  client_emails_enabled,
  admin_emails_enabled,
  notion_auto_sync
) values (
  'Cambridge Studio',
  10,
  5,
  1,
  '',
  true,
  true,
  false
);

-- Insert default questionnaire template
insert into questionnaire_templates (name, is_default, questions) values (
  'Website Project',
  true,
  '[
    {"id": "q1", "question": "Describe your business and what you do", "required": true, "order": 1},
    {"id": "q2", "question": "Who is your target audience?", "required": true, "order": 2},
    {"id": "q3", "question": "What are the primary goals of this project?", "required": true, "order": 3},
    {"id": "q4", "question": "Do you have existing brand guidelines? If so, please describe.", "required": false, "order": 4},
    {"id": "q5", "question": "What websites do you admire and why?", "required": false, "order": 5},
    {"id": "q6", "question": "Do you have any specific features or functionality requirements?", "required": false, "order": 6},
    {"id": "q7", "question": "What is your timeline for this project?", "required": true, "order": 7}
  ]'::jsonb
);
