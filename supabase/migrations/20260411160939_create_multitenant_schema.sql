/*
  # Multi-Tenant Schema Migration

  ## Overview
  Creates the complete multi-tenant schema for Range Tracker, replacing the
  per-PostgreSQL-schema approach with a single Supabase database using tenant_id
  foreign keys for data isolation.

  ## New Tables

  ### `tenants`
  - Stores registered organizations/users of the system
  - `id` (uuid, pk)
  - `name` (text) - contact person name
  - `email` (text, unique) - login email
  - `organization` (text) - organization name
  - `slug` (text, unique) - URL-safe identifier
  - `status` (text) - pending | active | suspended | rejected
  - `token` (text, nullable) - JWT access token (set when approved)
  - `approved_at` (timestamptz, nullable)
  - `created_at` (timestamptz)

  ### `tenant_shooters`
  - Shooters belonging to a tenant
  - Isolated by `tenant_id` FK to tenants

  ### `tenant_range_records`
  - Range session records with all 12 photo/notes slots
  - Isolated by `tenant_id` FK to tenants

  ### `tenant_setting_values`
  - Per-shooter setting values (ammo, firearms, etc.)
  - Isolated by `tenant_id` FK to tenants

  ## Security
  - RLS enabled on all tables
  - No direct client access (all access goes through service-role Edge Functions)
  - Public can only insert into tenants (registration), nothing else
*/

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  organization text NOT NULL DEFAULT '',
  slug text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  token text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Edge functions use service role key, so no RLS policy needed for them.
-- We add a restrictive policy so direct client access is blocked.
CREATE POLICY "No direct client access to tenants"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (false);

-- Tenant shooters
CREATE TABLE IF NOT EXISTS tenant_shooters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tenant_shooters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to tenant_shooters"
  ON tenant_shooters
  FOR SELECT
  TO authenticated
  USING (false);

-- Tenant range records
CREATE TABLE IF NOT EXISTS tenant_range_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  shooter_id uuid NOT NULL REFERENCES tenant_shooters(id),
  record_date date DEFAULT CURRENT_DATE,
  range_location text NOT NULL DEFAULT '',
  range_type text NOT NULL DEFAULT '',
  practice_type text NOT NULL DEFAULT '',
  target_type text NOT NULL DEFAULT '',
  target_distance text NOT NULL DEFAULT '',
  shooting_position text NOT NULL DEFAULT '',
  firearm_type text NOT NULL DEFAULT '',
  firearm_model text NOT NULL DEFAULT '',
  ammunition text NOT NULL DEFAULT '',
  conditions text NOT NULL DEFAULT '',
  weather text NOT NULL DEFAULT '',
  photo_1_url text NOT NULL DEFAULT '',
  notes_1 text NOT NULL DEFAULT '',
  photo_2_url text NOT NULL DEFAULT '',
  notes_2 text NOT NULL DEFAULT '',
  photo_3_url text NOT NULL DEFAULT '',
  notes_3 text NOT NULL DEFAULT '',
  photo_4_url text NOT NULL DEFAULT '',
  notes_4 text NOT NULL DEFAULT '',
  photo_5_url text NOT NULL DEFAULT '',
  notes_5 text NOT NULL DEFAULT '',
  photo_6_url text NOT NULL DEFAULT '',
  notes_6 text NOT NULL DEFAULT '',
  photo_7_url text NOT NULL DEFAULT '',
  notes_7 text NOT NULL DEFAULT '',
  photo_8_url text NOT NULL DEFAULT '',
  notes_8 text NOT NULL DEFAULT '',
  photo_9_url text NOT NULL DEFAULT '',
  notes_9 text NOT NULL DEFAULT '',
  photo_10_url text NOT NULL DEFAULT '',
  notes_10 text NOT NULL DEFAULT '',
  photo_11_url text NOT NULL DEFAULT '',
  notes_11 text NOT NULL DEFAULT '',
  photo_12_url text NOT NULL DEFAULT '',
  notes_12 text NOT NULL DEFAULT '',
  notes_13 text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tenant_range_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to tenant_range_records"
  ON tenant_range_records
  FOR SELECT
  TO authenticated
  USING (false);

-- Tenant setting values
CREATE TABLE IF NOT EXISTS tenant_setting_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  shooter_id uuid NOT NULL REFERENCES tenant_shooters(id),
  category text NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tenant_setting_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to tenant_setting_values"
  ON tenant_setting_values
  FOR SELECT
  TO authenticated
  USING (false);

-- Admin credentials table (stores hashed password for admin login)
CREATE TABLE IF NOT EXISTS admin_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to admin_credentials"
  ON admin_credentials
  FOR SELECT
  TO authenticated
  USING (false);

-- Insert default admin (password: admin123 - should be changed)
-- bcrypt hash of 'admin123'
INSERT INTO admin_credentials (username, password_hash)
VALUES ('admin', '$2b$10$rBnkC8OUpH2r9.faBwlnSOJIpH3.4pL94c2AJlJwDO0iFSHI0HJle')
ON CONFLICT (username) DO NOTHING;
