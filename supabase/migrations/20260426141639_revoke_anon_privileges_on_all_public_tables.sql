
/*
  # Revoke anon role privileges on all public tables

  ## Summary
  Revokes all privileges granted to the `anon` role on every table in the `public` schema.
  This prevents pg_graphql from exposing these tables in the public /graphql/v1 introspection
  endpoint, and removes any accidental broad access grants.

  ## Why this is safe
  - All application data access goes through Edge Functions using the service role key,
    which bypasses RLS entirely and is unaffected by GRANT/REVOKE.
  - Every table already has RLS enabled with deny-all policies, so anon could not read
    actual data even with SELECT privileges. Revoking removes the privilege at the
    table-grant level as an additional hardening layer.
  - The frontend never queries these tables directly with the anon key.

  ## Tables affected
  All 20 tables in the public schema:
    admin_audit_log, admin_credentials, admin_password_reset_tokens,
    ammunition, firearms, founder_tokens_used, plans, promotional_tokens_used,
    range_records, range_sessions, rate_limit_attempts, session_details,
    setting_values, shooters, support_reports, tenant_password_reset_tokens,
    tenant_range_records, tenant_setting_values, tenant_shooters, tenants
*/

REVOKE ALL ON TABLE public.admin_audit_log FROM anon;
REVOKE ALL ON TABLE public.admin_credentials FROM anon;
REVOKE ALL ON TABLE public.admin_password_reset_tokens FROM anon;
REVOKE ALL ON TABLE public.ammunition FROM anon;
REVOKE ALL ON TABLE public.firearms FROM anon;
REVOKE ALL ON TABLE public.founder_tokens_used FROM anon;
REVOKE ALL ON TABLE public.plans FROM anon;
REVOKE ALL ON TABLE public.promotional_tokens_used FROM anon;
REVOKE ALL ON TABLE public.range_records FROM anon;
REVOKE ALL ON TABLE public.range_sessions FROM anon;
REVOKE ALL ON TABLE public.rate_limit_attempts FROM anon;
REVOKE ALL ON TABLE public.session_details FROM anon;
REVOKE ALL ON TABLE public.setting_values FROM anon;
REVOKE ALL ON TABLE public.shooters FROM anon;
REVOKE ALL ON TABLE public.support_reports FROM anon;
REVOKE ALL ON TABLE public.tenant_password_reset_tokens FROM anon;
REVOKE ALL ON TABLE public.tenant_range_records FROM anon;
REVOKE ALL ON TABLE public.tenant_setting_values FROM anon;
REVOKE ALL ON TABLE public.tenant_shooters FROM anon;
REVOKE ALL ON TABLE public.tenants FROM anon;
