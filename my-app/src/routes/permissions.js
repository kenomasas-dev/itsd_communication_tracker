const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all permissions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, category, risk_level, created_by, created_at 
       FROM itsd_schema.permissions 
       ORDER BY category, name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get a single permission by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, name, description, category, risk_level, created_by, created_at 
       FROM itsd_schema.permissions 
       WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Permission not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching permission:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create a new permission
router.post('/', async (req, res) => {
  const { name, description, category, risk_level, created_by } = req.body;

  try {
    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Permission name is required' });
    }

    // Validate risk level
    const validRiskLevels = ['Low', 'Medium', 'High', 'Critical'];
    if (!validRiskLevels.includes(risk_level)) {
      return res.status(400).json({ success: false, message: 'Invalid risk level' });
    }

    // Insert new permission
    const result = await pool.query(
      `INSERT INTO itsd_schema.permissions (name, description, category, risk_level, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, category, risk_level, created_by, created_at`,
      [
        name.trim(),
        description || null,
        category || null,
        risk_level,
        created_by || null
      ]
    );

    res.status(201).json({
      success: true,
      permission: result.rows[0],
      message: 'Permission created successfully'
    });
  } catch (error) {
    console.error('Permission creation error:', error);
    if (error.code === '23505') {
      // Unique constraint violation
      res.status(409).json({ success: false, message: 'A permission with this name already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// Update a permission by ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, category, risk_level } = req.body;

  try {
    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Permission name is required' });
    }

    // Validate risk level
    const validRiskLevels = ['Low', 'Medium', 'High', 'Critical'];
    if (!validRiskLevels.includes(risk_level)) {
      return res.status(400).json({ success: false, message: 'Invalid risk level' });
    }

    // Update permission
    const result = await pool.query(
      `UPDATE itsd_schema.permissions 
       SET name = $1, description = $2, category = $3, risk_level = $4
       WHERE id = $5
       RETURNING id, name, description, category, risk_level, created_by, created_at`,
      [
        name.trim(),
        description || null,
        category || null,
        risk_level,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Permission not found' });
    }

    res.json({
      success: true,
      permission: result.rows[0],
      message: 'Permission updated successfully'
    });
  } catch (error) {
    console.error('Permission update error:', error);
    if (error.code === '23505') {
      // Unique constraint violation
      res.status(409).json({ success: false, message: 'A permission with this name already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// Delete a permission by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Delete permission
    const result = await pool.query(
      'DELETE FROM itsd_schema.permissions WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Permission not found' });
    }

    res.json({
      success: true,
      message: `Permission ${result.rows[0].name} deleted successfully`
    });
  } catch (error) {
    console.error('Permission deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
