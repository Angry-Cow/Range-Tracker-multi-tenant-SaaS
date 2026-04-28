
/*
  # Add deny-all RLS policies for tables with RLS enabled but no policies

  ## Summary
  Three tables had RLS enabled but no policies defined, which causes a security
  scanner warning ("RLS enabled, no policy"). This migration adds explicit deny-all
  policies to make the intent clear and silence the warning.

  ## Tables affected

  1. admin_password_reset_tokens
     - Accessed exclusively via admin-api and reset-admin-password edge functions
       using the service role key (which bypasses RLS).
     - No client should ever access this table directly.

  2. support_reports
     - Accessed exclusively via send-error-report edge function using service role key.
     - No client should ever access this table directly.

  3. tenant_password_reset_tokens
     - Accessed exclusively via register edge function using service role key.
     - No client should ever access this table directly.

  ## Policy design
  All four operations (SELECT, INSERT, UPDATE, DELETE) get explicit deny-all policies
  targeting the authenticated role. This makes the lockdown explicit and auditable.
*/

-- admin_password_reset_tokens: deny all direct client access
CREATE POLICY "No direct client select on admin password reset tokens"
  ON public.admin_password_reset_tokens FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "No direct client insert on admin password reset tokens"
  ON public.admin_password_reset_tokens FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No direct client update on admin password reset tokens"
  ON public.admin_password_reset_tokens FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No direct client delete on admin password reset tokens"
  ON public.admin_password_reset_tokens FOR DELETE
  TO authenticated
  USING (false);

-- support_reports: deny all direct client access
CREATE POLICY "No direct client select on support reports"
  ON public.support_reports FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "No direct client insert on support reports"
  ON public.support_reports FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No direct client update on support reports"
  ON public.support_reports FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No direct client delete on support reports"
  ON public.support_reports FOR DELETE
  TO authenticated
  USING (false);

-- tenant_password_reset_tokens: deny all direct client access
CREATE POLICY "No direct client select on tenant password reset tokens"
  ON public.tenant_password_reset_tokens FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "No direct client insert on tenant password reset tokens"
  ON public.tenant_password_reset_tokens FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No direct client update on tenant password reset tokens"
  ON public.tenant_password_reset_tokens FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No direct client delete on tenant password reset tokens"
  ON public.tenant_password_reset_tokens FOR DELETE
  TO authenticated
  USING (false);
