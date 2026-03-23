const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Admin login endpoint
router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Query from adminlogin table instead of login table
    const result = await pool.query(
      'SELECT * FROM itsd_schema.adminlogin WHERE email = $1 AND password = $2',
      [email, password]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Check if admin account is active
      if (user.is_active === false) {
        return res.status(401).json({ success: false, message: 'This admin account has been deactivated. Please contact the system administrator.' });
      }
      
      // Verify role is Admin (extra safety check)
      if (user.role !== 'Admin') {
        return res.status(401).json({ success: false, message: 'Access denied. Admin privileges required.' });
      }
      
      res.json({ success: true, user, message: 'Admin login successful' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all admin users
router.get('/admin-users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, department, phone, notes, permissions, is_active, created_at 
       FROM itsd_schema.adminlogin 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new admin user
router.post('/admin-users', async (req, res) => {
  const { name, email, password, department, phone, notes, permissions } = req.body;

  try {
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    // Insert new admin user (role is always Admin)
    const result = await pool.query(
      `INSERT INTO itsd_schema.adminlogin (name, email, password, role, department, phone, notes, permissions, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, email, role, department, phone, notes, permissions, is_active, created_at`,
      [name, email, password || null, 'Admin', department || null, phone || null, notes || null, JSON.stringify(permissions || []), true]
    );

    res.status(201).json({ success: true, user: result.rows[0], message: 'Admin user created successfully' });
  } catch (error) {
    console.error('Admin user creation error:', error);
    if (error.code === '23505') {
      res.status(409).json({ success: false, message: 'Email already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// Toggle admin user status
router.put('/admin-users/:id/toggle-status', async (req, res) => {
  const { id } = req.params;
  console.log('Toggle admin status request for user ID:', id);

  try {
    // Get current status and email
    const currentUser = await pool.query(
      'SELECT is_active, email FROM itsd_schema.adminlogin WHERE id = $1',
      [id]
    );

    if (currentUser.rows.length === 0) {
      console.log('Admin user not found:', id);
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    const currentStatus = currentUser.rows[0].is_active;
    const userEmail = currentUser.rows[0].email;
    const newStatus = !currentStatus;

    // Update status in adminlogin
    const result = await pool.query(
      `UPDATE itsd_schema.adminlogin SET is_active = $1 WHERE id = $2 RETURNING id, name, email, role, department, phone, notes, permissions, is_active, created_at`,
      [newStatus, id]
    );

    // Also propagate status to login table for the same email (if exists)
    try {
      const syncResult = await pool.query(
        `UPDATE itsd_schema.login SET is_active = $1 WHERE email = $2 RETURNING id, email, is_active`,
        [newStatus, userEmail]
      );
      console.log('Synchronized login table for email:', userEmail, syncResult.rows);
    } catch (syncErr) {
      console.warn('Failed to sync admin status to login table:', syncErr.message);
    }

    console.log('Update result:', result.rows[0]);
    res.json({ success: true, user: result.rows[0], message: `Admin user ${newStatus ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error('Toggle admin status error:', error.message);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Delete admin user
router.delete('/admin-users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM itsd_schema.adminlogin WHERE id = $1 RETURNING id, email',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    res.json({ success: true, message: `Admin user ${result.rows[0].email} deleted successfully` });
  } catch (error) {
    console.error('Delete admin user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: set a temporary password for a user and mark any reset request handled
router.post('/set-temp-password', async (req, res) => {
  const { email, tempPassword } = req.body || {};
  if (!email || !tempPassword) return res.status(400).json({ success: false, message: 'Email and tempPassword are required' });
  try {
    // Update main login table (case-insensitive match on email)
    let result = await pool.query(
      `UPDATE itsd_schema.login SET password = $1 WHERE LOWER(email) = LOWER($2) RETURNING id, email`,
      [tempPassword, email]
    );

    // If no rows updated, try alternate column name `user_email` (some records may use that)
    if (result.rows.length === 0) {
      try {
        const alt = await pool.query(`UPDATE itsd_schema.login SET password = $1 WHERE LOWER(user_email) = LOWER($2) RETURNING id, user_email as email`, [tempPassword, email]);
        if (alt && alt.rows && alt.rows.length > 0) result = alt;
      } catch (e) { /* ignore */ }
    }

    if (result.rows.length === 0) {
      // If no row in main login table, try to update adminlogin/userlogin and treat as success
      let updated = 0;
      try {
        const r1 = await pool.query(`UPDATE itsd_schema.adminlogin SET password = $1 WHERE LOWER(email) = LOWER($2) RETURNING id`, [tempPassword, email]).catch(() => ({ rows: [] }));
        if (r1 && r1.rows && r1.rows.length > 0) updated += r1.rows.length;
      } catch (e) { /* ignore */ }
      try {
        const r1b = await pool.query(`UPDATE itsd_schema.adminlogin SET password = $1 WHERE LOWER(user_email) = LOWER($2) RETURNING id`, [tempPassword, email]).catch(() => ({ rows: [] }));
        if (r1b && r1b.rows && r1b.rows.length > 0) updated += r1b.rows.length;
      } catch (e) { /* ignore */ }
      try {
        const r2 = await pool.query(`UPDATE itsd_schema.userlogin SET password = $1 WHERE LOWER(email) = LOWER($2) RETURNING id`, [tempPassword, email]).catch(() => ({ rows: [] }));
        if (r2 && r2.rows && r2.rows.length > 0) updated += r2.rows.length;
      } catch (e) { /* ignore */ }
      try {
        const r2b = await pool.query(`UPDATE itsd_schema.userlogin SET password = $1 WHERE LOWER(user_email) = LOWER($2) RETURNING id`, [tempPassword, email]).catch(() => ({ rows: [] }));
        if (r2b && r2b.rows && r2b.rows.length > 0) updated += r2b.rows.length;
      } catch (e) { /* ignore */ }

      if (updated === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      // otherwise continue as success (we updated admin/user login)
    } else {
      // Mirror changes to adminlogin/userlogin if present (best-effort)
      try { await pool.query(`UPDATE itsd_schema.adminlogin SET password = $1 WHERE email = $2`, [tempPassword, email]); } catch (e) { /* ignore */ }
      try { await pool.query(`UPDATE itsd_schema.userlogin SET password = $1 WHERE email = $2`, [tempPassword, email]); } catch (e) { /* ignore */ }
    }

    // Record audit entries: admin set temp password, and mark any REQUEST_ADMIN_RESET as handled
    try {
      await pool.query(
        `INSERT INTO itsd_schema.audit_logs (action, user_email, user_role, description) VALUES ($1,$2,$3,$4)`,
        ['ADMIN_SET_TEMP_PASSWORD', email, 'admin', 'Admin set temporary password via Settings']
      );
      await pool.query(
        `INSERT INTO itsd_schema.audit_logs (action, user_email, description) VALUES ($1,$2,$3)`,
        ['REQUEST_ADMIN_RESET_HANDLED', email, 'Admin handled reset request by setting temporary password']
      );
    } catch (auditErr) {
      console.warn('Failed to insert audit log for temp-password:', auditErr.message);
    }

    res.json({ success: true, message: 'Temporary password applied' });
  } catch (error) {
    console.error('Set temp password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Fetch admin password by email
router.get('/admin-password/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const result = await pool.query(
      'SELECT password FROM itsd_schema.adminlogin WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    res.json({
      success: true,
      password: result.rows[0].password,
      message: 'Password fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching admin password:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Change admin password
router.post('/change-admin-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, current password, and new password are required' });
    }
    
    // Verify current password
    const adminResult = await pool.query(
      'SELECT id, password FROM itsd_schema.adminlogin WHERE email = $1',
      [email]
    );
    
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    if (adminResult.rows[0].password !== currentPassword) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    
    // Update password
    await pool.query(
      'UPDATE itsd_schema.adminlogin SET password = $1, updated_at = NOW() WHERE email = $2',
      [newPassword, email]
    );
    
    // Log audit
    try {
      await pool.query(
        `INSERT INTO itsd_schema.audit_logs (action, user_email, user_role, description) VALUES ($1,$2,$3,$4)`,
        ['ADMIN_PASSWORD_CHANGED', email, 'admin', `Admin ${email} changed their password`]
      );
    } catch (auditErr) {
      console.warn('Failed to insert audit log for password change:', auditErr.message);
    }
    
    res.json({ success: true, message: 'Admin password changed successfully' });
  } catch (error) {
    console.error('Error changing admin password:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

