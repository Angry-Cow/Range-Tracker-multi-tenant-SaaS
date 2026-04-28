const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { loadConfig } = require('../lib/config');
const { queryPublic } = require('../lib/db');
const { requireAdminAuth, signAdminToken, signTenantToken } = require('../lib/auth');
const { provisionTenant, deprovisionTenant } = require('../lib/provisioner');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const config = loadConfig();

  if (username !== config.adminUsername) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, config.adminPasswordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signAdminToken();
  res.json({ token, error: null });
});

router.get('/tenants', requireAdminAuth, async (req, res) => {
  try {
    const result = await queryPublic(
      `SELECT t.*,
        (SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = 'tenant_' || REPLACE(t.slug, '-', '_')
         AND table_name = 'shooters') as provisioned
       FROM tenants t ORDER BY created_at DESC`
    );
    res.json({ data: result.rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.get('/tenants/:id', requireAdminAuth, async (req, res) => {
  try {
    const result = await queryPublic('SELECT * FROM tenants WHERE id=$1', [req.params.id]);
    res.json({ data: result.rows[0] || null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.post('/tenants/:id/approve', requireAdminAuth, async (req, res) => {
  try {
    const tenantRes = await queryPublic('SELECT * FROM tenants WHERE id=$1', [req.params.id]);
    const tenant = tenantRes.rows[0];
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    await provisionTenant(tenant.slug);
    const token = signTenantToken(tenant.slug);

    await queryPublic(
      `UPDATE tenants SET status='active', token=$1, approved_at=NOW() WHERE id=$2`,
      [token, tenant.id]
    );

    res.json({ data: { token }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.post('/tenants/:id/suspend', requireAdminAuth, async (req, res) => {
  try {
    await queryPublic(`UPDATE tenants SET status='suspended' WHERE id=$1`, [req.params.id]);
    res.json({ data: null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.delete('/tenants/:id', requireAdminAuth, async (req, res) => {
  try {
    const tenantRes = await queryPublic('SELECT * FROM tenants WHERE id=$1', [req.params.id]);
    const tenant = tenantRes.rows[0];
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    await deprovisionTenant(tenant.slug);
    await queryPublic('DELETE FROM tenants WHERE id=$1', [tenant.id]);

    res.json({ data: null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.get('/registrations', requireAdminAuth, async (req, res) => {
  try {
    const result = await queryPublic(
      `SELECT * FROM tenants WHERE status='pending' ORDER BY created_at DESC`
    );
    res.json({ data: result.rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.post('/tenants/:id/reject', requireAdminAuth, async (req, res) => {
  try {
    await queryPublic(`UPDATE tenants SET status='rejected' WHERE id=$1`, [req.params.id]);
    res.json({ data: null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
