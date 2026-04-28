/*
  # Drop promotional_tokens table

  ## Summary
  Removes the promotional_tokens table as it is no longer needed.

  ## Changes
  - Drops the `promotional_tokens` table if it exists
*/

DROP TABLE IF EXISTS promotional_tokens;
