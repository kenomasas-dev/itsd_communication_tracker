const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Create a new group. Expects { name, assignedTo, members, createdBy }
router.post('/', async (req, res, next) => {
  try {
    console.log('POST /api/groups received:', req.body);
    const { name, assignedTo, members = [], createdBy = null } = req.body;

    // Validate: name is required
    if (!name || name.trim() === '') {
      console.error('name is required or empty');
      return res.status(400).json({ message: 'Group name is required' });
    }

    const groupName = name.trim();
    const groupAssignedTo = assignedTo ? assignedTo.trim() : null;
    const membersCount = Array.isArray(members) ? members.length : 0;

    // Try inserting including `members` JSONB if column exists; fallback if not.
    const client = await pool.connect();
    try {
      console.log('Attempting to insert group:', { groupName, groupAssignedTo, membersCount, createdBy });
      const insertWithMembers = `INSERT INTO itsd_schema.groups (name, assigned_to, members_count, members, created_by) VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING *`;
      const values = [groupName, groupAssignedTo, membersCount, JSON.stringify(members), createdBy];
      const result = await client.query(insertWithMembers, values);
      const group = result.rows[0];
      console.log('✓ Group inserted successfully:', group);

      // If we have members, try to populate itsd_schema.group_members with resolved user IDs
      if (Array.isArray(members) && members.length > 0) {
        for (const m of members) {
          try {
            let userId = null;
            let email = null;
            if (typeof m === 'string') {
              const s = m.trim();
              if (s.includes('@')) {
                // lookup by email
                const ures = await client.query('SELECT id, email FROM itsd_schema.login WHERE email = $1 LIMIT 1', [s]);
                if (ures.rows.length > 0) {
                  userId = ures.rows[0].id;
                  email = ures.rows[0].email;
                }
              } else {
                // lookup by name (case-insensitive)
                const ures = await client.query('SELECT id, email FROM itsd_schema.login WHERE name ILIKE $1 LIMIT 1', [s]);
                if (ures.rows.length > 0) {
                  userId = ures.rows[0].id;
                  email = ures.rows[0].email;
                }
              }
            } else if (m && m.email) {
              const ures = await client.query('SELECT id, email FROM itsd_schema.login WHERE email = $1 LIMIT 1', [m.email]);
              if (ures.rows.length > 0) {
                userId = ures.rows[0].id;
                email = ures.rows[0].email;
              }
            }

            if (userId) {
              // Insert into group_members (ignore duplicates)
              try {
                await client.query(
                  `INSERT INTO itsd_schema.group_members (group_id, user_id, email, added_by) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
                  [group.id, userId, email, createdBy]
                );
              } catch (gmErr) {
                // ignore individual member insert errors
                console.warn('Failed to insert group_member for', m, gmErr.message);
              }
            }
          } catch (innerErr) {
            console.warn('Error resolving member', m, innerErr.message);
          }
        }
      }

      return res.json(group);
    } catch (err) {
      // If members column doesn't exist, fallback to inserting without it
      console.error('First insert attempt failed:', err.code, err.message);
      if (err.code === '42703' || /column .* does not exist/i.test(err.message)) {
        console.log('Column missing, falling back to insert without members column');
        const insertFallback = `INSERT INTO itsd_schema.groups (name, assigned_to, members_count, created_by) VALUES ($1, $2, $3, $4) RETURNING *`;
        const result = await client.query(insertFallback, [groupName, groupAssignedTo, membersCount, createdBy]);
        const group = result.rows[0];
        console.log('✓ Group inserted (fallback):', group);

        // members fallback: attempt to insert into group_members if user ids resolvable
        if (Array.isArray(members) && members.length > 0) {
          for (const m of members) {
            try {
              let userId = null;
              let email = null;
              if (typeof m === 'string') {
                const s = m.trim();
                if (s.includes('@')) {
                  const ures = await client.query('SELECT id, email FROM itsd_schema.login WHERE email = $1 LIMIT 1', [s]);
                  if (ures.rows.length > 0) { userId = ures.rows[0].id; email = ures.rows[0].email; }
                } else {
                  const ures = await client.query('SELECT id, email FROM itsd_schema.login WHERE name ILIKE $1 LIMIT 1', [s]);
                  if (ures.rows.length > 0) { userId = ures.rows[0].id; email = ures.rows[0].email; }
                }
              } else if (m && m.email) {
                const ures = await client.query('SELECT id, email FROM itsd_schema.login WHERE email = $1 LIMIT 1', [m.email]);
                if (ures.rows.length > 0) { userId = ures.rows[0].id; email = ures.rows[0].email; }
              }

              if (userId) {
                try {
                  await client.query(
                    `INSERT INTO itsd_schema.group_members (group_id, user_id, email, added_by) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
                    [group.id, userId, email, createdBy]
                  );
                } catch (gmErr) { console.warn('group_members insert failed', gmErr.message); }
              }
            } catch (innerErr) { console.warn('member resolve error', innerErr.message); }
          }
        }

        return res.json(group);
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ POST /api/groups error:', err);
    res.status(500).json({ error: err.message, code: err.code });
    next(err);
  }
});

// Get groups list - return name, assigned_to and members columns
router.get('/', async (req, res, next) => {
  try {
    console.log('GET /api/groups endpoint called');
    const result = await pool.query('SELECT id, name, assigned_to, members FROM itsd_schema.groups ORDER BY assigned_to ASC');
    console.log('Groups query result:', result.rows);
    const responseData = { groups: result.rows };
    console.log('Sending response:', JSON.stringify(responseData, null, 2));
    res.json(responseData);
  } catch (err) {
    console.error('Error in GET /api/groups:', err);
    next(err);
  }
});

// Update an existing group by id. Expects { name, assigned_to, members }
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, assigned_to, members = [] } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    const groupName = name.trim();
    const groupAssignedTo = assigned_to ? assigned_to.trim() : null;
    const membersCount = Array.isArray(members) ? members.length : 0;

    const result = await pool.query(
      `UPDATE itsd_schema.groups
       SET name = $1, assigned_to = $2, members = $3::jsonb, members_count = $4
       WHERE id = $5
       RETURNING *`,
      [groupName, groupAssignedTo, JSON.stringify(members), membersCount, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    return res.json({ success: true, group: result.rows[0] });
  } catch (err) {
    console.error('❌ PUT /api/groups/:id error:', err);
    next(err);
  }
});

module.exports = router;
