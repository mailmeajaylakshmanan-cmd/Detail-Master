const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_deOw6I4UjgAx@ep-square-hill-axmcdms4.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' }); 

async function assignMenus() {
  try {
    const rolesResult = await pool.query('SELECT id FROM roles');
    const roles = rolesResult.rows;

    for (const role of roles) {
      // Check if it exists
      const exists = await pool.query('SELECT 1 FROM role_menus WHERE role_id = $1 AND menu_id = 11', [role.id]);
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO role_menus (role_id, menu_id, can_view, can_add, can_edit, can_delete) 
           VALUES ($1, 11, TRUE, TRUE, TRUE, TRUE)`, 
          [role.id]
        );
        console.log(`Assigned menu 11 to role ${role.id}`);
      }
    }

    const usersResult = await pool.query('SELECT id FROM admin_users');
    const users = usersResult.rows;

    for (const user of users) {
      // Check if it exists
      const exists = await pool.query('SELECT 1 FROM user_menus WHERE user_id = $1 AND menu_id = 11', [user.id]);
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO user_menus (user_id, menu_id, can_view) 
           VALUES ($1, 11, TRUE)`, 
          [user.id]
        );
        console.log(`Assigned menu 11 to user ${user.id}`);
      }
    }
    console.log("Done assigning menus.");
  } catch (error) {
    console.error(error);
  } finally {
    pool.end();
  }
}

assignMenus();
