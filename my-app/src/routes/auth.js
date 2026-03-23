const express = require('express');
const pool = require('../config/database');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile uploads
const uploadDir = path.join(__dirname, '../../uploads/profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `profile_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, jpg, png, gif) are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM itsd_schema.login WHERE email = $1 AND password = $2',
      [email, password]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Check if user is active
      if (user.is_active === false) {
        return res.status(401).json({ success: false, message: 'This account has been deactivated. Please contact administrator.' });
      }
      
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all login records
router.get('/login-records', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, created_at FROM itsd_schema.login ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching login records:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query || {};
    let query = `SELECT id, name, email, role, department, phone, notes, permissions, is_active, created_at, manager_id, skills, profile
       FROM itsd_schema.login`;
    const params = [];

    if (role) {
      query += ` WHERE LOWER(role) = LOWER($1)`;
      params.push(role);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user
router.post('/users', async (req, res) => {
  const { name, email, password, role, department, phone, notes, permissions, manager_id, skills } = req.body;

  try {
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }
    // Use transaction: insert into login table, and if role is Admin also insert into adminlogin
    await pool.query('BEGIN');

    const result = await pool.query(
      `INSERT INTO itsd_schema.login (name, email, password, role, department, phone, notes, permissions, manager_id, skills)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, email, role, department, phone, notes, permissions, manager_id, skills, created_at`,
      [name, email, password || null, role || 'Viewer', department || null, phone || null, notes || null, JSON.stringify(permissions || []), manager_id || null, JSON.stringify(skills || [])]
    );

    const createdUser = result.rows[0];

    if ((role || '').toString().toLowerCase() === 'admin') {
      try {
        await pool.query(
          `INSERT INTO itsd_schema.adminlogin (name, email, password, role, department, phone, notes, permissions, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password, role = EXCLUDED.role, department = EXCLUDED.department, phone = EXCLUDED.phone, notes = EXCLUDED.notes, permissions = EXCLUDED.permissions, is_active = EXCLUDED.is_active`,
          [name, email, password || null, 'Admin', department || null, phone || null, notes || null, JSON.stringify(permissions || []), true]
        );
      } catch (adminErr) {
        console.error('Failed to insert into adminlogin:', adminErr);
        await pool.query('ROLLBACK');
        return res.status(500).json({ success: false, message: 'Failed to create admin user in adminlogin: ' + adminErr.message });
      }
    } else if ((role || '').toString().toLowerCase() === 'user') {
      try {
        await pool.query(
          `INSERT INTO itsd_schema.userlogin (name, email, password, role, department, phone, notes, permissions, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password, role = EXCLUDED.role, department = EXCLUDED.department, phone = EXCLUDED.phone, notes = EXCLUDED.notes, permissions = EXCLUDED.permissions, is_active = EXCLUDED.is_active`,
          [name, email, password || null, 'User', department || null, phone || null, notes || null, JSON.stringify(permissions || []), true]
        );
      } catch (userErr) {
        console.error('Failed to insert into userlogin:', userErr);
        await pool.query('ROLLBACK');
        return res.status(500).json({ success: false, message: 'Failed to create user in userlogin: ' + userErr.message });
      }
    }

    await pool.query('COMMIT');
    res.status(201).json({ success: true, user: createdUser, message: 'User created successfully' });
  } catch (error) {
    console.error('User creation error:', error);
    try { await pool.query('ROLLBACK'); } catch (e) { /* ignore */ }
    if (error.code === '23505') {
      res.status(409).json({ success: false, message: 'Email already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// Get audit logs (all entries)
router.get('/audit-logs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, action, user_email, user_role, description, created_at
       FROM itsd_schema.audit_logs
       ORDER BY created_at DESC
       LIMIT 1000`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    // Return empty array if table doesn't exist or query fails
    res.json([]);
  }
});

// Record audit log
router.post('/record-audit', async (req, res) => {
  const { action, user_email, user_role, description } = req.body;

  try {
    // Validate required fields
    if (!action) {
      return res.status(400).json({ success: false, message: 'Action is required' });
    }

    // Insert audit log record (include role if provided)
    const result = await pool.query(
      `INSERT INTO itsd_schema.audit_logs (action, user_email, user_role, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, action, user_email, user_role, description, created_at`,
      [action, user_email || null, user_role || null, description || null]
    );

    res.status(201).json({ success: true, auditLog: result.rows[0] });
  } catch (error) {
    console.error('Audit log recording error:', error);
    // Don't fail the request if audit logging fails
    res.status(500).json({ success: false, message: 'Failed to record audit log' });
  }
});

// Update profile (name, email, phone, department) in login table
router.put('/update-profile', async (req, res) => {
  try {
    const { userId, name, email, phone, department } = req.body || {};

    if (userId === undefined || userId === null || userId === '') {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const id = typeof userId === 'string' && /^\d+$/.test(userId) ? parseInt(userId, 10) : userId;

    let result;
    try {
      result = await pool.query(
        `UPDATE itsd_schema.login 
         SET name = $1, email = $2, phone = $3, department = $4 
         WHERE id = $5 
         RETURNING id, name, email, role, department, phone, notes, permissions, is_active, created_at`,
        [name.trim(), email.trim(), (phone || '').trim() || null, (department || '').trim() || null, id]
      );
    } catch (colErr) {
      if (colErr.code === '42703' || (colErr.message && colErr.message.includes('column'))) {
        result = await pool.query(
          `UPDATE itsd_schema.login 
           SET name = $1, email = $2 
           WHERE id = $3 
           RETURNING id, name, email, role, created_at`,
          [name.trim(), email.trim(), id]
        );
      } else {
        throw colErr;
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user: result.rows[0], message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email already in use by another account' });
    }
    const msg = error.message || 'Server error';
    return res.status(500).json({ success: false, message: msg });
  }
});

// Change password in login table
router.post('/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'User ID, current password, and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  try {
    const userResult = await pool.query(
      'SELECT id, password FROM itsd_schema.login WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.password !== currentPassword) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    await pool.query(
      'UPDATE itsd_schema.login SET password = $1 WHERE id = $2',
      [newPassword, userId]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Toggle user active/inactive status
router.put('/users/:id/toggle-status', async (req, res) => {
  const { id } = req.params;
  console.log('Toggle status request for user ID:', id);

  try {
    // First, check if is_active column exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='login' AND table_schema='itsd_schema' AND column_name='is_active'
    `);

    if (checkColumn.rows.length === 0) {
      console.error('is_active column does not exist. Please run the migration.');
      return res.status(500).json({ 
        success: false, 
        message: 'Database not initialized. Please run: ALTER TABLE itsd_schema.login ADD COLUMN is_active BOOLEAN DEFAULT true;' 
      });
    }

    // Get current status and email
    const currentUser = await pool.query(
      'SELECT is_active, email FROM itsd_schema.login WHERE id = $1',
      [id]
    );

    if (currentUser.rows.length === 0) {
      console.log('User not found:', id);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentStatus = currentUser.rows[0].is_active;
    const userEmail = currentUser.rows[0].email;
    console.log('Current status:', currentStatus);
    const newStatus = !currentStatus;
    console.log('New status:', newStatus);

    // Update status in login
    const result = await pool.query(
      `UPDATE itsd_schema.login SET is_active = $1 WHERE id = $2 RETURNING id, name, email, role, department, phone, notes, permissions, is_active, created_at`,
      [newStatus, id]
    );

    // If this user exists in adminlogin, propagate the status there as well
    try {
      const syncAdmin = await pool.query(
        `UPDATE itsd_schema.adminlogin SET is_active = $1 WHERE email = $2 RETURNING id, email, is_active`,
        [newStatus, userEmail]
      );
      if (syncAdmin.rows.length > 0) {
        console.log('Synchronized adminlogin for email:', userEmail, syncAdmin.rows[0]);
      }
    } catch (syncErr) {
      console.warn('Failed to sync status to adminlogin:', syncErr.message);
    }

    console.log('Update result:', result.rows[0]);
    res.json({ success: true, user: result.rows[0], message: `User ${newStatus ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error('Toggle user status error:', error.message);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Upload profile picture
router.post('/upload-profile', upload.single('profileImage'), async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No profile image file provided' });
    }

    const profilePath = `/uploads/profiles/${req.file.filename}`;

    // Update the profile column in login table
    const result = await pool.query(
      `UPDATE itsd_schema.login 
       SET profile = $1 
       WHERE id = $2 
       RETURNING id, name, email, role, department, phone, profile, created_at`,
      [profilePath, userId]
    );

    if (result.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0], message: 'Profile image uploaded successfully', profilePath });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Profile upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload profile image: ' + error.message });
  }
});

module.exports = router;
