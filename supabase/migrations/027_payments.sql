-- 027_payments.sql
-- Stripe invoices created automatically when a proposal is signed, and the
-- Attio deal linkage. Written by the proposal-sign edge function.

create table proposal_payments (
  id uuid default gen_random_uuid() primary key,
  proposal_id uuid not null references proposals(id) on delete cascade,
  brand text not null default 'cambridge' check (brand in ('cambridge', 'ammo')),
  stripe_customer_id text,
  stripe_invoice_id text,
  stripe_subscription_id text,
  label text not null default '',
  amount numeric not null default 0,
  hosted_invoice_url text,
  status text not null default 'created' check (status in ('created', 'sent', 'paid', 'void', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index idx_proposal_payments_proposal on proposal_payments(proposal_id);
create index idx_proposal_payments_invoice on proposal_payments(stripe_invoice_id);

-- Attio deal linked to this proposal (record id in the deals object)
alter table proposals add column attio_deal_id text;

alter table proposal_payments enable row level security;

create policy "Agency staff can view payments"
  on proposal_payments for select
  using (is_admin());
