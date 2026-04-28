/*
  # Add token_value column to founder_tokens_used and promotional_tokens_used

  ## Summary
  Adds a `token_value` column to both token tracking tables. This column stores the
  actual plan token string (e.g. '5#!&%' for Founder, '80343' for Promotional) at the
  time a code is redeemed, so each redeemed row records which plan token was in use.

  ## Changes

  1. Modified Tables
    - `founder_tokens_used`
      - `token_value` (text, nullable) - the value from plans.token for the Founder plan at redemption time
    - `promotional_tokens_used`
      - `token_value` (text, nullable) - the value from plans.token for the Promotional plan at redemption time

  ## Notes
  - NULL means the code has not yet been redeemed
  - A non-NULL token_value indicates the code has been redeemed and records the plan token that was active
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'founder_tokens_used' AND column_name = 'token_value'
  ) THEN
    ALTER TABLE founder_tokens_used ADD COLUMN token_value text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promotional_tokens_used' AND column_name = 'token_value'
  ) THEN
    ALTER TABLE promotional_tokens_used ADD COLUMN token_value text DEFAULT NULL;
  END IF;
END $$;
