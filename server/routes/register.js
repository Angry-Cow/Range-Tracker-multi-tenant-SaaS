const express = require('express');
const router = express.Router();
const { queryPublic } = require('../lib/db');
const { loadConfig } = require('../lib/config');
const { provisionTenant } = require('../lib/provisioner');
const { signTenantToken } = require('../lib/auth');

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

router.post('/', async (req, res) => {
  const { name, email, organization } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const config = loadConfig();
  const baseSlug = slugify(name);

  try {
    const existing = await queryPublic('SELECT id FROM tenants WHERE email=$1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    let slug = baseSlug;
    let counter = 0;
    while (true) {
      const slugCheck = await queryPublic('SELECT id FROM tenants WHERE slug=$1', [slug]);
      if (slugCheck.rows.length === 0) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    if (config.registrationMode === 'auto') {
      await provisionTenant(slug);
      const token = signTenantToken(slug);

      const result = await queryPublic(
        `INSERT INTO tenants (name, email, organization, slug, status, token, approved_at)
         VALUES ($1,$2,$3,$4,'active',$5,NOW()) RETURNING *`,
        [name, email, organization || '', slug, token]
      );

      return res.json({
        data: { slug, token, status: 'active' },
        error: null,
      });
    } else {
      const result = await queryPublic(
        `INSERT INTO tenants (name, email, organization, slug, status)
         VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
        [name, email, organization || '', slug]
      );

      return res.json({
        data: { status: 'pending' },
        error: null,
      });
    }
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.get('/status/:email', async (req, res) => {
  try {
    const result = await queryPublic(
      'SELECT slug, status, token FROM tenants WHERE email=$1',
      [req.params.email]
    );
    const row = result.rows[0];
    if (!row) return res.json({ data: null, error: null });

    const data = { status: row.status, slug: row.slug };
    if (row.status === 'active') data.token = row.token;

    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
