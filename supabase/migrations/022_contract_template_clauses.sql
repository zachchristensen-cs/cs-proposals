-- =============================================
-- Prompt A Revision: contract_template_clauses
-- New table for per-clause template content.
-- DO NOT modify existing tables.
-- =============================================

create table contract_template_clauses (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references contract_templates(id) on delete cascade,
  clause_key text not null,
  title text not null,
  section_number text,
  content text not null default '',
  is_conditional boolean not null default false,
  condition_description text,
  sort_order integer not null,
  is_locked boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_clauses_template_id on contract_template_clauses(template_id);
create unique index idx_clauses_template_key on contract_template_clauses(template_id, clause_key);

-- RLS: admin only, same pattern as contract_templates
alter table contract_template_clauses enable row level security;

create policy admin_all on contract_template_clauses for all
  using (is_admin()) with check (is_admin());

-- =============================================
-- Seed Data: Split existing templates into clauses
-- =============================================

do $$
declare
  msa_id uuid;
  sow_id uuid;
  exhibit_id uuid;
begin
  -- Look up existing active template IDs
  select id into msa_id from contract_templates where type = 'msa' and is_active = true limit 1;
  select id into sow_id from contract_templates where type = 'sow' and is_active = true limit 1;
  select id into exhibit_id from contract_templates where type = 'exhibit' and is_active = true limit 1;

  -- ─── MSA Clauses ──────────────────────────────────────
  if msa_id is not null then

    insert into contract_template_clauses (template_id, clause_key, title, section_number, content, sort_order) values
    (msa_id, 'msa_intro', 'Introduction', null,
     '<p>This Master Services Agreement (the "Agreement") is made effective as of <strong>{{effective_date}}</strong>, by and between <strong>17 Mile Media LLC</strong> (d/b/a Cambridge Studio), a Delaware limited liability company ("17 Mile"), and <strong>{{client_company}}</strong>, located at {{client_address}} ("Client").</p>',
     0),

    (msa_id, 'msa_1_engagement', 'Engagement', '1',
     '<p>Client engages 17 Mile to provide services described in one or more Statements of Work ("SOW") signed by both Parties. Each SOW will outline specific deliverables, timelines, fees, and payment terms. All SOWs are governed by and subject to the terms of this Agreement.</p>',
     1),

    (msa_id, 'msa_2_payment', 'Payment Terms', '2',
     '<p>Payment terms are defined in each SOW. Invoices are due within thirty (30) days of receipt. Late payments incur a 3.00% monthly fee on the overdue balance. 17 Mile may pause or suspend work if payment is more than fifteen (15) days overdue. All fees are non-refundable once services have been rendered unless otherwise stated in the applicable SOW.</p>',
     2),

    (msa_id, 'msa_3_ip', 'Intellectual Property', '3',
     '<p>All deliverables become the Client''s property upon full payment. Until then, 17 Mile retains ownership. Neither Party may use the other''s IP outside the scope of this Agreement without written consent. 17 Mile retains the right to use the project in its portfolio and marketing materials unless the Client provides written objection. 17 Mile retains ownership of all pre-existing tools, frameworks, libraries, and reusable components used in the creation of deliverables.</p>',
     3),

    (msa_id, 'msa_4_confidentiality', 'Confidentiality', '4',
     '<p>Both Parties agree to protect and not disclose confidential information exchanged under this Agreement, except as required to fulfill project obligations. This obligation survives termination for a period of two (2) years. Confidential information does not include information that is publicly available, independently developed, or rightfully received from a third party without restriction.</p>',
     4),

    (msa_id, 'msa_5_warranties', 'Warranties and Disclaimers', '5',
     '<p>Each Party confirms it has the authority to enter into this Agreement and will fulfill its responsibilities professionally. Disclaimer: Except as stated herein, services are provided "as is." 17 Mile does not guarantee uninterrupted or error-free operation of deliverables, nor does it warrant that deliverables will meet all of Client''s business objectives beyond the scope defined in each SOW.</p>',
     5),

    (msa_id, 'msa_6_liability', 'Limitation of Liability', '6',
     '<p>Except for gross negligence or intentional misconduct, neither Party is liable for indirect or consequential damages. Total liability under this Agreement is limited to the total fees paid by Client in the twelve (12) months preceding the claim. This limitation applies regardless of the form of action, whether in contract, tort, or otherwise.</p>',
     6),

    (msa_id, 'msa_7_indemnification', 'Indemnification', '7',
     '<p>The Client agrees to indemnify and hold harmless 17 Mile and its team from any third-party claims, losses, or legal costs arising from the Client''s use of deliverables, Client-provided content, or Client''s breach of this Agreement. 17 Mile agrees to indemnify Client against claims of intellectual property infringement in 17 Mile''s original work product.</p>',
     7),

    (msa_id, 'msa_8_data', 'Data and Privacy', '8',
     '<p>The Client is responsible for managing any data, content, or materials provided to 17 Mile and for ensuring that such materials comply with all applicable laws and regulations. 17 Mile will handle Client data in accordance with applicable data protection laws and will not share Client data with third parties except as necessary to perform services under this Agreement.</p>',
     8),

    (msa_id, 'msa_9_force_majeure', 'Force Majeure', '9',
     '<p>Neither Party will be held responsible for delays or failures caused by events beyond their control, including natural disasters, internet outages, labor disputes, pandemics, government actions, or other events of force majeure. The affected Party shall promptly notify the other Party and use reasonable efforts to mitigate the impact.</p>',
     9),

    (msa_id, 'msa_10_termination', 'Termination', '10',
     '<p>Either Party may terminate this Agreement or any active SOW per the termination terms in the SOW. Upon termination, 17 Mile will deliver all completed work to date and the Client shall pay for all work performed through the termination date. Sections 3, 4, 5, 6, 7, and 8 of this Agreement survive termination.</p>',
     10),

    (msa_id, 'msa_11_disputes', 'Dispute Resolution', '11',
     '<p>If a dispute arises under this Agreement, the Parties will first attempt to resolve it through good faith discussions. If the matter is not resolved within thirty (30) days, it shall be submitted to binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall take place in Delaware.</p>',
     11),

    (msa_id, 'msa_12_governing_law', 'Governing Law and Venue', '12',
     '<p>This Agreement is governed by Delaware law. Any legal action, including enforcement of arbitration, must be brought in Delaware. The prevailing Party in any dispute shall be entitled to recover reasonable attorney''s fees and costs from the other Party.</p>',
     12),

    (msa_id, 'msa_13_assignment', 'Assignment', '13',
     '<p>Neither Party may assign its rights or obligations under this Agreement without the other''s written consent. Unauthorized assignments are void.</p>',
     13),

    (msa_id, 'msa_14_entire_agreement', 'Entire Agreement', '14',
     '<p>This Agreement, including all SOWs, is the entire agreement between the Parties. It replaces all prior understandings. Changes must be in writing and signed by both Parties to be effective.</p>',
     14),

    (msa_id, 'msa_15_severability', 'Severability', '15',
     '<p>If any part of this Agreement is found invalid, the rest remains enforceable.</p>',
     15),

    (msa_id, 'msa_16_notices', 'Notices', '16',
     '<p>All formal notices under this Agreement must be sent by email to the primary business email used by each Party during the course of the project, unless a different address is provided in writing.</p>',
     16),

    (msa_id, 'msa_17_counterparts', 'Counterparts', '17',
     '<p>This Agreement may be signed in counterparts, including electronically. All counterparts together form one agreement.</p>',
     17),

    (msa_id, 'msa_signatures', 'Signatures', null,
     '<p>IN WITNESS WHEREOF, the Parties have executed this Master Services Agreement as of the date first written above.</p>
<table>
<tr><td width="50%"><strong>CLIENT</strong></td><td width="50%"><strong>17 MILE MEDIA LLC</strong></td></tr>
<tr><td><br/>Signature: ______________________________<br/>Print Name: {{client_signer_name}}<br/>Title: {{client_signer_title}}<br/>Date: {{client_sign_date}}</td><td><br/>Signature: ______________________________<br/>Print Name: {{admin_signer_name}}<br/>Title: {{admin_signer_title}}<br/>Date: {{admin_sign_date}}</td></tr>
</table>',
     18);

  end if;

  -- ─── SOW Clauses ──────────────────────────────────────
  if sow_id is not null then

    insert into contract_template_clauses (template_id, clause_key, title, section_number, content, is_conditional, condition_description, sort_order) values
    (sow_id, 'sow_intro', 'Introduction', null,
     '<p>This Statement of Work ("SOW") is issued under and subject to the terms of the Master Services Agreement ("Agreement") between <strong>17 Mile Media LLC</strong> (d/b/a Cambridge Studio, DBA pending) ("17 Mile") and <strong>{{client_company}}</strong> ("Client"), effective as of {{effective_date}}.</p>',
     false, null, 0),

    (sow_id, 'sow_1_project', 'Project Description', '1',
     '<p>Website Design and Development</p>',
     false, null, 1),

    (sow_id, 'sow_2_scope', 'Scope of Work', '2',
     '<p>17 Mile will design and develop a new website using Webflow. This includes:</p>
<ul>
<li>Website build with <strong>{{page_count}}</strong> pages of content</li>
<li>Mobile-responsive, modern design</li>
<li>Basic SEO (meta tags and descriptions)</li>
<li>Client onboarding session (training for site management)</li>
<li>Domain and hosting set up and management</li>
</ul>

<p><strong>Planning Process Includes:</strong></p>
{{#each phases}}
<p><strong>{{phase.name}}:</strong> {{phase.description}}; {{phase.rounds}} round(s) of revisions</p>
{{/each}}

<p>A "round of revisions" refers to a single, consolidated set of edit requests submitted at one time. Additional rounds or fragmented feedback may be billed separately.</p>',
     false, null, 2),

    (sow_id, 'sow_3_hosting', 'Hosting and Service Plan', '3',
     '<p>The Client agrees to subscribe to one of 17 Mile''s service plans, starting on the project launch date. All plans include a one-year minimum commitment and renew automatically based on the billing cycle selected below.</p>

<p><strong>Selected Plan:</strong> {{service_plan_name}}</p>
<p><strong>Billing Frequency:</strong> {{billing_frequency}}</p>
<p><strong>Rate:</strong> {{service_plan_rate_monthly}} per month / {{service_plan_rate_annual}} per year</p>

<p>Service plans are defined in <em>Exhibit A – Service Plan Details</em>, which is incorporated by reference into this SOW.</p>

<p>Website ownership includes all content, design, and deliverables created by 17 Mile for the Client. The website will remain hosted within 17 Mile''s managed platform account for the duration of the service plan. The Client will have content-level editing access at all times. Technical access and account-level control remain with 17 Mile to ensure hosting and support continuity. Ownership does not include transfer of platform credentials or infrastructure.</p>

<p>Hosting and service plans auto-renew based on the selected billing cycle unless canceled in writing at least 30 days before the renewal date. Early cancellation before the end of the first year will result in the remaining balance being due. Hosting and service plan fees are non-refundable once billed.</p>',
     false, null, 3),

    (sow_id, 'sow_4_deliverables', 'Deliverables', '4',
     '<ul>
<li>Fully functional, launched website in Webflow</li>
<li>One-time onboarding session (via video call or pre-recorded screen share)</li>
</ul>',
     false, null, 4),

    (sow_id, 'sow_5_timeline', 'Timeline', '5',
     '<p>The project timeline will be determined based on collaboration between 17 Mile and the Client. Timely feedback and content approval from the Client are necessary to move the project forward.</p>

<p>If the Client requests expedited delivery and a rush fee is specified in this SOW, 17 Mile will aim to complete the project by: <strong>{{rush_deadline}}</strong>.</p>

<p>If the Client does not provide feedback for more than 30 days, the project will be considered paused. A re-engagement fee, as listed in Section 6, may apply, and the timeline or scope may be adjusted upon resumption.</p>',
     true, 'Rush deadline paragraph only appears if a rush fee applies', 5),

    (sow_id, 'sow_6_fees', 'Fees and Payment', '6',
     '<p><strong>Total project fee:</strong> {{total_project_fee}} USD</p>

<p><strong>Selected Payment Structure:</strong> {{payment_structure}}</p>

{{#each payments}}
<p>Payment {{payment.number}}: <strong>{{payment.amount}}</strong> due on {{payment.due_date}}</p>
{{/each}}

<p>If no option is selected, the default structure shall be the 50/50 schedule. Payments must be made on time to keep the project on schedule. A delay in payment may result in pause or rescheduling of work, and re-engagement fees may apply.</p>

<p><strong>Service plan fees:</strong> {{service_plan_rate_monthly}} per month / {{service_plan_rate_annual}} per year</p>
<p><strong>Service plan overage rate:</strong> {{overage_rate}} per hour</p>
<p><strong>Rush fee (if applicable):</strong> {{rush_fee}}</p>
<p><strong>Re-engagement fee:</strong> {{re_engagement_fee}}</p>
<p><strong>Additional revision rounds:</strong> {{additional_revision_fee}} each</p>

<p>All payments must be made before ownership is granted or ongoing services are provided.</p>',
     false, null, 6),

    (sow_id, 'sow_7_termination', 'Termination', '7',
     '<p>Either Party may terminate this SOW at any time with 10 days'' written notice. If the Client terminates the project, any payments made to date are non-refundable. If 17 Mile terminates the project, 17 Mile will deliver all completed work to date and refund any unused portion of the project fee, at 17 Mile''s discretion. No further work or obligations will apply after termination.</p>',
     false, null, 7),

    (sow_id, 'sow_8_acceptance', 'Acceptance', '8',
     '<p>By signing below, the Parties agree to the terms of this Statement of Work and the Master Services Agreement.</p>',
     false, null, 8),

    (sow_id, 'sow_signatures', 'Signatures', null,
     '<table>
<tr><td width="50%"><strong>CLIENT</strong></td><td width="50%"><strong>17 MILE MEDIA LLC</strong></td></tr>
<tr><td><br/>Signature: ______________________________<br/>Print Name: {{client_signer_name}}<br/>Title: {{client_signer_title}}<br/>Date: ______________________________</td><td><br/>Signature: ______________________________<br/>Print Name: {{admin_signer_name}}<br/>Title: {{admin_signer_title}}<br/>Date: ______________________________</td></tr>
</table>',
     false, null, 9);

  end if;

  -- ─── Exhibit A Clauses ────────────────────────────────
  if exhibit_id is not null then

    insert into contract_template_clauses (template_id, clause_key, title, section_number, content, sort_order) values
    (exhibit_id, 'exhibit_intro', 'Introduction', null,
     '<p>This Exhibit defines the scope and terms of the service plans referenced in Section 3 of the Statement of Work.</p>',
     0),

    (exhibit_id, 'exhibit_hosting', 'Hosting Plan', null,
     '<ul>
<li>Includes domain and hosting set up and management</li>
<li>Ongoing technical support for hosting and uptime</li>
<li>Does not include domain purchase</li>
<li>Does not include Service Hours</li>
</ul>',
     1),

    (exhibit_id, 'exhibit_edits', 'Edits Plan', null,
     '<ul>
<li>Includes everything in the Hosting Plan</li>
<li>Includes 5 Service Hours per month</li>
<li>Edits must be submitted through the Service Dashboard</li>
<li>Unused hours do not roll over</li>
</ul>',
     2),

    (exhibit_id, 'exhibit_strategy', 'Strategy Plan', null,
     '<ul>
<li>Includes everything in the Edits Plan</li>
<li>Includes 10 Service Hours per month</li>
<li>Monthly Strategy Call: One 1-hour session to discuss website performance, SEO, content strategy, conversion optimization, and design direction</li>
<li>Actionable deliverables agreed upon during each call, scoped to 17 Mile''s discretion</li>
<li>Access to Service Dashboard so Client may submit work requests outside the monthly call</li>
</ul>',
     3),

    (exhibit_id, 'exhibit_service_hours', 'Service Hours', null,
     '<p>Each service plan (other than the Hosting Plan) includes a monthly allotment of Service Hours as specified above. Service hours are tracked by 17 Mile and cover all work performed under the plan, including time spent on requests submitted through the Service Dashboard and deliverables from strategy calls.</p>

<p>Unused hours do not roll over to the following month. If the Client''s usage exceeds the included hours in a given month, additional time will be billed at <strong>{{overage_rate}}</strong> per hour. 17 Mile will notify the Client before beginning work that would exceed the monthly allotment. Overage charges will be invoiced at the end of the billing cycle in which they are incurred.</p>',
     4),

    (exhibit_id, 'exhibit_submission', 'Submission Requirements', null,
     '<p>All work requests must include a clear written description of the desired outcome along with all necessary materials in final form, including copy, images, files, and any other content assets.</p>

<p>Requests that are incomplete or lack the required materials will be returned to the Client and will not be queued for work. A returned request does not count toward the monthly hours allotment. The request may be resubmitted once all materials and information are provided.</p>',
     5);

  end if;

  -- Update variable_schema on templates to include signer variables
  -- (The MSA signatures block now uses client_sign_date, admin_sign_date)
  if msa_id is not null then
    update contract_templates
    set variable_schema = variable_schema
      || '{"client_sign_date": {"type": "date", "label": "Client Sign Date", "required": false, "source": "auto"}}'::jsonb
      || '{"admin_sign_date": {"type": "date", "label": "Admin Sign Date", "required": false, "source": "auto"}}'::jsonb
    where id = msa_id;
  end if;

end $$;
