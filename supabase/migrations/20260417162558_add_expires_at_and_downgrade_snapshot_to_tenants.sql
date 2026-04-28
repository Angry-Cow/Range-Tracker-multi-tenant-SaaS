/*
  # Add expires_at and downgrade_record_snapshot to tenants table

  ## Summary
  Extends the tenants table with two new columns to support plan management features:

  1. New Columns
    - `expires_at` (timestamptz, nullable): Expiration date for Promotional plan accounts.
      Automatically set to 90 days after `created_at` when a Promotional account is created.
      NULL for all other plan types.
    - `downgrade_record_snapshot` (jsonb, nullable): Stores a snapshot of per-shooter record counts
      at the moment a paying tenant downgrades to Free. This allows the system to enforce a
      "+20 more records" limit rather than a hard cap of 20, preserving previously created records.

  2. Modified Tables
    - `tenants`: Two new columns added

  3. Backfill
    - Existing Promotional tenants get `expires_at` set to 90 days from their `created_at`

  4. Annual plan price updated to $39.99
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE tenants ADD COLUMN expires_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'downgrade_record_snapshot'
  ) THEN
    ALTER TABLE tenants ADD COLUMN downgrade_record_snapshot jsonb DEFAULT NULL;
  END IF;
END $$;

UPDATE tenants
SET expires_at = created_at + INTERVAL '90 days'
WHERE plan_type = 'Promotional' AND expires_at IS NULL;

UPDATE plans
SET plan_price = '$39.99', plan_description = 'Charged Annually. No record limits'
WHERE plan_name = 'Annual';
