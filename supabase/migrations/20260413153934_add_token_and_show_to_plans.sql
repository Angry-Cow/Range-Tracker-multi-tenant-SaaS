/*
  # Add token and show columns to plans table

  1. Modified Tables
    - `plans`
      - `token` (text, nullable) - the secret token required to select this plan during registration
      - `show` (integer, default 1) - controls visibility in the plan selection dropdown; 0 = hidden, 1 = visible

  2. Notes
    - All existing plans default to show = 1 (visible)
    - token is nullable; only Founder and Promotional plans will have values set
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'token'
  ) THEN
    ALTER TABLE plans ADD COLUMN token text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'show'
  ) THEN
    ALTER TABLE plans ADD COLUMN show integer NOT NULL DEFAULT 1;
  END IF;
END $$;
