/*
  # Range Tracker Database Schema

  ## Overview
  Creates the complete database schema for the Range Tracker application,
  including tables for shooters, settings, and range records.

  ## Tables Created

  1. **shooters**
     - `id` (uuid, primary key) - Unique identifier
     - `first_name` (text) - Shooter's first name
     - `last_name` (text) - Shooter's last name
     - `email` (text) - Contact email
     - `phone` (text) - Phone number
     - `notes` (text) - Additional notes
     - `created_at` (timestamptz) - Record creation timestamp

  2. **setting_values**
     - `id` (uuid, primary key) - Unique identifier
     - `shooter_id` (uuid, foreign key) - References shooters table
     - `category` (text) - Category type (range_location, range_type, etc.)
     - `value` (text) - The actual value for this category
     - `created_at` (timestamptz) - Record creation timestamp

  3. **range_records**
     - `id` (uuid, primary key) - Unique identifier
     - `shooter_id` (uuid, foreign key) - References shooters table
     - `record_date` (date) - Date of range session
     - `range_location` (text) - Selected range location
     - `range_type` (text) - Type of range
     - `practice_type` (text) - Type of practice
     - `target_type` (text) - Type of target used
     - `target_distance` (text) - Distance to target
     - `shooting_position` (text) - Position used
     - `firearm_type` (text) - Type of firearm
     - `firearm_model` (text) - Specific firearm model
     - `ammunition` (text) - Ammunition used
     - `conditions` (text) - Range conditions
     - `weather` (text) - Weather conditions
     - `photo_1_url` (text) - Photo 1 storage URL
     - `notes_1` (text) - Notes for photo 1
     - `photo_2_url` (text) - Photo 2 storage URL
     - `notes_2` (text) - Notes for photo 2
     - `photo_3_url` (text) - Photo 3 storage URL
     - `notes_3` (text) - Notes for photo 3
     - `photo_4_url` (text) - Photo 4 storage URL
     - `notes_4` (text) - Notes for photo 4
     - `photo_5_url` (text) - Photo 5 storage URL
     - `notes_5` (text) - Notes for photo 5
     - `photo_6_url` (text) - Photo 6 storage URL
     - `notes_6` (text) - Notes for photo 6
     - `notes_7` (text) - Additional general notes
     - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - RLS enabled on all tables
  - Public access for reading (no authentication required for this version)
  - Public access for writing (no authentication required for this version)

  ## Notes
  - All tables use UUIDs for primary keys
  - Foreign key constraints ensure data integrity
  - Timestamps track record creation
*/

-- Create shooters table
CREATE TABLE IF NOT EXISTS shooters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create setting_values table for dropdown options
CREATE TABLE IF NOT EXISTS setting_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shooter_id uuid NOT NULL REFERENCES shooters(id) ON DELETE CASCADE,
  category text NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create range_records table
CREATE TABLE IF NOT EXISTS range_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shooter_id uuid NOT NULL REFERENCES shooters(id) ON DELETE CASCADE,
  record_date date DEFAULT CURRENT_DATE,
  range_location text DEFAULT '',
  range_type text DEFAULT '',
  practice_type text DEFAULT '',
  target_type text DEFAULT '',
  target_distance text DEFAULT '',
  shooting_position text DEFAULT '',
  firearm_type text DEFAULT '',
  firearm_model text DEFAULT '',
  ammunition text DEFAULT '',
  conditions text DEFAULT '',
  weather text DEFAULT '',
  photo_1_url text DEFAULT '',
  notes_1 text DEFAULT '',
  photo_2_url text DEFAULT '',
  notes_2 text DEFAULT '',
  photo_3_url text DEFAULT '',
  notes_3 text DEFAULT '',
  photo_4_url text DEFAULT '',
  notes_4 text DEFAULT '',
  photo_5_url text DEFAULT '',
  notes_5 text DEFAULT '',
  photo_6_url text DEFAULT '',
  notes_6 text DEFAULT '',
  notes_7 text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_setting_values_shooter_id ON setting_values(shooter_id);
CREATE INDEX IF NOT EXISTS idx_setting_values_category ON setting_values(category);
CREATE INDEX IF NOT EXISTS idx_range_records_shooter_id ON range_records(shooter_id);
CREATE INDEX IF NOT EXISTS idx_range_records_date ON range_records(record_date);

-- Enable Row Level Security
ALTER TABLE shooters ENABLE ROW LEVEL SECURITY;
ALTER TABLE setting_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE range_records ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
-- Shooters policies
CREATE POLICY "Anyone can view shooters"
  ON shooters FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert shooters"
  ON shooters FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update shooters"
  ON shooters FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete shooters"
  ON shooters FOR DELETE
  TO public
  USING (true);

-- Setting values policies
CREATE POLICY "Anyone can view setting values"
  ON setting_values FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert setting values"
  ON setting_values FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update setting values"
  ON setting_values FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete setting values"
  ON setting_values FOR DELETE
  TO public
  USING (true);

-- Range records policies
CREATE POLICY "Anyone can view range records"
  ON range_records FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert range records"
  ON range_records FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update range records"
  ON range_records FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete range records"
  ON range_records FOR DELETE
  TO public
  USING (true);