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
        'SELECT * FROM range_records WHERE shooter_id=$1 ORDER BY record_date DESC',
        [shooter_id]
      );
    } else {
      result = await queryTenant(
        req.tenantSlug,
        'SELECT * FROM range_records ORDER BY record_date DESC'
      );
    }
    res.json({ data: result.rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSlug,
      'SELECT * FROM range_records WHERE id=$1',
      [req.params.id]
    );
    const row = result.rows[0] || null;
    res.json({ data: row, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.post('/', async (req, res) => {
  const d = req.body;
  try {
    const result = await queryTenant(
      req.tenantSlug,
      `INSERT INTO range_records (
        shooter_id, record_date, range_location, range_type, practice_type,
        target_type, target_distance, shooting_position, firearm_type, firearm_model,
        ammunition, conditions, weather,
        photo_1_url, notes_1, photo_2_url, notes_2, photo_3_url, notes_3,
        photo_4_url, notes_4, photo_5_url, notes_5, photo_6_url, notes_6,
        photo_7_url, notes_7, photo_8_url, notes_8, photo_9_url, notes_9,
        photo_10_url, notes_10, photo_11_url, notes_11, photo_12_url, notes_12,
        notes_13
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
        $26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38
      ) RETURNING *`,
      [
        d.shooter_id, d.record_date, d.range_location||'', d.range_type||'', d.practice_type||'',
        d.target_type||'', d.target_distance||'', d.shooting_position||'', d.firearm_type||'', d.firearm_model||'',
        d.ammunition||'', d.conditions||'', d.weather||'',
        d.photo_1_url||'', d.notes_1||'', d.photo_2_url||'', d.notes_2||'', d.photo_3_url||'', d.notes_3||'',
        d.photo_4_url||'', d.notes_4||'', d.photo_5_url||'', d.notes_5||'', d.photo_6_url||'', d.notes_6||'',
        d.photo_7_url||'', d.notes_7||'', d.photo_8_url||'', d.notes_8||'', d.photo_9_url||'', d.notes_9||'',
        d.photo_10_url||'', d.notes_10||'', d.photo_11_url||'', d.notes_11||'', d.photo_12_url||'', d.notes_12||'',
        d.notes_13||''
      ]
    );
    res.json({ data: result.rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const d = req.body;
  try {
    const result = await queryTenant(
      req.tenantSlug,
      `UPDATE range_records SET
        record_date=$1, range_location=$2, range_type=$3, practice_type=$4,
        target_type=$5, target_distance=$6, shooting_position=$7, firearm_type=$8, firearm_model=$9,
        ammunition=$10, conditions=$11, weather=$12,
        photo_1_url=$13, notes_1=$14, photo_2_url=$15, notes_2=$16, photo_3_url=$17, notes_3=$18,
        photo_4_url=$19, notes_4=$20, photo_5_url=$21, notes_5=$22, photo_6_url=$23, notes_6=$24,
        photo_7_url=$25, notes_7=$26, photo_8_url=$27, notes_8=$28, photo_9_url=$29, notes_9=$30,
        photo_10_url=$31, notes_10=$32, photo_11_url=$33, notes_11=$34, photo_12_url=$35, notes_12=$36,
        notes_13=$37
      WHERE id=$38 RETURNING *`,
      [
        d.record_date, d.range_location||'', d.range_type||'', d.practice_type||'',
        d.target_type||'', d.target_distance||'', d.shooting_position||'', d.firearm_type||'', d.firearm_model||'',
        d.ammunition||'', d.conditions||'', d.weather||'',
        d.photo_1_url||'', d.notes_1||'', d.photo_2_url||'', d.notes_2||'', d.photo_3_url||'', d.notes_3||'',
        d.photo_4_url||'', d.notes_4||'', d.photo_5_url||'', d.notes_5||'', d.photo_6_url||'', d.notes_6||'',
        d.photo_7_url||'', d.notes_7||'', d.photo_8_url||'', d.notes_8||'', d.photo_9_url||'', d.notes_9||'',
        d.photo_10_url||'', d.notes_10||'', d.photo_11_url||'', d.notes_11||'', d.photo_12_url||'', d.notes_12||'',
        d.notes_13||'',
        req.params.id
      ]
    );
    res.json({ data: result.rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
