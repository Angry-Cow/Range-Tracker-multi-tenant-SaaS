/*
  # Create promotional_tokens_used table

  1. New Tables
    - `promotional_tokens_used`
      - `id` (uuid, primary key)
      - `code` (text, unique) - the 5-digit promotional code
      - `redeemed_by_tenant_id` (uuid, nullable, FK to tenants) - which tenant redeemed this code
      - `redeemed_at` (timestamp, nullable) - when it was redeemed
      - `created_at` (timestamp, default now())

  2. Security
    - RLS enabled
    - Only service role can manage (codes are pre-populated and managed server-side)

  3. Notes
    - Pre-populated with the same 500 codes stored in promotional_tokens
    - A code with redeemed_by_tenant_id = NULL means it is unused and available
    - Separate table from founder_tokens_used to allow independent tracking of each pool
*/

CREATE TABLE IF NOT EXISTS promotional_tokens_used (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  redeemed_by_tenant_id uuid REFERENCES tenants(id),
  redeemed_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE promotional_tokens_used ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can select promotional tokens used"
  ON promotional_tokens_used
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert promotional tokens used"
  ON promotional_tokens_used
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update promotional tokens used"
  ON promotional_tokens_used
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO promotional_tokens_used (code)
SELECT code FROM promotional_tokens
ON CONFLICT (code) DO NOTHING;
