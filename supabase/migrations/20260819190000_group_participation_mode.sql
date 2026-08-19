-- How an organization frames assigned training: expected (mandatory programs),
-- open (voluntary), or unset (shared professional copy). Does not change
-- who can assign or who can be assigned.

alter table public.groups
  add column if not exists participation_mode text not null default 'unset';

do $$
begin
  alter table public.groups
    add constraint groups_participation_mode_check
    check (participation_mode in ('unset', 'expected', 'open'));
exception
  when duplicate_object then null;
end
$$;

comment on column public.groups.participation_mode is
  'Framing for assigned training: unset (neutral), expected (rehab/unit), open (voluntary). Copy and reminders only.';
