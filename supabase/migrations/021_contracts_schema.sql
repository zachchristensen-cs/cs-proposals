-- =============================================
-- Prompt A: Contract Schema + Templates
-- 6 new tables, RLS, seed data, triggers
-- =============================================
-- Note: organizations/projects/user_organizations were dropped in 019_cleanup.
-- FKs to those tables are omitted; columns kept as plain uuid/text for future use.

-- ─── 1. contracts ─────────────────────────────────────────
create table contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  proposal_id text,
  proposal_data jsonb not null default '{}',
  sow_data jsonb not null default '{}',
  variables jsonb not null default '{}',
  template_version_ids jsonb not null default '[]',
  payment_structure text,
  total_amount integer not null default 0,
  deposit_amount integer,
  service_plan text,
  service_plan_billing text,
  boldsign_document_id text,
  boldsign_template_id text,
  signed_pdf_url text,
  status text not null default 'draft',
  sent_at timestamptz,
  completed_at timestamptz,
  project_id uuid,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on contracts
  for each row execute function update_updated_at();

-- ─── 2. contract_templates ────────────────────────────────
create table contract_templates (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  name text not null,
  content text not null default '',
  variable_schema jsonb not null default '{}',
  version integer not null default 1,
  is_active boolean not null default false,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

-- Only one active template per type
create unique index idx_one_active_per_type
  on contract_templates (type) where is_active = true;

-- ─── 3. contract_signers ──────────────────────────────────
create table contract_signers (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  role text not null,
  name text not null,
  email text not null,
  title text,
  sign_order integer not null,
  boldsign_signer_id text,
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── 4. contract_payments ─────────────────────────────────
create table contract_payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  project_id uuid,
  payment_number integer not null,
  amount integer not null,
  description text not null,
  due_type text not null,
  due_date date,
  status text not null default 'pending',
  stripe_invoice_id text,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── 5. contract_line_items ───────────────────────────────
create table contract_line_items (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  type text not null,
  name text not null,
  description text,
  amount integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ─── 6. service_plans ─────────────────────────────────────
create table service_plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  monthly_rate integer not null,
  annual_rate integer not null,
  service_hours integer not null default 0,
  includes_strategy_call boolean not null default false,
  overage_rate integer not null default 15000,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================
-- RLS Policies
-- =============================================

-- contracts: admin full CRUD (org-scoped client read added in future prompt when orgs return)
alter table contracts enable row level security;

create policy admin_all on contracts for all
  using (is_admin()) with check (is_admin());

-- contract_templates: admin only
alter table contract_templates enable row level security;

create policy admin_all on contract_templates for all
  using (is_admin()) with check (is_admin());

-- contract_signers: admin full CRUD
alter table contract_signers enable row level security;

create policy admin_all on contract_signers for all
  using (is_admin()) with check (is_admin());

-- contract_payments: admin full CRUD
alter table contract_payments enable row level security;

create policy admin_all on contract_payments for all
  using (is_admin()) with check (is_admin());

-- contract_line_items: admin full CRUD
alter table contract_line_items enable row level security;

create policy admin_all on contract_line_items for all
  using (is_admin()) with check (is_admin());

-- service_plans: admin full CRUD, everyone authenticated reads active
alter table service_plans enable row level security;

create policy admin_all on service_plans for all
  using (is_admin()) with check (is_admin());

create policy read_active on service_plans for select
  using (is_active = true);

-- =============================================
-- Seed Data: Service Plans
-- =============================================

insert into service_plans (slug, name, description, monthly_rate, annual_rate, service_hours, includes_strategy_call, overage_rate) values
  ('hosting', 'Hosting Plan', 'Managed hosting with uptime monitoring and security updates.', 4900, 49900, 0, false, 15000),
  ('edits', 'Edits Plan', 'Hosting plus 5 hours/month of site edits and updates.', 24900, 249900, 5, false, 15000),
  ('strategy', 'Strategy Plan', 'Hosting, 10 hours/month of edits, plus monthly strategy call.', 49900, 499900, 10, true, 15000);

-- =============================================
-- Seed Data: Contract Templates
-- =============================================

do $$
declare
  admin_id uuid;
begin
  select id into admin_id
  from users
  where role = 'admin'
  limit 1;

  if admin_id is null then
    select id into admin_id from users limit 1;
  end if;

  -- Template 1: MSA
  insert into contract_templates (type, name, content, variable_schema, version, is_active, created_by) values (
    'msa',
    'Master Services Agreement v1',
    '<h1>Master Services Agreement</h1>
<p>This Master Services Agreement (the "<strong>Agreement</strong>") is entered into as of <strong>{{effective_date}}</strong> (the "<strong>Effective Date</strong>") by and between:</p>

<p><strong>17 Mile Drive LLC</strong>, d/b/a Cambridge Studio, a Delaware limited liability company ("<strong>Company</strong>"), and</p>

<p><strong>{{client_company}}</strong>, located at {{client_address}} ("<strong>Client</strong>").</p>

<h2>1. Engagement</h2>
<p>Company agrees to provide web design, development, and related digital services as described in one or more Statements of Work ("<strong>SOW</strong>") executed under this Agreement. Each SOW is incorporated by reference and subject to the terms herein.</p>

<h2>2. Payment Terms</h2>
<p>Client shall pay all fees as specified in the applicable SOW. Invoices are due upon receipt unless otherwise stated. Late payments accrue interest at 1.5% per month. Company may suspend work if payment is more than 15 days overdue.</p>

<h2>3. Intellectual Property</h2>
<p>Upon full payment, Client receives ownership of all custom deliverables created specifically for Client. Company retains ownership of pre-existing tools, frameworks, libraries, and reusable components. Company may use the project in its portfolio and marketing materials.</p>

<h2>4. Confidentiality</h2>
<p>Each party agrees to keep confidential any proprietary information received from the other party. This obligation survives termination for a period of two (2) years.</p>

<h2>5. Warranties</h2>
<p>Company warrants that services will be performed in a professional manner consistent with industry standards. Company does not warrant uninterrupted or error-free operation of deliverables. Company''s total liability under this Agreement shall not exceed the fees paid by Client in the twelve (12) months preceding the claim.</p>

<h2>6. Limitation of Liability</h2>
<p>In no event shall either party be liable for indirect, incidental, special, consequential, or punitive damages, regardless of cause of action or theory of liability.</p>

<h2>7. Indemnification</h2>
<p>Client agrees to indemnify Company against claims arising from Client-provided content. Company agrees to indemnify Client against claims of intellectual property infringement in Company''s original work.</p>

<h2>8. Data and Privacy</h2>
<p>Company will handle Client data in accordance with applicable data protection laws. Company will not share Client data with third parties except as necessary to perform services.</p>

<h2>9. Force Majeure</h2>
<p>Neither party shall be liable for delays caused by circumstances beyond reasonable control, including natural disasters, pandemics, government actions, or infrastructure failures.</p>

<h2>10. Termination</h2>
<p>Either party may terminate this Agreement with thirty (30) days written notice. Upon termination, Client shall pay for all work completed. Sections 3, 4, 5, 6, and 7 survive termination.</p>

<h2>11. Dispute Resolution</h2>
<p>Disputes shall be resolved through good-faith negotiation. If unresolved within thirty (30) days, disputes shall be submitted to binding arbitration in accordance with the rules of the American Arbitration Association.</p>

<h2>12. General</h2>
<p>This Agreement constitutes the entire agreement between the parties. It may be amended only in writing signed by both parties. This Agreement is governed by the laws of the State of Delaware.</p>

<h2>Signatures</h2>
<table>
<tr><td width="50%"><strong>17 Mile Drive LLC d/b/a Cambridge Studio</strong></td><td width="50%"><strong>{{client_company}}</strong></td></tr>
<tr><td><br/><br/>______________________________<br/>{{admin_signer_name}}<br/>{{admin_signer_title}}</td><td><br/><br/>______________________________<br/>{{client_signer_name}}<br/>{{client_signer_title}}</td></tr>
</table>',
    '{
      "effective_date": {"type": "date", "label": "Effective Date", "required": true, "source": "auto"},
      "client_company": {"type": "text", "label": "Client Company Name", "required": true, "source": "organization"},
      "client_address": {"type": "textarea", "label": "Client Company Address", "required": true, "source": "organization"},
      "client_signer_name": {"type": "text", "label": "Client Signer Name", "required": true},
      "client_signer_title": {"type": "text", "label": "Client Signer Title", "required": false},
      "admin_signer_name": {"type": "text", "label": "Admin Signer Name", "required": true, "default": "Daniel Somoza"},
      "admin_signer_title": {"type": "text", "label": "Admin Signer Title", "required": true, "default": "Client Liaison, Authorized Representative"}
    }'::jsonb,
    1, true, admin_id
  );

  -- Template 2: SOW
  insert into contract_templates (type, name, content, variable_schema, version, is_active, created_by) values (
    'sow',
    'Statement of Work v1',
    '<h1>Statement of Work</h1>
<p>This Statement of Work ("<strong>SOW</strong>") is entered into under the Master Services Agreement between 17 Mile Drive LLC d/b/a Cambridge Studio and <strong>{{client_company}}</strong>, effective <strong>{{effective_date}}</strong>.</p>

<h2>1. Project Description</h2>
<p>Company will design and develop a website consisting of approximately <strong>{{page_count}}</strong> pages, including responsive design, content management system integration, and quality assurance testing.</p>

<h2>2. Scope of Work</h2>
<p>The project is organized into the following phases, each with a specified number of revision rounds:</p>

{{#each phases}}
<h3>{{phase.name}}</h3>
<p>Revision rounds included: <strong>{{phase.rounds}}</strong></p>
{{/each}}

<h2>3. Deliverables</h2>
<ul>
<li>Fully responsive website with CMS integration</li>
<li>Cross-browser testing (Chrome, Safari, Firefox, Edge)</li>
<li>Performance optimization and SEO foundation</li>
<li>Content migration assistance</li>
<li>Team training session</li>
</ul>

<h2>4. Timeline</h2>
<p>Work will commence upon contract execution and deposit receipt. Estimated project duration will be outlined during the kickoff phase.</p>

<h2>5. Hosting &amp; Maintenance</h2>
<p>Client has selected the <strong>{{service_plan_name}}</strong> plan, billed <strong>{{billing_frequency}}</strong>.</p>
<ul>
<li>Monthly rate: {{service_plan_rate_monthly}}</li>
<li>Annual rate: {{service_plan_rate_annual}}</li>
</ul>

<h2>6. Fees and Payment</h2>
<p>Total project fee: <strong>{{total_project_fee}}</strong></p>
<p>Payment structure: <strong>{{payment_structure_label}}</strong></p>

{{#each payments}}
<p>{{payment.description}}: <strong>{{payment.amount}}</strong></p>
{{/each}}

<h2>7. Additional Fees</h2>
<ul>
<li>Overage rate: {{overage_rate}}/hr for work beyond included hours</li>
<li>Re-engagement fee: {{re_engagement_fee}} if project is paused more than 30 days</li>
<li>Additional revision rounds: {{additional_revision_fee}} per round beyond those specified above</li>
</ul>

{{#if rush_fee}}
<p><strong>Rush delivery:</strong> A rush fee of {{rush_fee}} applies for delivery by {{rush_deadline}}.</p>
{{/if}}

<h2>8. Termination</h2>
<p>Either party may terminate this SOW with fifteen (15) days written notice. Client shall pay for all work completed through the termination date plus any non-refundable third-party costs incurred.</p>',
    '{
      "client_company": {"type": "text", "label": "Client Company Name", "required": true, "source": "organization"},
      "effective_date": {"type": "date", "label": "Effective Date", "required": true, "source": "auto"},
      "page_count": {"type": "number", "label": "Page Count", "required": false, "source": "proposal"},
      "service_plan_name": {"type": "text", "label": "Service Plan Name", "required": true, "source": "auto"},
      "billing_frequency": {"type": "select", "label": "Billing Frequency", "required": true, "options": ["monthly", "annual"]},
      "service_plan_rate_monthly": {"type": "currency", "label": "Monthly Rate", "required": true, "source": "auto"},
      "service_plan_rate_annual": {"type": "currency", "label": "Annual Rate", "required": true, "source": "auto"},
      "total_project_fee": {"type": "currency", "label": "Total Project Fee", "required": true, "source": "proposal"},
      "payment_structure_label": {"type": "text", "label": "Payment Structure Label", "required": true, "source": "auto"},
      "overage_rate": {"type": "currency", "label": "Overage Rate", "required": true, "default": 15000},
      "re_engagement_fee": {"type": "currency", "label": "Re-engagement Fee", "required": true, "default": 50000},
      "additional_revision_fee": {"type": "currency", "label": "Additional Revision Fee", "required": true, "default": 35000},
      "rush_fee": {"type": "currency", "label": "Rush Fee", "required": false, "default": null},
      "rush_deadline": {"type": "date", "label": "Rush Deadline", "required": false}
    }'::jsonb,
    1, true, admin_id
  );

  -- Template 3: Exhibit A
  insert into contract_templates (type, name, content, variable_schema, version, is_active, created_by) values (
    'exhibit',
    'Exhibit A: Service Plans v1',
    '<h1>Exhibit A: Hosting &amp; Maintenance Plans</h1>
<p>The following service plans are available under the Master Services Agreement. The selected plan is indicated in the Statement of Work.</p>

<h2>Hosting Plan</h2>
<p><strong>{{hosting_monthly}}/month</strong> or <strong>{{hosting_annual}}/year</strong></p>
<ul>
<li>Managed hosting on enterprise infrastructure</li>
<li>SSL certificate management</li>
<li>Daily backups with 30-day retention</li>
<li>Uptime monitoring and incident response</li>
<li>CMS and plugin updates</li>
<li>Security patching</li>
</ul>

<h2>Edits Plan</h2>
<p><strong>{{edits_monthly}}/month</strong> or <strong>{{edits_annual}}/year</strong></p>
<p>Everything in Hosting, plus:</p>
<ul>
<li>5 hours/month of site edits and updates</li>
<li>Content updates, layout changes, new pages</li>
<li>Bug fixes and compatibility updates</li>
<li>Monthly analytics summary</li>
<li>Unused hours do not roll over</li>
</ul>

<h2>Strategy Plan</h2>
<p><strong>{{strategy_monthly}}/month</strong> or <strong>{{strategy_annual}}/year</strong></p>
<p>Everything in Edits, plus:</p>
<ul>
<li>10 hours/month of edits and development</li>
<li>Monthly 30-minute strategy call</li>
<li>Conversion optimization recommendations</li>
<li>Priority support and response times</li>
<li>Quarterly performance review</li>
</ul>

<h2>Overage</h2>
<p>Work beyond included hours is billed at <strong>{{overage_rate}}/hour</strong>. Client will be notified before overage work begins.</p>',
    '{
      "hosting_monthly": {"type": "currency", "label": "Hosting Monthly Rate", "required": true, "source": "auto"},
      "hosting_annual": {"type": "currency", "label": "Hosting Annual Rate", "required": true, "source": "auto"},
      "edits_monthly": {"type": "currency", "label": "Edits Monthly Rate", "required": true, "source": "auto"},
      "edits_annual": {"type": "currency", "label": "Edits Annual Rate", "required": true, "source": "auto"},
      "strategy_monthly": {"type": "currency", "label": "Strategy Monthly Rate", "required": true, "source": "auto"},
      "strategy_annual": {"type": "currency", "label": "Strategy Annual Rate", "required": true, "source": "auto"},
      "overage_rate": {"type": "currency", "label": "Overage Rate", "required": true, "default": 15000}
    }'::jsonb,
    1, true, admin_id
  );

end $$;
