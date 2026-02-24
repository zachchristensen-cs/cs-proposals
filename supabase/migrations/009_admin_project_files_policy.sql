-- 009_admin_project_files_policy.sql
-- Fix project_files insert policies to allow admin users to upload files

-- Fix project_files table insert policy to include admins
drop policy "project_files_insert" on project_files;
create policy "project_files_insert" on project_files
  for insert to authenticated
  with check (
    exists (
      select 1 from projects
      where projects.id = project_files.project_id
        and (user_belongs_to_org(projects.organization_id) or is_admin())
    )
  );

-- Fix project-files storage insert policy to include admins
drop policy "project_files_storage_insert" on storage.objects;
create policy "project_files_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and (
      exists (
        select 1 from projects
        join user_organizations on user_organizations.organization_id = projects.organization_id
        where projects.id::text = (storage.foldername(name))[1]
          and user_organizations.user_id = auth.uid()
      )
      or is_admin()
    )
  );
