/*
  # Create plans table and update tenant plan_type default

  1. New Tables
    - `plans`
      - `id` (uuid, primary key)
      - `plan_name` (text, unique) - The name of the plan
      - `plan_price` (text) - Display price in US currency format
      - `plan_description` (text) - Description of what the plan includes
      - `created_at` (timestamptz)

  2. Seed Data
    - Free: $0.00, Subject to limit of 15 Range Records
    - Monthly: $3.99, Charged Monthly. No record limits
    - Annual: $35.00, Charged Annually. No record limits
    - Promotional: $0.00, 6 months free, then select a paid plan. Subject to limit of 100 range records
    - Founder: $0.00, Free Forever. No record limits

  3. Modified Tables
    - `tenants` - change default value of `plan_type` from 'Standard' to 'Free'

  4. Security
    - Enable RLS on `plans` table
    - Admin service role can read plans (edge functions use service role key)
    - No public access needed
*/

CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text UNIQUE NOT NULL,
  plan_price text NOT NULL DEFAULT '$0.00',
  plan_description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can read plans"
  ON plans FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert plans"
  ON plans FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update plans"
  ON plans FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete plans"
  ON plans FOR DELETE
  TO service_role
  USING (true);

INSERT INTO plans (plan_name, plan_price, plan_description) VALUES
  ('Free',        '$0.00',  'Subject to limit of 15 Range Records'),
  ('Monthly',     '$3.99',  'Charged Monthly. No record limits'),
  ('Annual',      '$35.00', 'Charged Annually. No record limits'),
  ('Promotional', '$0.00',  '6 months free, then select a paid plan. Subject to limit of 100 range records'),
  ('Founder',     '$0.00',  'Free Forever. No record limits')
ON CONFLICT (plan_name) DO NOTHING;

ALTER TABLE tenants ALTER COLUMN plan_type SET DEFAULT 'Free';

UPDATE tenants SET plan_type = 'Free' WHERE plan_type = 'Standard';
