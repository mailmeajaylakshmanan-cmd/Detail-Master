const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { protect } = require('../middleware/auth');

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

// GET all menus
router.get('/menus', protect, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.menus ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching menus:', error);
    res.status(500).json({ message: 'Server error' });
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

// POST to save assigned menus for a specific role
router.post('/roles/:roleId/menus', protect, async (req, res) => {
  const { roleId } = req.params;
  const { menus } = req.body; // Expecting array of { menu_id, can_view, can_add, can_edit, can_delete }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear existing permissions for this role
    await client.query('DELETE FROM public.role_menus WHERE role_id = $1', [roleId]);
    
    // Insert new permissions
    for (const menu of menus) {
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
            menu.can_delete || false
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

module.exports = router;
