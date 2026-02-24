-- 005_invite_rls_fix.sql
-- Allow authenticated users to select invites by their email (for accepting invites)
-- Also allow updating their own invite (to mark as accepted)

create policy "client_invites_select_own_email" on client_invites
  for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

create policy "client_invites_update_own" on client_invites
  for update to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));
