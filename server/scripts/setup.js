const bcrypt = require('bcryptjs');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const configPath = path.join(__dirname, '..', 'config.json');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log('\n=== Range Tracker First-Run Setup ===\n');

  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  const dbHost = await ask(`Database host [${config.database?.host || 'localhost'}]: `);
  const dbPort = await ask(`Database port [${config.database?.port || 5432}]: `);
  const dbName = await ask(`Database name [${config.database?.name || 'range_tracker'}]: `);
  const dbUser = await ask(`Database user [${config.database?.user || 'postgres'}]: `);
  const dbPassword = await ask('Database password: ');
  const serverPort = await ask(`Server port [${config.port || 3001}]: `);
  const jwtSecret = await ask('JWT secret (leave blank to generate): ');
  const adminUser = await ask(`Admin username [${config.adminUsername || 'admin'}]: `);
  const adminPass = await ask('Admin password: ');
  const regMode = await ask('Registration mode - auto or approval [approval]: ');

  const finalConfig = {
    port: parseInt(serverPort) || config.port || 3001,
    database: {
      host: dbHost || config.database?.host || 'localhost',
      port: parseInt(dbPort) || config.database?.port || 5432,
      name: dbName || config.database?.name || 'range_tracker',
      user: dbUser || config.database?.user || 'postgres',
      password: dbPassword || config.database?.password || '',
    },
    jwtSecret: jwtSecret || require('crypto').randomBytes(48).toString('hex'),
    uploadDir: 'uploads',
    adminUsername: adminUser || config.adminUsername || 'admin',
    adminPasswordHash: await bcrypt.hash(adminPass, 10),
    registrationMode: (regMode || 'approval').trim() === 'auto' ? 'auto' : 'approval',
    appName: config.appName || 'Range Tracker',
  };

  fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2));
  console.log('\nconfig.json written.\n');

  console.log('Creating public schema tables...');
  const pool = new Pool({
    host: finalConfig.database.host,
    port: finalConfig.database.port,
    database: finalConfig.database.name,
    user: finalConfig.database.user,
    password: finalConfig.database.password,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      organization TEXT DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      token TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      approved_at TIMESTAMPTZ
    )
  `);

  await pool.end();
  console.log('Database tables created.\n');
  console.log('Setup complete. Start the server with: node index.js\n');
  rl.close();
}

main().catch((err) => {
  console.error('Setup error:', err.message);
  rl.close();
  process.exit(1);
});
