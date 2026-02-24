-- 014_public_proposal_view.sql
-- Allow anyone (including unauthenticated visitors) to view proposals
-- via the /p/:slug public link, regardless of status.

create policy "Public can view sent proposals"
  on proposals for select
  using (true);
