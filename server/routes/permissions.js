const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(requirePermission('Access Control'));

// GET all roles
router.get('/roles', protect, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.roles ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all menus (Ordered logically by parent-child relation)
router.get('/menus', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM public.menus 
       ORDER BY COALESCE(parent_id, id) ASC, (parent_id IS NOT NULL) ASC, sort_order ASC, id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching menus:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET admin users (for user_menus assignment)
router.get('/users', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT au.id, au.username, au.full_name, au.email, au.role_id, au.is_active, r.role_name
       FROM public.admin_users au
       LEFT JOIN public.roles r ON r.id = au.role_id
       ORDER BY au.id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST create a new user
router.post('/users', protect, async (req, res) => {
  const { username, password, email, full_name, role_id } = req.body;
  if (!username || !password || !email || !role_id) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Check if user already exists
    const existing = await pool.query('SELECT id FROM public.admin_users WHERE username = $1 OR email = $2', [username, email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Username or Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO public.admin_users (username, password_hash, email, full_name, role_id, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW()) RETURNING id, username, email, full_name, role_id`,
      [username, hash, email, full_name || username, role_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error creating user' });
  }
});

// PUT update a user's password
router.put('/users/:id/password', protect, async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ message: 'Missing new password' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    const result = await pool.query(
      'UPDATE public.admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [hash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Server error updating password' });
  }
});

// GET assigned menus for a specific role
router.get('/roles/:roleId/menus', protect, async (req, res) => {
  const { roleId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM public.role_menus WHERE role_id = $1', [roleId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching role menus:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST save role_menus
router.post('/roles/:roleId/menus', protect, async (req, res) => {
  const { roleId } = req.params;
  const { menus } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM public.role_menus WHERE role_id = $1', [roleId]);

    for (const menu of menus || []) {
      if (menu.can_view || menu.can_add || menu.can_edit || menu.can_delete) {
        await client.query(
          `INSERT INTO public.role_menus (role_id, menu_id, can_view, can_add, can_edit, can_delete)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            roleId,
            menu.menu_id,
            menu.can_view || false,
            menu.can_add || false,
            menu.can_edit || false,
            menu.can_delete || false,
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Permissions updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating role menus:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// GET user_menus for a user
// Link: user_menus.user_id ← admin_users.id, user_menus.menu_id ← menus.id
router.get('/users/:userId/menus', protect, async (req, res) => {
  const { userId } = req.params;
  try {
    const userCheck = await pool.query('SELECT id FROM public.admin_users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await pool.query(
      `SELECT um.*, m.menu_name, m.route_path, m.parent_id
       FROM public.user_menus um
       JOIN public.menus m ON m.id = um.menu_id
       WHERE um.user_id = $1
       ORDER BY um.menu_id ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user menus:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST replace user_menus for a user
// Body: { menus: [{ menu_id, can_view }] }
router.post('/users/:userId/menus', protect, async (req, res) => {
  const { userId } = req.params;
  const { menus } = req.body;

  const client = await pool.connect();
  try {
    const userCheck = await client.query('SELECT id FROM public.admin_users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM public.user_menus WHERE user_id = $1', [userId]);

    for (const menu of menus || []) {
      if (menu.can_view || menu.can_add || menu.can_edit || menu.can_delete) {
        await client.query(
          `INSERT INTO public.user_menus (user_id, menu_id, can_view, can_add, can_edit, can_delete)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId, 
            menu.menu_id, 
            menu.can_view || false,
            menu.can_add || false,
            menu.can_edit || false,
            menu.can_delete || false
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'User menus updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating user menus:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
