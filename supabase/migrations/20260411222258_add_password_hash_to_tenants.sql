/*
  # Add password_hash to tenants table

  ## Summary
  Adds password authentication to tenant accounts so tenants must provide
  a password when registering and when logging in.

  ## Changes
  - `tenants` table: new `password_hash` column (text, nullable to allow
    existing rows to remain intact without breaking anything)

  ## Notes
  - Nullable so existing tenant rows are unaffected
  - The register and login edge functions handle bcrypt hashing/verification
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE tenants ADD COLUMN password_hash text;
  END IF;
END $$;
