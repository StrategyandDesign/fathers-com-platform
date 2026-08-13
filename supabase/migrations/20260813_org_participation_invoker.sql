-- org_participation was a security-definer-style view (reloptions null on prod).
-- GRANT SELECT TO authenticated therefore bypassed seats RLS and could leak
-- other orgs' emails. Invoker mode honors seats RLS: org leaders see their org only.
alter view public.org_participation set (security_invoker = true);
