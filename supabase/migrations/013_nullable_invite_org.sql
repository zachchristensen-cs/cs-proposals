-- 013_nullable_invite_org.sql
-- Allow team member invites (admin/member) without an organization.
-- Client invites still require an org (enforced in application code).

alter table client_invites alter column organization_id drop not null;
