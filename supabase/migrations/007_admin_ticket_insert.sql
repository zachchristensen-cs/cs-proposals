-- 007_admin_ticket_insert.sql
-- Allow admins to create tickets on behalf of any organization

-- Drop and recreate the tickets_insert policy to include admin check
drop policy if exists "tickets_insert" on tickets;
create policy "tickets_insert" on tickets
  for insert to authenticated
  with check (user_belongs_to_org(organization_id) or is_admin());

-- Also allow admins to insert attachments for any ticket
drop policy if exists "ticket_attachments_insert" on ticket_attachments;
create policy "ticket_attachments_insert" on ticket_attachments
  for insert to authenticated
  with check (
    exists (
      select 1 from tickets
      where tickets.id = ticket_attachments.ticket_id
        and (user_belongs_to_org(tickets.organization_id) or is_admin())
    )
  );

-- Also allow admin storage uploads for any ticket
drop policy if exists "ticket_attachments_storage_insert" on storage.objects;
create policy "ticket_attachments_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ticket-attachments'
    and (
      exists (
        select 1 from tickets
        join user_organizations on user_organizations.organization_id = tickets.organization_id
        where tickets.id::text = (storage.foldername(name))[1]
          and user_organizations.user_id = auth.uid()
      )
      or is_admin()
    )
  );
