-- Snapshot the issuer's displayed name on the certificate so fathers can
-- see it. They cannot read the leader profile under profiles_select.
-- Down path: alter table public.certificates drop column if exists issuer_name;

alter table public.certificates
  add column if not exists issuer_name text;

alter table public.certificates
  drop constraint if exists certificates_issuer_name_len;

alter table public.certificates
  add constraint certificates_issuer_name_len
  check (issuer_name is null or char_length(issuer_name) between 1 and 80);

comment on column public.certificates.issuer_name is
  'Displayed name of the leader who issued the certificate. Frozen at issue.';

update public.certificates as cert
set issuer_name = left(trim(leader.full_name), 80)
from public.profiles as leader
where cert.issued_by = leader.id
  and cert.issuer_name is null
  and leader.full_name is not null
  and char_length(trim(leader.full_name)) > 0;
