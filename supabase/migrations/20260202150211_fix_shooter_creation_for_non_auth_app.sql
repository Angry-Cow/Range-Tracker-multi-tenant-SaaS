/*
  # Fix Shooter Creation for Non-Authenticated App

  ## Summary
  This migration restores public access to shooters, setting_values, and range_records
  tables to support the application's original design as a non-authenticated app.

  ## Changes Made

  ### 1. Make user_id Optional on Shooters
  - Change user_id column to nullable to support non-authenticated usage
  - Allows shooters to be created without requiring authentication

  ### 2. Restore Public Access Policies
  - Recreate policies for shooters, setting_values, and range_records
  - Allow public access (no authentication required) for these tables
  - Maintains the original app design while keeping other tables secure

  ## Security Notes
  - The firearms, ammunition, range_sessions, and session_details tables remain
    protected and require authentication
  - Shooters, setting_values, and range_records are public access as originally designed
*/

-- ============================================================================
-- 1. Make user_id nullable on shooters table
-- ============================================================================

ALTER TABLE shooters ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================================
-- 2. Restore Public Access Policies
-- ============================================================================

-- Drop authenticated-only policies on shooters
DROP POLICY IF EXISTS "Users can view own shooters" ON shooters;
DROP POLICY IF EXISTS "Users can insert own shooters" ON shooters;
DROP POLICY IF EXISTS "Users can update own shooters" ON shooters;
DROP POLICY IF EXISTS "Users can delete own shooters" ON shooters;

-- Recreate public access policies for shooters
CREATE POLICY "Anyone can view shooters"
  ON shooters FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert shooters"
  ON shooters FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update shooters"
  ON shooters FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete shooters"
  ON shooters FOR DELETE
  TO public
  USING (true);

-- Drop authenticated-only policies on setting_values
DROP POLICY IF EXISTS "Users can view own setting values" ON setting_values;
DROP POLICY IF EXISTS "Users can insert own setting values" ON setting_values;
DROP POLICY IF EXISTS "Users can update own setting values" ON setting_values;
DROP POLICY IF EXISTS "Users can delete own setting values" ON setting_values;

-- Recreate public access policies for setting_values
CREATE POLICY "Anyone can view setting values"
  ON setting_values FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert setting values"
  ON setting_values FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update setting values"
  ON setting_values FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete setting values"
  ON setting_values FOR DELETE
  TO public
  USING (true);

-- Drop authenticated-only policies on range_records
DROP POLICY IF EXISTS "Users can view own range records" ON range_records;
DROP POLICY IF EXISTS "Users can insert own range records" ON range_records;
DROP POLICY IF EXISTS "Users can update own range records" ON range_records;
DROP POLICY IF EXISTS "Users can delete own range records" ON range_records;

-- Recreate public access policies for range_records
CREATE POLICY "Anyone can view range records"
  ON range_records FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert range records"
  ON range_records FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update range records"
  ON range_records FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete range records"
  ON range_records FOR DELETE
  TO public
  USING (true);