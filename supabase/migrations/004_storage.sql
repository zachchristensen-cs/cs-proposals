-- 004_storage.sql
-- Storage buckets and policies

-- Create private storage buckets
insert into storage.buckets (id, name, public)
values
  ('ticket-attachments', 'ticket-attachments', false),
  ('project-files', 'project-files', false);

-- ─── ticket-attachments policies ────────────────────────────

create policy "ticket_attachments_storage_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from tickets
      join user_organizations on user_organizations.organization_id = tickets.organization_id
      where tickets.id::text = (storage.foldername(name))[1]
        and user_organizations.user_id = auth.uid()
    )
    or (bucket_id = 'ticket-attachments' and is_admin())
  );

create policy "ticket_attachments_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from tickets
      join user_organizations on user_organizations.organization_id = tickets.organization_id
      where tickets.id::text = (storage.foldername(name))[1]
        and user_organizations.user_id = auth.uid()
    )
  );

create policy "ticket_attachments_storage_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and is_admin()
  );

-- ─── project-files policies ────────────────────────────────

create policy "project_files_storage_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-files'
    and exists (
      select 1 from projects
      join user_organizations on user_organizations.organization_id = projects.organization_id
      where projects.id::text = (storage.foldername(name))[1]
        and user_organizations.user_id = auth.uid()
    )
    or (bucket_id = 'project-files' and is_admin())
  );

create policy "project_files_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and exists (
      select 1 from projects
      join user_organizations on user_organizations.organization_id = projects.organization_id
      where projects.id::text = (storage.foldername(name))[1]
        and user_organizations.user_id = auth.uid()
    )
  );

create policy "project_files_storage_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-files'
    and is_admin()
  );
