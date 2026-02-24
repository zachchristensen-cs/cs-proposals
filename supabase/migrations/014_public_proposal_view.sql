-- 014_public_proposal_view.sql
-- Allow anyone (including unauthenticated visitors) to view proposals
-- with status = 'sent', so the /p/:slug public link works.

create policy "Public can view sent proposals"
  on proposals for select
  using (status = 'sent');
