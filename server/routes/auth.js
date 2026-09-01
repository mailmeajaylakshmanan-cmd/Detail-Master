const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { protect, invalidateSessionCache } = require('../middleware/auth'); // using the existing export

const JWT_SECRET = process.env.JWT_SECRET;

async function getUserWithMenus(userId) {
  const userResult = await pool.query(
    `SELECT au.id, au.username, au.email, au.role_id, au.is_active, r.permissions, r.role_name 
     FROM public.admin_users au 
     JOIN public.roles r ON au.role_id = r.id 
     WHERE au.id = $1`,
    [userId]
  );
  
  if (userResult.rows.length === 0) return null;
  const user = userResult.rows[0];

  let flatMenus = [];
  
  if (user.role_name === 'Super Admin' || user.role_name === 'Administrator') {
    const menuResult = await pool.query('SELECT * FROM public.menus WHERE is_active = TRUE ORDER BY id ASC');
    flatMenus = menuResult.rows.map(m => ({
      ...m,
      can_view: true,
      can_add: true,
      can_edit: true,
      can_delete: true
    }));
  } else {
    // Menus from role_menus OR user_menus overrides
    const menuQuery = `
      SELECT m.*,
        COALESCE(um.can_view, rm.can_view, false) AS can_view,
        COALESCE(um.can_add, rm.can_add, false) AS can_add,
        COALESCE(um.can_edit, rm.can_edit, false) AS can_edit,
        COALESCE(um.can_delete, rm.can_delete, false) AS can_delete
      FROM public.menus m
      LEFT JOIN public.role_menus rm ON rm.menu_id = m.id AND rm.role_id = $1
      LEFT JOIN public.user_menus um ON um.menu_id = m.id AND um.user_id = $2
      WHERE m.is_active = TRUE
        AND (
          um.can_view = TRUE OR
          (um.can_view IS NULL AND rm.can_view = TRUE)
        )
      ORDER BY m.id ASC
    `;
    const menuResult = await pool.query(menuQuery, [user.role_id, user.id]);
    flatMenus = menuResult.rows;

    // Include inactive parents? No — include active parent rows so sidebar groups render
    const parentIds = [...new Set(flatMenus.map((m) => m.parent_id).filter(Boolean))];
    const missingParents = parentIds.filter((pid) => !flatMenus.some((m) => m.id === pid));
    if (missingParents.length) {
      const parents = await pool.query(
        `SELECT * FROM public.menus WHERE id = ANY($1::int[]) AND is_active = TRUE`,
        [missingParents]
      );
      flatMenus = [...flatMenus, ...parents.rows];
    }
  }

  // Build tree
  const menuTree = [];
  const menuMap = {};
  
  flatMenus.forEach(m => {
    menuMap[m.id] = { ...m, subItems: [] };
  });

  flatMenus.forEach(m => {
    if (m.parent_id) {
      if (menuMap[m.parent_id]) {
        menuMap[m.parent_id].subItems.push(menuMap[m.id]);
      } else {
        // Parent not visible — still show child at top level
        menuTree.push(menuMap[m.id]);
      }
    } else {
      menuTree.push(menuMap[m.id]);
    }
  });

  const cleanTree = (items) => {
    return items.map(item => {
      if (item.subItems.length === 0) delete item.subItems;
      else cleanTree(item.subItems);
      return item;
    });
  };

  return {
    id: user.id,
    username: user.username,
    role_id: user.role_id,
    role_name: user.role_name,
    permissions: user.permissions,
    menus: cleanTree(menuTree)
  };
}

const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 15 : 1000, // Relaxed in development
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter both username/email and password.' });
  }

  try {
    const result = await pool.query(
      `SELECT id, role_id, password_hash, is_active FROM public.admin_users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`,
      [email.trim()]
    );
    const userRow = result.rows[0];

    if (!userRow) {
      return res.status(401).json({ message: 'User account does not exist. Please check your username or email.' });
    }
    if (!userRow.is_active) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact your system administrator.' });
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password. Please verify your password and try again.' });
    }

    const userResponse = await getUserWithMenus(userRow.id);

    await pool.query('UPDATE public.admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [userRow.id]);

    const tokenPayload = { id: userRow.id, role_id: userRow.role_id };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ipAddress = rawIp.substring(0, 45);
    const rawUa = req.headers['user-agent'] || '';
    const userAgent = rawUa.substring(0, 255);

    await pool.query(
      `INSERT INTO public.login_sessions (user_id, token, ip_address, user_agent, login_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [userRow.id, token, ipAddress, userAgent]
    );

    const crypto = require('crypto');
    const csrfToken = crypto.randomBytes(32).toString('hex');

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('csrfToken', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ message: 'Logged in successfully', user: userResponse, token, csrfToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login. Please try again.' });
  }
});

router.post('/update', async (req, res) => {
  const { currentEmail, newEmail, newPassword } = req.body;
  if (!currentEmail || !newPassword) {
    return res.status(400).json({ message: 'Current username/email and new password are required.' });
  }

  try {
    const userRes = await pool.query(
      `SELECT id, username, email FROM public.admin_users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`,
      [currentEmail.trim()]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'Current user account does not exist. Please check your username.' });
    }

    const userId = userRes.rows[0].id;
    const targetEmail = (newEmail || currentEmail).trim();

    // Check if new username/email is taken by another account
    if (targetEmail.toLowerCase() !== currentEmail.trim().toLowerCase()) {
      const conflictRes = await pool.query(
        `SELECT id FROM public.admin_users WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)) AND id != $2`,
        [targetEmail, userId]
      );
      if (conflictRes.rows.length > 0) {
        return res.status(400).json({ message: 'New username or email is already taken by another account.' });
      }
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters long.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      `UPDATE public.admin_users SET username = $1, email = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [targetEmail, newHash, userId]
    );

    res.json({ message: 'Credentials updated successfully. Please log in with your new credentials.' });
  } catch (error) {
    console.error('Update credentials error:', error);
    res.status(500).json({ message: 'Failed to update credentials. Please try again.' });
  }
});

router.post('/logout', protect, async (req, res) => {
  try {
    if (req.token) {
      await pool.query('UPDATE public.login_sessions SET logout_at = CURRENT_TIMESTAMP WHERE token = $1', [req.token]);
      invalidateSessionCache(req.token);
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
  res.clearCookie('token');
  res.clearCookie('csrfToken');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', protect, async (req, res) => {
  try {
    const userResponse = await getUserWithMenus(req.user.id);
    if (!userResponse) return res.status(404).json({ message: 'User not found' });
    const csrfToken = req.cookies?.csrfToken;
    res.json({ user: userResponse, csrfToken });
  } catch (error) {
    console.error('/me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
