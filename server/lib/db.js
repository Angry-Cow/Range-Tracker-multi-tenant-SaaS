const { Pool } = require('pg');
const { loadConfig } = require('./config');

let pool = null;

function getPool() {
  if (!pool) {
    const config = loadConfig();
    pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

async function queryTenant(tenantSlug, text, params) {
  const client = await getPool().connect();
  try {
    await client.query(`SET search_path TO tenant_${tenantSlug.replace(/-/g, '_')}, public`);
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function queryPublic(text, params) {
  return getPool().query(text, params);
}

module.exports = { getPool, queryTenant, queryPublic };
