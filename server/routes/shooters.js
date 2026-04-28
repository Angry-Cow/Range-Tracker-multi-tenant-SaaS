const express = require('express');
const router = express.Router({ mergeParams: true });
const { queryTenant } = require('../lib/db');
const { requireTenantAuth } = require('../lib/auth');

router.use(requireTenantAuth);

router.get('/', async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSlug,
      'SELECT * FROM shooters ORDER BY last_name ASC'
    );
    res.json({ data: result.rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { first_name, last_name, email, phone, notes } = req.body;
  try {
    const result = await queryTenant(
      req.tenantSlug,
      `INSERT INTO shooters (first_name, last_name, email, phone, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [first_name, last_name, email || '', phone || '', notes || '']
    );
    res.json({ data: result.rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSlug,
      'SELECT * FROM shooters WHERE id = $1',
      [req.params.id]
    );
    const row = result.rows[0] || null;
    res.json({ data: row, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { first_name, last_name, email, phone } = req.body;
  try {
    const result = await queryTenant(
      req.tenantSlug,
      `UPDATE shooters SET first_name=$1, last_name=$2, email=$3, phone=$4
       WHERE id=$5 RETURNING *`,
      [first_name, last_name, email || null, phone || null, req.params.id]
    );
    res.json({ data: result.rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await queryTenant(req.tenantSlug, 'DELETE FROM setting_values WHERE shooter_id=$1', [req.params.id]);
    await queryTenant(req.tenantSlug, 'DELETE FROM range_records WHERE shooter_id=$1', [req.params.id]);
    await queryTenant(req.tenantSlug, 'DELETE FROM shooters WHERE id=$1', [req.params.id]);
    res.json({ data: null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
