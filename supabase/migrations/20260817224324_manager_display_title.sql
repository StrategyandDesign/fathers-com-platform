-- How a manager is named in their own chrome. Does not change
-- profiles.role, Auth app_metadata, RLS, or /manager routes.
-- Leader is a display preference for informal groups.

alter table public.profiles
  add column if not exists display_title text not null default 'manager';

alter table public.profiles
  drop constraint if exists profiles_display_title_check;

alter table public.profiles
  add constraint profiles_display_title_check
  check (display_title in ('manager', 'leader'));

comment on column public.profiles.display_title is
  'Chrome designation for managers: manager or leader. Ignored unless profiles.role is manager. Does not change permissions.';
