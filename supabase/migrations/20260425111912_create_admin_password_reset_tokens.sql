/*
  # Create admin_password_reset_tokens table

  ## Purpose
  Stores short-lived tokens used for admin password reset emails.

  ## New Tables
  - `admin_password_reset_tokens`
    - `id` (uuid, primary key)
    - `token` (text, unique) — the random token included in the reset link
    - `used` (boolean) — true once the token has been consumed
    - `created_at` (timestamptz) — used to enforce a 1-hour expiry

  ## Security
  - RLS is enabled
  - Only the service role (used by the edge function) can insert, select, and update rows.
    Authenticated and anon roles have no access.

  ## Notes
  - Tokens expire after 1 hour (enforced in application logic, not SQL)
  - Tokens are single-use (marked used=true after consumption)
*/

CREATE TABLE IF NOT EXISTS admin_password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS entirely, so no explicit policy is needed for
-- the edge function. We intentionally leave anon/authenticated with no access.
