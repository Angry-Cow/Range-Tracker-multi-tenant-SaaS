/*
  # Add has_photos flag to range records tables

  ## Summary
  Adds a boolean `has_photos` column to both `tenant_range_records` and the legacy
  `range_records` table. This flag is set by the application at save time and allows
  the list view in PreviousRecordsScreen to show a camera icon without fetching all
  13 photo URL columns for every record in the list.

  ## Changes

  ### tenant_range_records
  - Add `has_photos` (boolean, DEFAULT false) column
  - Backfill: set true for any record where at least one of photo_1_url through photo_13_url is non-empty

  ### range_records (legacy TOLR tenant)
  - Same column addition and backfill

  ## Notes
  - The application is responsible for keeping this flag in sync on every INSERT/UPDATE.
  - On record save, if all 13 photo URL fields are empty, has_photos is set to false.
  - No DB trigger is used — the edge function sets this value explicitly.
*/

-- tenant_range_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_range_records' AND column_name = 'has_photos'
  ) THEN
    ALTER TABLE tenant_range_records ADD COLUMN has_photos boolean DEFAULT false;
  END IF;
END $$;

UPDATE tenant_range_records
SET has_photos = (
  (photo_1_url  IS NOT NULL AND photo_1_url  <> '') OR
  (photo_2_url  IS NOT NULL AND photo_2_url  <> '') OR
  (photo_3_url  IS NOT NULL AND photo_3_url  <> '') OR
  (photo_4_url  IS NOT NULL AND photo_4_url  <> '') OR
  (photo_5_url  IS NOT NULL AND photo_5_url  <> '') OR
  (photo_6_url  IS NOT NULL AND photo_6_url  <> '') OR
  (photo_7_url  IS NOT NULL AND photo_7_url  <> '') OR
  (photo_8_url  IS NOT NULL AND photo_8_url  <> '') OR
  (photo_9_url  IS NOT NULL AND photo_9_url  <> '') OR
  (photo_10_url IS NOT NULL AND photo_10_url <> '') OR
  (photo_11_url IS NOT NULL AND photo_11_url <> '') OR
  (photo_12_url IS NOT NULL AND photo_12_url <> '') OR
  (photo_13_url IS NOT NULL AND photo_13_url <> '')
);

-- range_records (legacy TOLR)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'has_photos'
  ) THEN
    ALTER TABLE range_records ADD COLUMN has_photos boolean DEFAULT false;
  END IF;
END $$;

UPDATE range_records
SET has_photos = (
  (photo_1_url  IS NOT NULL AND photo_1_url  <> '') OR
  (photo_2_url  IS NOT NULL AND photo_2_url  <> '') OR
  (photo_3_url  IS NOT NULL AND photo_3_url  <> '') OR
  (photo_4_url  IS NOT NULL AND photo_4_url  <> '') OR
  (photo_5_url  IS NOT NULL AND photo_5_url  <> '') OR
  (photo_6_url  IS NOT NULL AND photo_6_url  <> '') OR
  (photo_7_url  IS NOT NULL AND photo_7_url  <> '') OR
  (photo_8_url  IS NOT NULL AND photo_8_url  <> '') OR
  (photo_9_url  IS NOT NULL AND photo_9_url  <> '') OR
  (photo_10_url IS NOT NULL AND photo_10_url <> '') OR
  (photo_11_url IS NOT NULL AND photo_11_url <> '') OR
  (photo_12_url IS NOT NULL AND photo_12_url <> '') OR
  (photo_13_url IS NOT NULL AND photo_13_url <> '')
);
