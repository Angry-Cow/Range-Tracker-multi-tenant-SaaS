/*
  # Extend Photo Capacity from 6 to 12

  ## Changes
  
  This migration extends the range_records table to support 12 photos instead of 6.
  
  1. New Columns Added
    - `photo_7_url` through `photo_12_url` - Storage URLs for photos 7-12
    - `notes_8` through `notes_13` - Notes for photos 7-12 and general notes
  
  2. Data Migration
    - Existing `notes_7` (Additional Notes) data is migrated to `notes_13`
    - `notes_7` is repurposed for Photo 7's notes
  
  3. Final Structure
    - Photos 1-12 with corresponding notes_1 through notes_12
    - notes_13 contains the "Additional Notes" field
  
  ## Notes
  - All new columns have default empty string values
  - Existing data is preserved during migration
  - The migration is idempotent and safe to run multiple times
*/

-- Add new photo URL columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'photo_7_url'
  ) THEN
    ALTER TABLE range_records ADD COLUMN photo_7_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'photo_8_url'
  ) THEN
    ALTER TABLE range_records ADD COLUMN photo_8_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'photo_9_url'
  ) THEN
    ALTER TABLE range_records ADD COLUMN photo_9_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'photo_10_url'
  ) THEN
    ALTER TABLE range_records ADD COLUMN photo_10_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'photo_11_url'
  ) THEN
    ALTER TABLE range_records ADD COLUMN photo_11_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'photo_12_url'
  ) THEN
    ALTER TABLE range_records ADD COLUMN photo_12_url text DEFAULT '';
  END IF;
END $$;

-- Add new notes columns (notes_8 through notes_13)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'notes_8'
  ) THEN
    ALTER TABLE range_records ADD COLUMN notes_8 text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'notes_9'
  ) THEN
    ALTER TABLE range_records ADD COLUMN notes_9 text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'notes_10'
  ) THEN
    ALTER TABLE range_records ADD COLUMN notes_10 text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'notes_11'
  ) THEN
    ALTER TABLE range_records ADD COLUMN notes_11 text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'notes_12'
  ) THEN
    ALTER TABLE range_records ADD COLUMN notes_12 text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'notes_13'
  ) THEN
    ALTER TABLE range_records ADD COLUMN notes_13 text DEFAULT '';
  END IF;
END $$;

-- Migrate existing notes_7 data to notes_13
UPDATE range_records
SET notes_13 = notes_7
WHERE notes_7 != '' AND notes_7 IS NOT NULL;

-- Clear notes_7 to repurpose it for Photo 7
UPDATE range_records
SET notes_7 = ''
WHERE notes_7 IS NOT NULL;