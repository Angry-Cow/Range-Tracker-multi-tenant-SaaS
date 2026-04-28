/*
  # Add Stripe billing columns to tenants table

  ## Summary
  Extends the tenants table with columns needed to track Stripe subscription data.
  These columns link each tenant to their Stripe customer and subscription records,
  enabling the full subscription lifecycle (checkout, renewal, cancellation, downgrade).

  ## New Columns on tenants
  - `stripe_customer_id` (text, nullable): The Stripe Customer ID (cus_xxx) for this tenant.
    Created on first checkout and reused for all future billing operations.
  - `stripe_subscription_id` (text, nullable): The active Stripe Subscription ID (sub_xxx).
    Set when a subscription is created, cleared when it fully expires.
  - `stripe_subscription_status` (text, nullable): The Stripe subscription status string
    (e.g., "active", "past_due", "canceled"). Mirrors Stripe's status for informational use.
  - `current_period_end` (timestamptz, nullable): The exact date/time the current paid billing
    period ends. Used to determine how long a cancelled subscriber retains access. When a
    subscription is cancelled at period end, this date is when the webhook fires and the
    tenant is moved to Free.

  ## Security
  - No changes to RLS policies. These columns are updated only via the service role key
    in edge functions (webhook, checkout, portal handlers), never directly by clients.

  ## Notes
  - All columns are nullable so existing tenants are unaffected.
  - The stripe_webhook edge function is the sole writer of these columns in production.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN stripe_customer_id text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN stripe_subscription_id text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'stripe_subscription_status'
  ) THEN
    ALTER TABLE tenants ADD COLUMN stripe_subscription_status text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE tenants ADD COLUMN current_period_end timestamptz DEFAULT NULL;
  END IF;
END $$;
