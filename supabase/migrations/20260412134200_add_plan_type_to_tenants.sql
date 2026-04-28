/*
  # Add plan_type to tenants table

  1. Modified Tables
    - `tenants`
      - `plan_type` (text) - The subscription/service plan name displayed in approval emails
        and shown to the tenant. Defaults to 'Standard'.

  2. Notes
    - Existing tenants will receive the default value of 'Standard'
    - This field is admin-managed and used in outgoing approval email communications
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE tenants ADD COLUMN plan_type text NOT NULL DEFAULT 'Standard';
  END IF;
END $$;
