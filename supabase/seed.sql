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
    {"id": "p1_q1", "question": "What is the single most important action you want visitors to take on your website? (e.g. Book a Demo, Schedule a Consultation, Purchase a Product, Sign Up for a Newsletter)", "required": true, "order": 1, "section": "Part 1: Business Fundamentals"},
    {"id": "p1_q2", "question": "What would make this website a failure in your eyes? What would make it a success?", "required": true, "order": 2, "section": "Part 1: Business Fundamentals"},
    {"id": "p1_q3", "question": "If you could only communicate ONE thing to a visitor who leaves in 30 seconds, what would it be?", "required": true, "order": 3, "section": "Part 1: Business Fundamentals"},
    {"id": "p1_q4", "question": "In one sentence, what problem do you solve for your clients?", "required": true, "order": 4, "section": "Part 1: Business Fundamentals"},
    {"id": "p1_q5", "question": "Describe what your customer''s situation looks like BEFORE they work with you. What''s painful, broken, or frustrating?", "required": true, "order": 5, "section": "Part 1: Business Fundamentals"},
    {"id": "p1_q6", "question": "What makes your solution different from alternatives? (List 3 specific things, not generic claims)", "required": true, "order": 6, "section": "Part 1: Business Fundamentals", "multi_field": 3},
    {"id": "p1_q7", "question": "Who do prospects consider instead of you? (List specific competitors or alternative approaches)", "required": true, "order": 7, "section": "Part 1: Business Fundamentals"},
    {"id": "p1_q8", "question": "Who is your primary audience? Include their Title/Role(s), Industry, and Pain point(s).", "required": true, "order": 8, "section": "Part 1: Business Fundamentals"},
    {"id": "p1_q9", "question": "Do you have secondary audiences who need different messaging? If yes, describe their role and pain points.", "required": false, "order": 9, "section": "Part 1: Business Fundamentals"},

    {"id": "p2_q1", "question": "Walk us through what happens when someone becomes your customer. What happens in the first week?", "required": true, "order": 10, "section": "Part 2: Understanding Your Offering"},
    {"id": "p2_q2", "question": "What does the customer have at the end that they didn''t at the start?", "required": true, "order": 11, "section": "Part 2: Understanding Your Offering"},
    {"id": "p2_q3", "question": "What''s the ''aha moment'' where they realize it''s working?", "required": true, "order": 12, "section": "Part 2: Understanding Your Offering"},
    {"id": "p2_q4", "question": "What questions do potential customers ask before they decide to work with you? List 5-10 actual questions you hear repeatedly.", "required": true, "order": 13, "section": "Part 2: Understanding Your Offering"},
    {"id": "p2_q5", "question": "Complete this sentence: \"People choose us over competitors because...\" Give us 3 specific, honest reasons.", "required": true, "order": 14, "section": "Part 2: Understanding Your Offering", "multi_field": 3},
    {"id": "p2_q6", "question": "What''s the biggest misconception people have about what you do?", "required": true, "order": 15, "section": "Part 2: Understanding Your Offering"},
    {"id": "p2_q7", "question": "What do you wish people understood before talking to you?", "required": true, "order": 16, "section": "Part 2: Understanding Your Offering"},
    {"id": "p2_q8", "question": "Who needs to be involved in the decision to work with you? (e.g. Just one person, multiple stakeholders, different types of buyers — describe their roles)", "required": true, "order": 17, "section": "Part 2: Understanding Your Offering"},
    {"id": "p2_q9", "question": "What happens AFTER someone becomes a customer that builds trust with future customers? (e.g. Results you deliver, process you follow, support you provide, transformation that happens)", "required": true, "order": 18, "section": "Part 2: Understanding Your Offering"},
    {"id": "p2_q10", "question": "What do your best customers say about you? What do they emphasize? What surprised them? What did they value most?", "required": true, "order": 19, "section": "Part 2: Understanding Your Offering"},
    {"id": "p2_q11", "question": "Are there different ways people can work with you? (e.g. Different service tiers or packages, different product lines, one-time vs. ongoing) Describe each briefly.", "required": false, "order": 20, "section": "Part 2: Understanding Your Offering"},
    {"id": "p2_q12", "question": "Beyond your main offering, is there anything else visitors might need from your website? (e.g. support/help for existing customers, resources or tools, partner/reseller information, career opportunities, press/media information)", "required": false, "order": 21, "section": "Part 2: Understanding Your Offering"},

    {"id": "p3_q1", "question": "How should your brand sound? (e.g. Formal or casual? Professional or conversational? Authoritative or approachable? Technical or simple?)", "required": true, "order": 22, "section": "Part 3: Voice & Messaging"},
    {"id": "p3_q2", "question": "Are there any websites you admire for their messaging?", "required": false, "order": 23, "section": "Part 3: Voice & Messaging"},
    {"id": "p3_q3", "question": "Write a headline for your homepage that you wish you had. Don''t overthink it — this helps us understand your desired messaging.", "required": true, "order": 24, "section": "Part 3: Voice & Messaging"},

    {"id": "p4_q1", "question": "Please upload to your project folder: existing brand guidelines, any copy you''ve already written, customer testimonials/feedback, sales presentations or one-pagers, marketing materials, and case studies or success stories.", "required": false, "order": 25, "section": "Part 4: Context & Constraints", "type": "file_upload"},
    {"id": "p4_q2", "question": "Are there any competitor or peer sites you admire? What do you admire about each one? (e.g. visuals, messaging, etc)", "required": false, "order": 26, "section": "Part 4: Context & Constraints"}
  ]'::jsonb
);
