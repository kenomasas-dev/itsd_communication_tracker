const express = require('express');
const cors = require('cors');
const pool = require('./src/config/database');
const authRoutes = require('./src/routes/auth');
const adminAuthRoutes = require('./src/routes/admin-auth');
const communicationsRoutes = require('./src/routes/communications');
const rolesRoutes = require('./src/routes/roles');
const permissionsRoutes = require('./src/routes/permissions');
const groupsRoutes = require('./src/routes/groups');
const messageRoutes = require('./src/routes/message');
const themesRoutes = require('./src/routes/themes');
const backupRoutes = require('./src/routes/backup');
const notificationsRoutes = require('./src/routes/notifications');
const securityRoutes = require('./src/routes/security');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.SERVER_PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
  } else {
    console.log('✓ Connected to PostgreSQL database (itsd)');
    release();
  }
});

// Routes - register these first so they are always available
app.put('/api/auth/update-profile', async (req, res) => {
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
        `UPDATE itsd_schema.login SET name = $1, email = $2, phone = $3, department = $4 WHERE id = $5 RETURNING id, name, email, role, department, phone, notes, permissions, is_active, created_at`,
        [String(name).trim(), String(email).trim(), (phone && String(phone).trim()) || null, (department && String(department).trim()) || null, id]
      );
    } catch (colErr) {
      if (colErr.code === '42703' || (colErr.message && colErr.message.includes('column'))) {
        result = await pool.query(
          `UPDATE itsd_schema.login SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role, created_at`,
          [String(name).trim(), String(email).trim(), id]
        );
      } else throw colErr;
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
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body || {};
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'User ID, current password, and new password are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const userResult = await pool.query('SELECT id, password FROM itsd_schema.login WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (userResult.rows[0].password !== currentPassword) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    await pool.query('UPDATE itsd_schema.login SET password = $1 WHERE id = $2', [newPassword, userId]);
    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin-auth', adminAuthRoutes);
app.use('/api/communications', communicationsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/themes', themesRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/security', securityRoutes);

// Root route - welcome message
app.get('/', (req, res) => {
  res.json({
    message: 'ITSD Backend Server',
    status: 'Running',
    endpoints: {
      login: 'POST /api/auth/login',
      adminLogin: 'POST /api/admin-auth/admin-login',
      loginRecords: 'GET /api/auth/login-records',
      communications: 'POST/GET /api/communications',
      health: 'GET /api/health'
    },
    frontend: 'http://localhost:5001'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', database: 'PostgreSQL (itsd)' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  console.log(`Database:  itsd (PostgreSQL)`);
});
