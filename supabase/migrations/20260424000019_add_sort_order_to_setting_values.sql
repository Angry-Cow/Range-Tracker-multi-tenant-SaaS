/*
  # Add sort_order to setting_values and tenant_setting_values

  ## Summary
  Adds a `sort_order` integer column to both the legacy `setting_values` table and the
  multi-tenant `tenant_setting_values` table. This allows users to manually reorder
  their dropdown options per category.

  ## Changes

  ### Both tables
  - `sort_order` (integer, NOT NULL, DEFAULT 0) — position within a category. Lower = higher in list.

  ## Notes
  - Existing rows get DEFAULT 0. The app normalizes these to sequential values on first
    load/reorder by assigning 0, 1, 2, ... based on their current display order.
  - Sort order is scoped per (shooter_id, category) — two different categories can both
    have items at position 0 without conflict.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'setting_values' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE setting_values ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_setting_values' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE tenant_setting_values ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
  END IF;
END $$;
