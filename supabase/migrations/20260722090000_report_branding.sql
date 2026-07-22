-- Report branding: the ONLY things a designated course creator can change on the
-- assessment completion report are two logos and the highlight colors. One row,
-- read by everyone (the report renders publicly), written only by instructor/admin
-- via the existing has_role() definer helper. Idempotent.

create table if not exists public.report_branding (
  id int primary key default 1 check (id = 1),
  logo_primary text,
  logo_secondary text,
  accent text not null default '#E8E84A',
  accent2 text not null default '#B08D57',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.report_branding enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies
    where schemaname='public' and tablename='report_branding'
  loop execute format('drop policy if exists %I on public.report_branding', p.policyname); end loop;
end $$;

create policy "branding readable by all"
  on public.report_branding for select
  to anon, authenticated
  using (true);

create policy "branding written by creators"
  on public.report_branding for insert
  to authenticated
  with check (public.has_role('admin') or public.has_role('instructor'));

create policy "branding updated by creators"
  on public.report_branding for update
  to authenticated
  using (public.has_role('admin') or public.has_role('instructor'))
  with check (public.has_role('admin') or public.has_role('instructor'));

grant select on public.report_branding to anon, authenticated;
grant insert, update on public.report_branding to authenticated;

insert into public.report_branding (id) values (1) on conflict (id) do nothing;

select 'report_branding ready' as status,
  (select count(*) from public.report_branding) as rows;
