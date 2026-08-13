require('dotenv').config();
const { pool } = require('./db');

async function run() {
  const menus = [{ menu_id: NaN, can_view: true }];
  const userId = 3;

  const client = await pool.connect();
  try {
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
    console.log('Success');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating user menus:', error.message);
  } finally {
    client.release();
    process.exit();
  }
}
run();
