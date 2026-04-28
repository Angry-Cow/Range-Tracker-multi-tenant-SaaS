#!/usr/bin/env node

'use strict';

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const CONNECTION_STRING =
  process.env.DATABASE_URL ||
  'postgresql://postgres:XG46G6xf3hgPG9KA@db.eustespordcqqytqpvsx.supabase.co:5432/postgres';

const OUTPUT_FILE = path.join(__dirname, '..', 'dump.sql');

async function getSchemas(client) {
  const res = await client.query(`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast','pg_temp_1','pg_toast_temp_1')
      AND schema_name NOT LIKE 'pg_%'
    ORDER BY schema_name
  `);
  return res.rows.map(r => r.schema_name);
}

async function getTables(client, schema) {
  const res = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = $1
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `, [schema]);
  return res.rows.map(r => r.table_name);
}

async function getSequences(client, schema) {
  const res = await client.query(`
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = $1
    ORDER BY sequence_name
  `, [schema]);
  return res.rows.map(r => r.sequence_name);
}

async function getSequenceValue(client, schema, seq) {
  try {
    const res = await client.query(`SELECT last_value, is_called FROM "${schema}"."${seq}"`);
    return res.rows[0];
  } catch {
    return null;
  }
}

async function getTableDDL(client, schema, table) {
  const cols = await client.query(`
    SELECT
      c.column_name,
      c.data_type,
      c.udt_name,
      c.character_maximum_length,
      c.numeric_precision,
      c.numeric_scale,
      c.is_nullable,
      c.column_default,
      c.ordinal_position
    FROM information_schema.columns c
    WHERE c.table_schema = $1 AND c.table_name = $2
    ORDER BY c.ordinal_position
  `, [schema, table]);

  const lines = cols.rows.map(col => {
    let type = col.data_type === 'USER-DEFINED' ? col.udt_name : col.data_type;
    if (col.character_maximum_length) type += `(${col.character_maximum_length})`;
    else if (col.numeric_precision && col.data_type === 'numeric') {
      type += `(${col.numeric_precision},${col.numeric_scale})`;
    }
    let def = `  "${col.column_name}" ${type}`;
    if (col.column_default) def += ` DEFAULT ${col.column_default}`;
    if (col.is_nullable === 'NO') def += ' NOT NULL';
    return def;
  });

  const constraints = await client.query(`
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_schema AS foreign_schema,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column,
      rc.update_rule,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    LEFT JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_schema = $1 AND tc.table_name = $2
    ORDER BY tc.constraint_type, tc.constraint_name
  `, [schema, table]);

  const pkCols = constraints.rows
    .filter(r => r.constraint_type === 'PRIMARY KEY')
    .map(r => `"${r.column_name}"`);

  if (pkCols.length > 0) {
    lines.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
  }

  const fkMap = {};
  constraints.rows
    .filter(r => r.constraint_type === 'FOREIGN KEY')
    .forEach(r => {
      if (!fkMap[r.constraint_name]) {
        fkMap[r.constraint_name] = {
          col: r.column_name,
          fSchema: r.foreign_schema,
          fTable: r.foreign_table,
          fCol: r.foreign_column,
          onUpdate: r.update_rule,
          onDelete: r.delete_rule,
        };
      }
    });

  for (const [name, fk] of Object.entries(fkMap)) {
    let fkDef = `  CONSTRAINT "${name}" FOREIGN KEY ("${fk.col}") REFERENCES "${fk.fSchema}"."${fk.fTable}"("${fk.fCol}")`;
    if (fk.onDelete && fk.onDelete !== 'NO ACTION') fkDef += ` ON DELETE ${fk.onDelete}`;
    if (fk.onUpdate && fk.onUpdate !== 'NO ACTION') fkDef += ` ON UPDATE ${fk.onUpdate}`;
    lines.push(fkDef);
  }

  return `CREATE TABLE IF NOT EXISTS "${schema}"."${table}" (\n${lines.join(',\n')}\n);`;
}

async function getIndexes(client, schema, table) {
  const res = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = $1 AND tablename = $2
      AND indexname NOT IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = $1 AND table_name = $2
          AND constraint_type IN ('PRIMARY KEY','UNIQUE')
      )
    ORDER BY indexname
  `, [schema, table]);
  return res.rows;
}

async function getUniqueConstraints(client, schema, table) {
  const res = await client.query(`
    SELECT tc.constraint_name, array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = $1 AND tc.table_name = $2 AND tc.constraint_type = 'UNIQUE'
    GROUP BY tc.constraint_name
  `, [schema, table]);
  return res.rows;
}

async function getCheckConstraints(client, schema, table) {
  const res = await client.query(`
    SELECT cc.constraint_name, cc.check_clause
    FROM information_schema.check_constraints cc
    JOIN information_schema.table_constraints tc
      ON cc.constraint_name = tc.constraint_name
    WHERE tc.table_schema = $1 AND tc.table_name = $2
  `, [schema, table]);
  return res.rows;
}

async function getRowData(client, schema, table) {
  const res = await client.query(`SELECT * FROM "${schema}"."${table}"`);
  return res.rows;
}

function escapeLiteral(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function main() {
  console.log('Connecting to database...');
  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();
  console.log('Connected.');

  const out = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });

  const write = (line = '') => out.write(line + '\n');

  write('-- PostgreSQL dump generated by dump.js');
  write(`-- Date: ${new Date().toISOString()}`);
  write('-- Source: Supabase');
  write('');
  write('SET client_encoding = \'UTF8\';');
  write('SET standard_conforming_strings = on;');
  write('SET check_function_bodies = false;');
  write('SET client_min_messages = warning;');
  write('');

  const schemas = await getSchemas(client);
  console.log(`Found schemas: ${schemas.join(', ')}`);

  for (const schema of schemas) {
    write(`-- ============================================================`);
    write(`-- SCHEMA: ${schema}`);
    write(`-- ============================================================`);
    write('');
    write(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
    write('');

    const tables = await getTables(client, schema);
    console.log(`  Schema "${schema}": ${tables.length} tables`);

    write(`-- Tables in schema "${schema}"`);
    write('');

    for (const table of tables) {
      write(`-- Table: "${schema}"."${table}"`);
      const ddl = await getTableDDL(client, schema, table);
      write(ddl);
      write('');

      const uniques = await getUniqueConstraints(client, schema, table);
      for (const u of uniques) {
        write(`ALTER TABLE "${schema}"."${table}" ADD CONSTRAINT "${u.constraint_name}" UNIQUE (${u.columns.map(c => `"${c}"`).join(', ')});`);
      }
      if (uniques.length > 0) write('');

      const checks = await getCheckConstraints(client, schema, table);
      for (const c of checks) {
        write(`ALTER TABLE "${schema}"."${table}" ADD CONSTRAINT "${c.constraint_name}" CHECK (${c.check_clause});`);
      }
      if (checks.length > 0) write('');

      const indexes = await getIndexes(client, schema, table);
      for (const idx of indexes) {
        write(`${idx.indexdef};`);
      }
      if (indexes.length > 0) write('');
    }

    const seqs = await getSequences(client, schema);
    if (seqs.length > 0) {
      write(`-- Sequences in schema "${schema}"`);
      write('');
      for (const seq of seqs) {
        write(`CREATE SEQUENCE IF NOT EXISTS "${schema}"."${seq}";`);
        const val = await getSequenceValue(client, schema, seq);
        if (val && val.is_called) {
          write(`SELECT setval('"${schema}"."${seq}"', ${val.last_value}, ${val.is_called});`);
        }
        write('');
      }
    }
  }

  write('-- ============================================================');
  write('-- DATA');
  write('-- ============================================================');
  write('');

  for (const schema of schemas) {
    const tables = await getTables(client, schema);
    for (const table of tables) {
      const rows = await getRowData(client, schema, table);
      if (rows.length === 0) {
        write(`-- No data in "${schema}"."${table}"`);
        write('');
        continue;
      }

      write(`-- Data for "${schema}"."${table}" (${rows.length} rows)`);
      const cols = Object.keys(rows[0]).map(c => `"${c}"`).join(', ');

      const BATCH = 100;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const values = batch.map(row =>
          `(${Object.values(row).map(escapeLiteral).join(', ')})`
        ).join(',\n');
        write(`INSERT INTO "${schema}"."${table}" (${cols}) VALUES`);
        write(`${values}`);
        write(`ON CONFLICT DO NOTHING;`);
        write('');
      }
    }
  }

  write('-- End of dump');

  await new Promise((resolve, reject) => {
    out.end(err => err ? reject(err) : resolve());
  });

  await client.end();
  console.log(`\nDump written to: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
