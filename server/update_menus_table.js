require('dotenv').config();
const { pool } = require('./db');

async function updateMenus() {
  try {
    console.log('Updating menus table to match client routing...');

    // 1. Dashboard
    await pool.query(`UPDATE public.menus SET route_path = '/' WHERE id = 1;`);
    
    // 2. Masters (Parent group, route should be null as it's a dropdown)
    await pool.query(`UPDATE public.menus SET route_path = NULL WHERE id = 2;`);
    
    // 3. Billing & Records
    await pool.query(`UPDATE public.menus SET route_path = '/invoices' WHERE id = 3;`);
    
    // 4. Web Bookings
    await pool.query(`UPDATE public.menus SET route_path = '/website-bookings' WHERE id = 4;`);
    
    // 5. Clients -> Customers
    await pool.query(`UPDATE public.menus SET menu_name = 'Customers', route_path = '/master-customer' WHERE id = 5;`);
    
    // 6. Vehicles -> Offers (Replacing Vehicles with Offers since Vehicles is not in Layout)
    await pool.query(`UPDATE public.menus SET menu_name = 'Offers', route_path = '/master-offers', icon = 'gift' WHERE id = 6;`);
    
    // 7. Services
    await pool.query(`UPDATE public.menus SET route_path = '/master-service' WHERE id = 7;`);

    console.log('Successfully updated the menus table!');
  } catch (err) {
    console.error('Error updating menus:', err);
  } finally {
    await pool.end();
  }
}

updateMenus();
