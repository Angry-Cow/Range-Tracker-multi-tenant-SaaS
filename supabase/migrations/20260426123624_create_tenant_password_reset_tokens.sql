/*
  # Create tenant_password_reset_tokens table

  ## Purpose
  Stores short-lived tokens used for tenant (user) password reset emails.

  ## New Tables
  - `tenant_password_reset_tokens`
    - `id` (uuid, primary key)
    - `token` (text, unique) — the random token included in the reset link
    - `tenant_email` (text) — the email address the reset was requested for
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

CREATE TABLE IF NOT EXISTS tenant_password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  tenant_email text NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tenant_password_reset_tokens ENABLE ROW LEVEL SECURITY;
