const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`config.json not found at ${configPath}. Run: node scripts/setup.js`);
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw);
}

module.exports = { loadConfig };
