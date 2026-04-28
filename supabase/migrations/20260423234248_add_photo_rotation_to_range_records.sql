/*
  # Add photo rotation columns to range_records and tenant_range_records

  ## Summary
  Adds 12 integer columns (photo_1_rotation through photo_12_rotation) to both the
  legacy range_records table and the multi-tenant tenant_range_records table.

  Each column stores the cumulative clockwise rotation in degrees (0, 90, 180, 270).
  Defaults to 0 (no rotation). A NULL is treated as 0 throughout the app.

  ## New Columns (both tables)
  - `photo_1_rotation` through `photo_12_rotation` (integer, DEFAULT 0)
*/

DO $$
DECLARE
  i integer;
BEGIN
  FOR i IN 1..12 LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'range_records' AND column_name = 'photo_' || i || '_rotation'
    ) THEN
      EXECUTE 'ALTER TABLE range_records ADD COLUMN photo_' || i || '_rotation integer NOT NULL DEFAULT 0';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tenant_range_records' AND column_name = 'photo_' || i || '_rotation'
    ) THEN
      EXECUTE 'ALTER TABLE tenant_range_records ADD COLUMN photo_' || i || '_rotation integer NOT NULL DEFAULT 0';
    END IF;
  END LOOP;
END $$;
