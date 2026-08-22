const { pool } = require('../db');

function requirePermission(menuName) {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const roleId = req.user.role_id;
      
      let action;
      switch (req.method) {
        case 'GET': action = 'can_view'; break;
        case 'POST': action = 'can_add'; break;
        case 'PUT':
        case 'PATCH': action = 'can_edit'; break;
        case 'DELETE': action = 'can_delete'; break;
        default: return next();
      }

      // Check Super Admin / Administrator override
      const userRes = await pool.query('SELECT r.role_name FROM public.admin_users au JOIN public.roles r ON au.role_id = r.id WHERE au.id = $1', [userId]);
      if (userRes.rows.length > 0) {
        const roleName = userRes.rows[0].role_name;
        if (roleName === 'Super Admin' || roleName === 'Administrator') {
          return next();
        }
      }

      // Check specific menu permission
      const menuQuery = `
        SELECT 1 FROM public.menus m
        WHERE m.menu_name = $1 AND m.is_active = TRUE
          AND (
            EXISTS (
              SELECT 1 FROM public.role_menus rm
              WHERE rm.menu_id = m.id AND rm.role_id = $2 AND rm.${action} = TRUE
            )
            OR EXISTS (
              SELECT 1 FROM public.user_menus um
              WHERE um.menu_id = m.id AND um.user_id = $3 AND um.${action} = TRUE
            )
          )
      `;
      const result = await pool.query(menuQuery, [menuName, roleId, userId]);
      if (result.rows.length > 0) return next();

      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(500).json({ message: 'Server error checking permissions' });
    }
  };
}

module.exports = { requirePermission };
