const { getPool } = require('./db');

const TENANT_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS shooters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS setting_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shooter_id UUID NOT NULL REFERENCES shooters(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS range_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shooter_id UUID NOT NULL REFERENCES shooters(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    range_location TEXT DEFAULT '',
    range_type TEXT DEFAULT '',
    practice_type TEXT DEFAULT '',
    target_type TEXT DEFAULT '',
    target_distance TEXT DEFAULT '',
    shooting_position TEXT DEFAULT '',
    firearm_type TEXT DEFAULT '',
    firearm_model TEXT DEFAULT '',
    ammunition TEXT DEFAULT '',
    conditions TEXT DEFAULT '',
    weather TEXT DEFAULT '',
    photo_1_url TEXT DEFAULT '',
    notes_1 TEXT DEFAULT '',
    photo_2_url TEXT DEFAULT '',
    notes_2 TEXT DEFAULT '',
    photo_3_url TEXT DEFAULT '',
    notes_3 TEXT DEFAULT '',
    photo_4_url TEXT DEFAULT '',
    notes_4 TEXT DEFAULT '',
    photo_5_url TEXT DEFAULT '',
    notes_5 TEXT DEFAULT '',
    photo_6_url TEXT DEFAULT '',
    notes_6 TEXT DEFAULT '',
    photo_7_url TEXT DEFAULT '',
    notes_7 TEXT DEFAULT '',
    photo_8_url TEXT DEFAULT '',
    notes_8 TEXT DEFAULT '',
    photo_9_url TEXT DEFAULT '',
    notes_9 TEXT DEFAULT '',
    photo_10_url TEXT DEFAULT '',
    notes_10 TEXT DEFAULT '',
    photo_11_url TEXT DEFAULT '',
    notes_11 TEXT DEFAULT '',
    photo_12_url TEXT DEFAULT '',
    notes_12 TEXT DEFAULT '',
    notes_13 TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

async function provisionTenant(tenantSlug) {
  const schemaName = `tenant_${tenantSlug.replace(/-/g, '_')}`;
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}"`);

    const statements = TENANT_SCHEMA_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await client.query(stmt);
    }

    await client.query('COMMIT');
    return schemaName;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deprovisionTenant(tenantSlug) {
  const schemaName = `tenant_${tenantSlug.replace(/-/g, '_')}`;
  const pool = getPool();
  await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
}

module.exports = { provisionTenant, deprovisionTenant };
