/*
  # Add site_name to tenants table

  ## Overview
  Adds a `site_name` column to the `tenants` table to serve as the URL identifier
  for each tenant's site (e.g., <sitename>.rangetracker.net).

  ## Changes

  ### Modified Tables
  - `tenants`
    - `site_name` (text, unique, not null) - URL-safe site identifier used as the slug

  ## Notes
  1. The `site_name` column is added with a default empty string to avoid breaking existing rows.
  2. A unique constraint is enforced so no two tenants share the same site URL.
  3. Existing rows will have an empty site_name; administrators should update them manually or
     they will be updated when the slug is regenerated.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'site_name'
  ) THEN
    ALTER TABLE tenants ADD COLUMN site_name text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'tenants' AND indexname = 'tenants_site_name_key'
  ) THEN
    CREATE UNIQUE INDEX tenants_site_name_key ON tenants (site_name) WHERE site_name != '';
  END IF;
END $$;
