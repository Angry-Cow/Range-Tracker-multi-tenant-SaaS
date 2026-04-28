/*
  # Create founder_tokens_used table

  1. New Tables
    - `founder_tokens_used`
      - `id` (uuid, primary key)
      - `code` (text, unique) - the 5-digit founder promotional code
      - `redeemed_by_tenant_id` (uuid, nullable, FK to tenants) - which tenant redeemed this code
      - `redeemed_at` (timestamp, nullable) - when it was redeemed
      - `created_at` (timestamp, default now())

  2. Security
    - RLS enabled
    - Only service role can insert/update (codes are pre-populated and managed server-side)
    - No direct public read access

  3. Notes
    - Pre-populated with the same 500 codes stored in promotional_tokens
    - A code with redeemed_by_tenant_id = NULL means it is unused and available
*/

CREATE TABLE IF NOT EXISTS founder_tokens_used (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  redeemed_by_tenant_id uuid REFERENCES tenants(id),
  redeemed_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE founder_tokens_used ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage founder tokens"
  ON founder_tokens_used
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert founder tokens"
  ON founder_tokens_used
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update founder tokens"
  ON founder_tokens_used
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO founder_tokens_used (code)
SELECT code FROM promotional_tokens
ON CONFLICT (code) DO NOTHING;
