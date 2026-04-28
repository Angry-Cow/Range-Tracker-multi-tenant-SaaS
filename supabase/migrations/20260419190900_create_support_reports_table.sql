/*
  # Create support_reports table

  Purpose:
  Permanently capture every user-submitted error/support report so no report is
  ever lost, even when SMTP delivery to info@rangetracker.net fails or times out.
  This table becomes the source of truth for support reports; email is a
  best-effort notification on top of it.

  1. New Tables
    - `support_reports`
      - `id` (uuid, primary key) - unique report id
      - `name` (text) - user-supplied name
      - `email` (text) - user-supplied email address
      - `description` (text) - user-supplied free text description
      - `internal_error` (text) - internal error context captured by the client
      - `error_step` (text) - which step of the flow failed
      - `source` (text) - which screen originated the report (e.g. 'register', 'payment-cancelled', 'payment-verification-failed')
      - `email_sent` (boolean) - whether the SMTP send attempt returned success
      - `email_error` (text) - error text if SMTP delivery failed, null otherwise
      - `email_attempted_at` (timestamptz) - when the SMTP send was attempted
      - `created_at` (timestamptz) - when the report row was first written

  2. Security
    - Enable RLS on `support_reports`
    - No client-accessible policies are defined. All reads/writes are performed
      by Edge Functions using the service role key, which bypasses RLS. This is
      intentional because support reports may contain information (stripe ids,
      internal error text) that must not be exposed to clients or other tenants.
*/

CREATE TABLE IF NOT EXISTS support_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  internal_error text NOT NULL DEFAULT '',
  error_step text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  email_sent boolean NOT NULL DEFAULT false,
  email_error text,
  email_attempted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS support_reports_created_at_idx
  ON support_reports (created_at DESC);

CREATE INDEX IF NOT EXISTS support_reports_email_idx
  ON support_reports (email);
