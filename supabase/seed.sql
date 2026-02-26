-- seed.sql
-- Default seed data for Cambridge Studio

-- Auto-assign admin role to the first user who signs up
create or replace function public.auto_assign_first_admin()
returns trigger as $$
begin
  -- Only assign if no admin exists yet
  if not exists (select 1 from users where role = 'admin') then
    insert into users (id, email, role) values (new.id, new.email, 'admin');
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
drop trigger if exists on_first_user_created on auth.users;
create trigger on_first_user_created
  after insert on auth.users
  for each row execute function public.auto_assign_first_admin();

-- Insert default admin settings
insert into admin_settings (
  agency_name,
  app_url,
  client_emails_enabled,
  admin_emails_enabled
) values (
  'Cambridge Studio',
  '',
  true,
  true
);
