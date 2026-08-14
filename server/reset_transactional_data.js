require('dotenv').config();
const { pool } = require('./db');

async function resetTransactionalData() {
  console.log('--- Starting Data Reset (Preserving Users, Permissions, Services, Offers & Vehicle Types) ---');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // List of transactional tables to empty
    const tablesToTruncate = [
      'payments',
      'invoice_services',
      'invoice_third_party_services',
      'invoice_vehicles',
      'invoices',
      'assigned_offer_usages',
      'assigned_offers',
      'web_bookings',
      'vehicles',
      'organizations',
      'clients'
    ];

    const truncateQuery = `TRUNCATE TABLE ${tablesToTruncate.join(', ')} RESTART IDENTITY CASCADE;`;
    console.log('Executing TRUNCATE on operational tables...');
    await client.query(truncateQuery);

    await client.query('COMMIT');
    console.log('SUCCESS: All operational data reset successfully!');
    console.log('Preserved Master Tables: admin_users, roles, menus, role_menus, user_menus, services, third_party_services, vehicle_types, master_offers.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR during data reset:', err);
  } finally {
    client.release();
    pool.end();
  }
}

resetTransactionalData();
