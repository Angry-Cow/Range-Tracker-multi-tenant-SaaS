/*
  # Rename notes_13 to additional_notes, add photo 13 notes/photo columns

  ## Summary
  The existing notes_13 column was used as a free-form "Additional Notes" field,
  not tied to any photo. We are adding a true 13th photo slot, which needs its own
  notes_13 column. To avoid data loss, existing notes_13 data is migrated to a new
  additional_notes column first.

  ## Changes to tenant_range_records and range_records:
  1. Add additional_notes (text) column
  2. Copy existing notes_13 data into additional_notes
  3. notes_13 column already exists — it now serves as photo 13 notes (emptied of old data after migration)
  4. photo_13_url and photo_13_rotation were already added in the prior migration

  ## Data migration
  - All existing notes_13 values are preserved in additional_notes
  - notes_13 is cleared so it cleanly represents photo 13 notes going forward
*/

-- tenant_range_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_range_records' AND column_name = 'additional_notes'
  ) THEN
    ALTER TABLE tenant_range_records ADD COLUMN additional_notes text DEFAULT '';
  END IF;
END $$;

UPDATE tenant_range_records
SET additional_notes = notes_13
WHERE notes_13 IS NOT NULL AND notes_13 <> '';

UPDATE tenant_range_records
SET notes_13 = ''
WHERE notes_13 IS NOT NULL;

-- range_records (legacy TOLR tenant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'range_records' AND column_name = 'additional_notes'
  ) THEN
    ALTER TABLE range_records ADD COLUMN additional_notes text DEFAULT '';
  END IF;
END $$;

UPDATE range_records
SET additional_notes = notes_13
WHERE notes_13 IS NOT NULL AND notes_13 <> '';

UPDATE range_records
SET notes_13 = ''
WHERE notes_13 IS NOT NULL;
