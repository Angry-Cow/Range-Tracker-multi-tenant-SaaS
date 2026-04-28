#!/usr/bin/env node

/**
 * SASS Range Tracker - Database Backup Script
 *
 * Connects to the Supabase PostgreSQL database and generates a complete
 * .sql backup file that can be restored on any standard PostgreSQL server.
 *
 * Usage:
 *   node backup.js
 *   node backup.js --output ./my-backup.sql
 *
 * Requirements:
 *   npm install pg dotenv
 *
 * The output file contains:
 *   1. Schema creation (all tables, indexes)
 *   2. All current data as INSERT statements
 *   3. Tenant schemas (if any tenants exist)
 *   4. Notes on what to do after restoring
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const args = process.argv.slice(2);
const outputFlagIndex = args.indexOf('--output');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const defaultOutput = path.join(process.cwd(), `sass-backup-${timestamp}.sql`);
const outputPath = outputFlagIndex !== -1 ? args[outputFlagIndex + 1] : defaultOutput;

function rl(question) {
  const iface = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => iface.question(question, ans => { iface.close(); resolve(ans.trim()); }));
}

function escape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function formatRow(row) {
  return '(' + Object.values(row).map(escape).join(', ') + ')';
}

async function getConnectionConfig() {
  let config = {};

  try {
    const cfgPath = path.join(__dirname, '..', 'config.json');
    const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (raw.database) {
      config = raw.database;
      console.log('Loaded database config from config.json');
    }
  } catch (_) {}

  if (!config.host) {
    console.log('\nNo config.json found or missing database section.');
    console.log('Enter your Supabase / PostgreSQL connection details:\n');
    config.host = await rl('  Host (e.g. db.xxxx.supabase.co): ');
    config.port = parseInt(await rl('  Port [5432]: ') || '5432');
    config.database = await rl('  Database name [postgres]: ') || 'postgres';
    config.user = await rl('  User [postgres]: ') || 'postgres';
    config.password = await rl('  Password: ');
    config.ssl = true;
  }

  return {
    host: config.host,
    port: config.port || 5432,
    database: config.database || 'postgres',
    user: config.user || 'postgres',
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  };
}

async function getTenantSchemas(pool) {
  const res = await pool.query(`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name
  `);
  return res.rows.map(r => r.schema_name);
}

async function dumpTableData(pool, schema, table, out) {
  const res = await pool.query(`SELECT * FROM "${schema}"."${table}" ORDER BY created_at`);
  if (res.rows.length === 0) return;

  const cols = res.fields.map(f => `"${f.name}"`).join(', ');
  out.push(`-- ${schema}.${table}: ${res.rows.length} rows`);

  const chunkSize = 50;
  for (let i = 0; i < res.rows.length; i += chunkSize) {
    const chunk = res.rows.slice(i, i + chunkSize);
    out.push(
      `INSERT INTO "${schema}"."${table}" (${cols}) VALUES\n` +
      chunk.map(r => '  ' + formatRow(r)).join(',\n') +
      '\nON CONFLICT (id) DO NOTHING;'
    );
  }
  out.push('');
}

async function run() {
  console.log('==============================================');
  console.log('  SASS Range Tracker - Database Backup Tool');
  console.log('==============================================\n');

  const connConfig = await getConnectionConfig();
  const pool = new Pool(connConfig);

  try {
    await pool.query('SELECT 1');
    console.log('\nConnected to database successfully.\n');
  } catch (err) {
    console.error('Failed to connect:', err.message);
    process.exit(1);
  }

  const out = [];

  out.push('-- ============================================================');
  out.push('-- SASS Range Tracker - PostgreSQL Backup');
  out.push(`-- Generated: ${new Date().toISOString()}`);
  out.push('-- ============================================================');
  out.push('--');
  out.push('-- HOW TO RESTORE:');
  out.push('--   psql -U postgres -d your_database -f this_file.sql');
  out.push('--');
  out.push('-- AFTER RESTORING, run the server setup:');
  out.push('--   node server/scripts/setup.js');
  out.push('-- (You can skip the admin credential step since they are');
  out.push('--  already restored from this backup.)');
  out.push('-- ============================================================');
  out.push('');
  out.push('SET client_encoding = \'UTF8\';');
  out.push('SET standard_conforming_strings = on;');
  out.push('');

  out.push('-- ============================================================');
  out.push('-- EXTENSIONS');
  out.push('-- ============================================================');
  out.push('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  out.push('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  out.push('');

  out.push('-- ============================================================');
  out.push('-- PUBLIC SCHEMA - TABLES');
  out.push('-- ============================================================');
  out.push('');

  out.push(`CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  organization TEXT DEFAULT '',
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  token TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`);
  out.push('');

  out.push(`CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`);
  out.push('');

  out.push(`CREATE TABLE IF NOT EXISTS public.shooters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`);
  out.push('');

  out.push(`CREATE TABLE IF NOT EXISTS public.setting_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shooter_id UUID NOT NULL REFERENCES public.shooters(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`);
  out.push('');

  out.push(`CREATE TABLE IF NOT EXISTS public.range_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shooter_id UUID NOT NULL REFERENCES public.shooters(id) ON DELETE CASCADE,
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
);`);
  out.push('');

  out.push('CREATE INDEX IF NOT EXISTS idx_setting_values_shooter_id ON public.setting_values(shooter_id);');
  out.push('CREATE INDEX IF NOT EXISTS idx_range_records_shooter_id ON public.range_records(shooter_id);');
  out.push('CREATE INDEX IF NOT EXISTS idx_range_records_record_date ON public.range_records(record_date);');
  out.push('CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);');
  out.push('CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(email);');
  out.push('');

  out.push('-- ============================================================');
  out.push('-- PUBLIC SCHEMA - DATA');
  out.push('-- ============================================================');
  out.push('');

  await dumpTableData(pool, 'public', 'admin_credentials', out);
  await dumpTableData(pool, 'public', 'tenants', out);
  await dumpTableData(pool, 'public', 'shooters', out);
  await dumpTableData(pool, 'public', 'setting_values', out);
  await dumpTableData(pool, 'public', 'range_records', out);

  const tenantSchemas = await getTenantSchemas(pool);

  if (tenantSchemas.length > 0) {
    out.push('-- ============================================================');
    out.push(`-- TENANT SCHEMAS (${tenantSchemas.length} found)`);
    out.push('-- ============================================================');
    out.push('');

    for (const schema of tenantSchemas) {
      out.push(`-- ------------------------------------------------------------`);
      out.push(`-- Schema: ${schema}`);
      out.push(`-- ------------------------------------------------------------`);
      out.push(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
      out.push('');

      out.push(`CREATE TABLE IF NOT EXISTS "${schema}".shooters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`);
      out.push('');

      out.push(`CREATE TABLE IF NOT EXISTS "${schema}".setting_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shooter_id UUID NOT NULL REFERENCES "${schema}".shooters(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`);
      out.push('');

      out.push(`CREATE TABLE IF NOT EXISTS "${schema}".range_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shooter_id UUID NOT NULL REFERENCES "${schema}".shooters(id) ON DELETE CASCADE,
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
);`);
      out.push('');

      const tables = ['shooters', 'setting_values', 'range_records'];
      for (const table of tables) {
        try {
          await dumpTableData(pool, schema, table, out);
        } catch (err) {
          out.push(`-- WARNING: Could not dump ${schema}.${table}: ${err.message}`);
          out.push('');
        }
      }
    }
  } else {
    out.push('-- No tenant schemas found (tenants are created at runtime by the server).');
    out.push('');
  }

  out.push('-- ============================================================');
  out.push('-- BACKUP COMPLETE');
  out.push('-- ============================================================');
  out.push('--');
  out.push('-- IMPORTANT NOTES FOR YOUR HOSTED SERVER:');
  out.push('--');
  out.push('-- 1. PostgreSQL 14+ is recommended.');
  out.push('-- 2. The pgcrypto extension must be available.');
  out.push('-- 3. After restoring, run: node server/scripts/setup.js');
  out.push('--    This will prompt you for connection details and create');
  out.push('--    your config.json. You can skip re-creating the admin');
  out.push('--    account since it was restored from this backup.');
  out.push('-- 4. If photos are stored as base64 in range_records, they');
  out.push('--    are fully included in this backup. No separate file');
  out.push('--    migration is needed.');
  out.push('-- 5. Tenant schemas are created automatically by the server');
  out.push('--    when a tenant registers. Any existing tenant schemas');
  out.push('--    above have been fully restored with their data.');
  out.push('-- ============================================================');

  const content = out.join('\n');
  fs.writeFileSync(outputPath, content, 'utf8');

  const sizeMB = (Buffer.byteLength(content, 'utf8') / 1024 / 1024).toFixed(2);
  console.log(`\nBackup complete!`);
  console.log(`  File: ${outputPath}`);
  console.log(`  Size: ${sizeMB} MB`);
  console.log(`  Tenants: ${tenantSchemas.length}`);
  console.log('');
  console.log('To restore on your server:');
  console.log(`  psql -U postgres -d your_database -f "${path.basename(outputPath)}"`);
  console.log('');

  await pool.end();
}

run().catch(err => {
  console.error('\nBackup failed:', err.message);
  process.exit(1);
});
