const express = require('express');
const router = express.Router();
const db = require('../config/database');

// POST /api/message - Add a new message
router.post('/', async (req, res) => {
  const { title, body, status } = req.body;
  if (!title || !body) {
    return res.status(400).json({ success: false, message: 'Title and body are required.' });
  }
  try {
    const result = await db.query(
      `INSERT INTO itsd_schema.message (title, body, status) VALUES ($1, $2, $3) RETURNING *`,
      [title, body, status || 'draft']
    );
    res.json({ success: true, message: 'Message added successfully.', data: result.rows[0] });
  } catch (err) {
    console.error('Error inserting message:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// GET /api/message - Get all messages
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM itsd_schema.message ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// PATCH /api/message/:id/read - Mark a message as read
router.patch('/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE itsd_schema.message SET is_read = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error marking message as read:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// PATCH /api/message/:id/unread - Mark a message as unread
router.patch('/:id/unread', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE itsd_schema.message SET is_read = FALSE WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error marking message as unread:', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

module.exports = router;
