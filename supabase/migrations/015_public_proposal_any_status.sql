-- 015_public_proposal_any_status.sql
-- Remove status filter from public proposal viewing policy.
-- Proposals should be viewable at their public link regardless of status.

drop policy if exists "Public can view sent proposals" on proposals;

create policy "Public can view proposals"
  on proposals for select
  using (true);
