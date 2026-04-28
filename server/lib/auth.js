const jwt = require('jsonwebtoken');
const { loadConfig } = require('./config');

function getTenantFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const config = loadConfig();
    const payload = jwt.verify(token, config.jwtSecret);
    return payload;
  } catch {
    return null;
  }
}

function requireTenantAuth(req, res, next) {
  const payload = getTenantFromToken(req);
  if (!payload || !payload.tenantSlug) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.tenantSlug = payload.tenantSlug;
  next();
}

function requireAdminAuth(req, res, next) {
  const payload = getTenantFromToken(req);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function signTenantToken(tenantSlug) {
  const config = loadConfig();
  return jwt.sign({ tenantSlug }, config.jwtSecret, { expiresIn: '30d' });
}

function signAdminToken() {
  const config = loadConfig();
  return jwt.sign({ role: 'admin' }, config.jwtSecret, { expiresIn: '8h' });
}

module.exports = { requireTenantAuth, requireAdminAuth, signTenantToken, signAdminToken };
