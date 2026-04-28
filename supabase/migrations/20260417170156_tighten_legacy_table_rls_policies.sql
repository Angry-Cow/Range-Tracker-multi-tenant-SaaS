/*
  # Tighten RLS on Legacy Tables

  ## Summary
  The legacy tables (shooters, range_records, setting_values) were created before the
  multi-tenant rewrite. They currently have open "Anyone can..." policies that allow
  any unauthenticated user to read, write, update, and delete all data.

  The application no longer uses these tables directly from the client. All data access
  goes through the tenant-api Edge Function using the service role key, which bypasses
  RLS entirely. Therefore, we can safely replace the open policies with deny-all policies.

  ## Changes

  ### Tables Modified
  - `shooters` — drop 4 open policies, add deny-all for all operations
  - `range_records` — drop 4 open policies, add deny-all for all operations
  - `setting_values` — drop 4 open policies, add deny-all for all operations

  ## Security Impact
  - Eliminates unauthenticated read/write access to all legacy shooter and record data
  - No application functionality is affected since all access is via service role
  - Resolves Supabase security advisor warnings about overly permissive RLS policies
*/

-- =====================
-- DROP LEGACY OPEN POLICIES: shooters
-- =====================
DROP POLICY IF EXISTS "Anyone can view shooters" ON public.shooters;
DROP POLICY IF EXISTS "Anyone can insert shooters" ON public.shooters;
DROP POLICY IF EXISTS "Anyone can update shooters" ON public.shooters;
DROP POLICY IF EXISTS "Anyone can delete shooters" ON public.shooters;

-- =====================
-- DROP LEGACY OPEN POLICIES: range_records
-- =====================
DROP POLICY IF EXISTS "Anyone can view range records" ON public.range_records;
DROP POLICY IF EXISTS "Anyone can insert range records" ON public.range_records;
DROP POLICY IF EXISTS "Anyone can update range records" ON public.range_records;
DROP POLICY IF EXISTS "Anyone can delete range records" ON public.range_records;

-- =====================
-- DROP LEGACY OPEN POLICIES: setting_values
-- =====================
DROP POLICY IF EXISTS "Anyone can view setting values" ON public.setting_values;
DROP POLICY IF EXISTS "Anyone can insert setting values" ON public.setting_values;
DROP POLICY IF EXISTS "Anyone can update setting values" ON public.setting_values;
DROP POLICY IF EXISTS "Anyone can delete setting values" ON public.setting_values;

-- =====================
-- ADD DENY-ALL POLICIES: shooters
-- All access goes through the service role key in the tenant-api Edge Function.
-- No direct client access is permitted.
-- =====================
CREATE POLICY "No direct client access to shooters"
  ON public.shooters
  FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "No direct client insert to shooters"
  ON public.shooters
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No direct client update to shooters"
  ON public.shooters
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No direct client delete to shooters"
  ON public.shooters
  FOR DELETE
  TO authenticated
  USING (false);

-- =====================
-- ADD DENY-ALL POLICIES: range_records
-- =====================
CREATE POLICY "No direct client access to range records"
  ON public.range_records
  FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "No direct client insert to range records"
  ON public.range_records
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No direct client update to range records"
  ON public.range_records
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No direct client delete to range records"
  ON public.range_records
  FOR DELETE
  TO authenticated
  USING (false);

-- =====================
-- ADD DENY-ALL POLICIES: setting_values
-- =====================
CREATE POLICY "No direct client access to setting values"
  ON public.setting_values
  FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "No direct client insert to setting values"
  ON public.setting_values
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No direct client update to setting values"
  ON public.setting_values
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No direct client delete to setting values"
  ON public.setting_values
  FOR DELETE
  TO authenticated
  USING (false);
