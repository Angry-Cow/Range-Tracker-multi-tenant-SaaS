const express = require('express');
const router = express.Router({ mergeParams: true });
const { queryTenant } = require('../lib/db');
const { requireTenantAuth } = require('../lib/auth');

router.use(requireTenantAuth);

router.get('/', async (req, res) => {
  const { shooter_id } = req.query;
  try {
    let result;
    if (shooter_id) {
      result = await queryTenant(
        req.tenantSlug,
        'SELECT * FROM setting_values WHERE shooter_id=$1 ORDER BY category ASC, value ASC',
        [shooter_id]
      );
    } else {
      result = await queryTenant(
        req.tenantSlug,
        'SELECT * FROM setting_values ORDER BY category ASC, value ASC'
      );
    }
    res.json({ data: result.rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { shooter_id, category, value } = req.body;
  try {
    const result = await queryTenant(
      req.tenantSlug,
      'INSERT INTO setting_values (shooter_id, category, value) VALUES ($1,$2,$3) RETURNING *',
      [shooter_id, category, value]
    );
    res.json({ data: result.rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await queryTenant(req.tenantSlug, 'DELETE FROM setting_values WHERE id=$1', [req.params.id]);
    res.json({ data: null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
