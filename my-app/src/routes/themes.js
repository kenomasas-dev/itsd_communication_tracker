const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/themes - fetch themes
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, color_hex, color_rgb, metadata, uploaded_by, is_active, created_at FROM itsd_schema.themes ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching themes:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// POST /api/themes - add a theme
router.post('/', async (req, res) => {
  const { name, color_hex, color_rgb, uploaded_by } = req.body || {};
  if (!name || !color_hex) {
    return res.status(400).json({ success: false, message: 'Name and color_hex are required.' });
  }
  try {
    const result = await db.query(
      `INSERT INTO itsd_schema.themes (name, color_hex, color_rgb, metadata, uploaded_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, color_hex, color_rgb || null, {} , uploaded_by || null]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error inserting theme:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// DELETE /api/themes/:id - remove a theme
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, message: 'Theme id required' });
  try {
    const result = await db.query('DELETE FROM itsd_schema.themes WHERE id = $1 RETURNING *', [id]);
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Theme not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error deleting theme:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

module.exports = router;
