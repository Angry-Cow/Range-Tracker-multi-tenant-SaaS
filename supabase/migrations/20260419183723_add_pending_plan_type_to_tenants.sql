/*
  # Add Pending Plan Tracking to Tenants

  1. Purpose
    - Record when a tenant has requested a paid plan but the Stripe payment
      has not yet been confirmed by the webhook. This allows the app to
      reliably detect abandoned / failed checkouts and block access until
      resolved.

  2. Columns Added to `tenants`
    - `pending_plan_type` (text, nullable)
      - Holds the paid plan name ("Monthly" or "Annual") the user intended
        to purchase. Set at registration or retry. Cleared by the Stripe
        webhook when payment succeeds.
    - `payment_attempt_started_at` (timestamptz, nullable)
      - Timestamp recorded when a checkout session is generated, used to
        detect stale attempts.

  3. Security
    - No new RLS policies required; existing tenant policies already cover
      all columns. Column additions inherit existing access rules.

  4. Notes
    1. Safe, additive migration. No data is destroyed.
    2. Columns are nullable so existing tenants are unaffected.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'pending_plan_type'
  ) THEN
    ALTER TABLE tenants ADD COLUMN pending_plan_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'payment_attempt_started_at'
  ) THEN
    ALTER TABLE tenants ADD COLUMN payment_attempt_started_at timestamptz;
  END IF;
END $$;
