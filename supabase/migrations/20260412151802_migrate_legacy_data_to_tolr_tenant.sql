/*
  # Migrate Legacy Data to TOLR Tenant

  ## Summary
  Migrates all pre-login shooter data for Lawrence/Larry Schlack (larryschlack@gmail.com)
  from the legacy single-tenant tables into the new multi-tenant tables under the TOLR tenant.

  ## Changes

  ### 1. Shooter Profile Update
  - Updates existing "Larry Schlack" record in `tenant_shooters` (tenant TOLR) with full
    profile info from the legacy `shooters` table (phone number and notes)

  ### 2. Range Records Migration
  - Copies all 17 records from legacy `range_records` table into `tenant_range_records`
  - Links them to the TOLR tenant and the existing tenant_shooter record

  ### 3. Settings Migration
  - Copies all 70 settings from legacy `setting_values` table into `tenant_setting_values`
  - Links them to the TOLR tenant and the existing tenant_shooter record

  ## Key IDs
  - TOLR Tenant ID: a61229b1-002c-4aef-8109-d28955977dc2
  - Legacy Shooter ID (source): c3d02a16-1d8d-48cd-9455-f2b1e3730263
  - Tenant Shooter ID (destination): c278a5a2-be83-4ee1-9add-7788c63b710c
*/

UPDATE tenant_shooters
SET
  first_name = 'Lawrence',
  last_name = 'Schlack',
  phone = '7324748132',
  notes = 'Larry Likes to shoot Caniks'
WHERE id = 'c278a5a2-be83-4ee1-9add-7788c63b710c'
  AND tenant_id = 'a61229b1-002c-4aef-8109-d28955977dc2';

INSERT INTO tenant_range_records (
  id,
  tenant_id,
  shooter_id,
  record_date,
  range_location,
  range_type,
  practice_type,
  target_type,
  target_distance,
  shooting_position,
  firearm_type,
  firearm_model,
  ammunition,
  conditions,
  weather,
  photo_1_url,
  notes_1,
  photo_2_url,
  notes_2,
  photo_3_url,
  notes_3,
  photo_4_url,
  notes_4,
  photo_5_url,
  notes_5,
  photo_6_url,
  notes_6,
  photo_7_url,
  notes_7,
  photo_8_url,
  notes_8,
  photo_9_url,
  notes_9,
  photo_10_url,
  notes_10,
  photo_11_url,
  notes_11,
  photo_12_url,
  notes_12,
  notes_13,
  created_at
)
SELECT
  gen_random_uuid(),
  'a61229b1-002c-4aef-8109-d28955977dc2',
  'c278a5a2-be83-4ee1-9add-7788c63b710c',
  record_date,
  range_location,
  range_type,
  practice_type,
  target_type,
  target_distance,
  shooting_position,
  firearm_type,
  firearm_model,
  ammunition,
  conditions,
  weather,
  photo_1_url,
  notes_1,
  photo_2_url,
  notes_2,
  photo_3_url,
  notes_3,
  photo_4_url,
  notes_4,
  photo_5_url,
  notes_5,
  photo_6_url,
  notes_6,
  photo_7_url,
  notes_7,
  photo_8_url,
  notes_8,
  photo_9_url,
  notes_9,
  photo_10_url,
  notes_10,
  photo_11_url,
  notes_11,
  photo_12_url,
  notes_12,
  notes_13,
  created_at
FROM range_records
WHERE shooter_id = 'c3d02a16-1d8d-48cd-9455-f2b1e3730263';

INSERT INTO tenant_setting_values (
  id,
  tenant_id,
  shooter_id,
  category,
  value,
  created_at
)
SELECT
  gen_random_uuid(),
  'a61229b1-002c-4aef-8109-d28955977dc2',
  'c278a5a2-be83-4ee1-9add-7788c63b710c',
  category,
  value,
  created_at
FROM setting_values
WHERE shooter_id = 'c3d02a16-1d8d-48cd-9455-f2b1e3730263';
