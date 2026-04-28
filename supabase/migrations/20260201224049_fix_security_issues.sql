/*
  # Fix Security and Performance Issues

  ## Summary
  This migration addresses critical security vulnerabilities and performance optimizations
  identified by Supabase security analysis.

  ## Changes Made

  ### 1. Performance Optimizations - Add Missing Indexes
  Add indexes on all foreign key columns to improve query performance:
  - ammunition.user_id
  - firearms.user_id
  - range_sessions.user_id
  - session_details.ammunition_id
  - session_details.firearm_id
  - session_details.session_id

  ### 2. Remove Unused Indexes
  Remove indexes that are not being used by any queries:
  - idx_setting_values_category
  - idx_range_records_date

  ### 3. Optimize RLS Policies
  Replace direct auth.uid() calls with (select auth.uid()) to prevent
  re-evaluation for each row, significantly improving performance:
  - All policies on firearms table (4 policies)
  - All policies on ammunition table (4 policies)
  - All policies on range_sessions table (4 policies)
  - All policies on session_details table (4 policies)

  ### 4. Fix Critical Security Issues - Add User Ownership
  Add user_id column to shooters table and update all RLS policies to
  enforce proper authentication and ownership:
  - Add user_id to shooters table (references auth.users)
  - Replace all "USING (true)" policies with proper authentication checks
  - Update policies on shooters, setting_values, and range_records tables

  ## Security Notes
  After this migration:
  - All data requires authentication
  - Users can only access their own data
  - Foreign keys are properly indexed for performance
  - RLS policies are optimized to prevent repeated function calls
*/

-- ============================================================================
-- 1. Add Missing Foreign Key Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ammunition_user_id ON ammunition(user_id);
CREATE INDEX IF NOT EXISTS idx_firearms_user_id ON firearms(user_id);
CREATE INDEX IF NOT EXISTS idx_range_sessions_user_id ON range_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_details_ammunition_id ON session_details(ammunition_id);
CREATE INDEX IF NOT EXISTS idx_session_details_firearm_id ON session_details(firearm_id);
CREATE INDEX IF NOT EXISTS idx_session_details_session_id ON session_details(session_id);

-- ============================================================================
-- 2. Remove Unused Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_setting_values_category;
DROP INDEX IF EXISTS idx_range_records_date;

-- ============================================================================
-- 3. Add user_id to shooters table for proper ownership
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shooters' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE shooters ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_shooters_user_id ON shooters(user_id);
  END IF;
END $$;

-- ============================================================================
-- 4. Recreate RLS Policies with Proper Security
-- ============================================================================

-- Drop all existing insecure policies on shooters
DROP POLICY IF EXISTS "Anyone can view shooters" ON shooters;
DROP POLICY IF EXISTS "Anyone can insert shooters" ON shooters;
DROP POLICY IF EXISTS "Anyone can update shooters" ON shooters;
DROP POLICY IF EXISTS "Anyone can delete shooters" ON shooters;

-- Create secure policies for shooters
CREATE POLICY "Users can view own shooters"
  ON shooters FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own shooters"
  ON shooters FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own shooters"
  ON shooters FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own shooters"
  ON shooters FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Drop all existing insecure policies on setting_values
DROP POLICY IF EXISTS "Anyone can view setting values" ON setting_values;
DROP POLICY IF EXISTS "Anyone can insert setting values" ON setting_values;
DROP POLICY IF EXISTS "Anyone can update setting values" ON setting_values;
DROP POLICY IF EXISTS "Anyone can delete setting values" ON setting_values;

-- Create secure policies for setting_values (checking ownership through shooters)
CREATE POLICY "Users can view own setting values"
  ON setting_values FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shooters
      WHERE shooters.id = setting_values.shooter_id
      AND shooters.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own setting values"
  ON setting_values FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shooters
      WHERE shooters.id = setting_values.shooter_id
      AND shooters.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own setting values"
  ON setting_values FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shooters
      WHERE shooters.id = setting_values.shooter_id
      AND shooters.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shooters
      WHERE shooters.id = setting_values.shooter_id
      AND shooters.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own setting values"
  ON setting_values FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shooters
      WHERE shooters.id = setting_values.shooter_id
      AND shooters.user_id = (select auth.uid())
    )
  );

-- Drop all existing insecure policies on range_records
DROP POLICY IF EXISTS "Anyone can view range records" ON range_records;
DROP POLICY IF EXISTS "Anyone can insert range records" ON range_records;
DROP POLICY IF EXISTS "Anyone can update range records" ON range_records;
DROP POLICY IF EXISTS "Anyone can delete range records" ON range_records;

-- Create secure policies for range_records (checking ownership through shooters)
CREATE POLICY "Users can view own range records"
  ON range_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shooters
      WHERE shooters.id = range_records.shooter_id
      AND shooters.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own range records"
  ON range_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shooters
      WHERE shooters.id = range_records.shooter_id
      AND shooters.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own range records"
  ON range_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shooters
      WHERE shooters.id = range_records.shooter_id
      AND shooters.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shooters
      WHERE shooters.id = range_records.shooter_id
      AND shooters.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own range records"
  ON range_records FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shooters
      WHERE shooters.id = range_records.shooter_id
      AND shooters.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 5. Optimize Existing RLS Policies on Other Tables
-- ============================================================================

-- Firearms table - recreate policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can view own firearms" ON firearms;
DROP POLICY IF EXISTS "Users can insert own firearms" ON firearms;
DROP POLICY IF EXISTS "Users can update own firearms" ON firearms;
DROP POLICY IF EXISTS "Users can delete own firearms" ON firearms;

CREATE POLICY "Users can view own firearms"
  ON firearms FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own firearms"
  ON firearms FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own firearms"
  ON firearms FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own firearms"
  ON firearms FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Ammunition table - recreate policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can view own ammunition" ON ammunition;
DROP POLICY IF EXISTS "Users can insert own ammunition" ON ammunition;
DROP POLICY IF EXISTS "Users can update own ammunition" ON ammunition;
DROP POLICY IF EXISTS "Users can delete own ammunition" ON ammunition;

CREATE POLICY "Users can view own ammunition"
  ON ammunition FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own ammunition"
  ON ammunition FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own ammunition"
  ON ammunition FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own ammunition"
  ON ammunition FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Range sessions table - recreate policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can view own range sessions" ON range_sessions;
DROP POLICY IF EXISTS "Users can insert own range sessions" ON range_sessions;
DROP POLICY IF EXISTS "Users can update own range sessions" ON range_sessions;
DROP POLICY IF EXISTS "Users can delete own range sessions" ON range_sessions;

CREATE POLICY "Users can view own range sessions"
  ON range_sessions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own range sessions"
  ON range_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own range sessions"
  ON range_sessions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own range sessions"
  ON range_sessions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Session details table - recreate policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can view own session details" ON session_details;
DROP POLICY IF EXISTS "Users can insert own session details" ON session_details;
DROP POLICY IF EXISTS "Users can update own session details" ON session_details;
DROP POLICY IF EXISTS "Users can delete own session details" ON session_details;

CREATE POLICY "Users can view own session details"
  ON session_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM range_sessions
      WHERE range_sessions.id = session_details.session_id
      AND range_sessions.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own session details"
  ON session_details FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM range_sessions
      WHERE range_sessions.id = session_details.session_id
      AND range_sessions.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own session details"
  ON session_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM range_sessions
      WHERE range_sessions.id = session_details.session_id
      AND range_sessions.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM range_sessions
      WHERE range_sessions.id = session_details.session_id
      AND range_sessions.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own session details"
  ON session_details FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM range_sessions
      WHERE range_sessions.id = session_details.session_id
      AND range_sessions.user_id = (select auth.uid())
    )
  );