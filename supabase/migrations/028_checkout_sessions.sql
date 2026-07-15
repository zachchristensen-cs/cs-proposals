-- 028_checkout_sessions.sql
-- Signing now flows into Stripe Checkout instead of emailed invoices.
alter table proposal_payments add column stripe_checkout_session_id text;
