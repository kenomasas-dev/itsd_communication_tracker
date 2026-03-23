const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all roles
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, permissions, created_by, created_at 
       FROM itsd_schema.roles 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get a single role by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, name, description, permissions, created_by, created_at 
       FROM itsd_schema.roles 
       WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create a new role
router.post('/', async (req, res) => {
  const { name, description, permissions, created_by } = req.body;

  try {
    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    // Insert new role
    const result = await pool.query(
      `INSERT INTO itsd_schema.roles (name, description, permissions, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, permissions, created_by, created_at`,
      [
        name.trim(),
        description || null,
        JSON.stringify(permissions || []),
        created_by || null
      ]
    );

    res.status(201).json({
      success: true,
      role: result.rows[0],
      message: 'Role created successfully'
    });
  } catch (error) {
    console.error('Role creation error:', error);
    if (error.code === '23505') {
      // Unique constraint violation
      res.status(409).json({ success: false, message: 'A role with this name already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// Update a role by ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, permissions } = req.body;

  try {
    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    // Update role
    const result = await pool.query(
      `UPDATE itsd_schema.roles 
       SET name = $1, description = $2, permissions = $3
       WHERE id = $4
       RETURNING id, name, description, permissions, created_by, created_at`,
      [
        name.trim(),
        description || null,
        JSON.stringify(permissions || []),
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    res.json({
      success: true,
      role: result.rows[0],
      message: 'Role updated successfully'
    });
  } catch (error) {
    console.error('Role update error:', error);
    if (error.code === '23505') {
      // Unique constraint violation
      res.status(409).json({ success: false, message: 'A role with this name already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// Delete a role by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Prevent deletion of system roles (Admin, Staff, Viewer)
    const checkRole = await pool.query(
      'SELECT name FROM itsd_schema.roles WHERE id = $1',
      [id]
    );

    if (checkRole.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const roleName = checkRole.rows[0].name;
    const systemRoles = ['Admin', 'Staff', 'Viewer'];
    if (systemRoles.includes(roleName)) {
      return res.status(403).json({ success: false, message: `Cannot delete system role: ${roleName}` });
    }

    // Delete role
    const result = await pool.query(
      'DELETE FROM itsd_schema.roles WHERE id = $1 RETURNING id, name',
      [id]
    );

    res.json({
      success: true,
      message: `Role ${result.rows[0].name} deleted successfully`
    });
  } catch (error) {
    console.error('Role deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
