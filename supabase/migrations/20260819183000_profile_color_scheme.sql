-- Account palette: dark (default) or light. Header chrome stays black in both.
-- Users update their own row through the existing profiles_update_own policy.

alter table public.profiles
  add column if not exists color_scheme text;

alter table public.profiles
  drop constraint if exists profiles_color_scheme_check;

alter table public.profiles
  add constraint profiles_color_scheme_check
  check (color_scheme is null or color_scheme in ('dark', 'light'));

comment on column public.profiles.color_scheme is
  'Account palette. dark is the product default. light is the optional second palette. Null means no stored choice yet.';
