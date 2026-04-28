/*
  # Create rate_limit_attempts and admin_audit_log tables

  ## Summary
  Two new tables to support security improvements:

  ### 1. rate_limit_attempts
  Tracks inbound requests by IP address for rate limiting purposes on public endpoints.
  - `id` — primary key
  - `ip` — the client IP (from X-Forwarded-For or CF-Connecting-IP)
  - `endpoint` — which endpoint was hit (e.g. 'register', 'send-error-report')
  - `attempted_at` — timestamp of the attempt

  Old rows are expired via a partial index; a scheduled cleanup or TTL policy can prune rows
  older than 1 hour since the window is 1 hour.

  ### 2. admin_audit_log
  Append-only log of all sensitive admin actions.
  - `id` — primary key
  - `admin_username` — which admin performed the action
  - `action` — the action taken (e.g. 'approve', 'suspend', 'delete', 'set-plan', 'login', 'failed-login')
  - `target_tenant_id` — optional tenant ID affected by the action
  - `details` — optional JSONB for extra context (e.g. new plan_type)
  - `created_at` — when the action occurred

  Rows older than 6 months are eligible for cleanup (enforced by application logic or a scheduled job).

  ## Security
  - RLS enabled on both tables
  - No public access; only service role (used by Edge Functions) can insert/read
  - No DELETE policy (audit log is append-only from RLS perspective)
*/

-- Rate limit attempts table
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  endpoint text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint_time
  ON rate_limit_attempts (ip, endpoint, attempted_at DESC);

ALTER TABLE rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Service role only — Edge Functions use service role key
CREATE POLICY "Service role can insert rate limit attempts"
  ON rate_limit_attempts FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select rate limit attempts"
  ON rate_limit_attempts FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can delete rate limit attempts"
  ON rate_limit_attempts FOR DELETE
  TO service_role
  USING (true);

-- Admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_username text NOT NULL DEFAULT 'admin',
  action text NOT NULL,
  target_tenant_id uuid NULL,
  details jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action
  ON admin_audit_log (action);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert audit log"
  ON admin_audit_log FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select audit log"
  ON admin_audit_log FOR SELECT
  TO service_role
  USING (true);
