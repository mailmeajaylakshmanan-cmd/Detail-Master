require('dotenv').config();
const { pool } = require('./db');

async function run() {
  try {
    await pool.query(`
      INSERT INTO web_bookings 
      (full_name, phone, email, vehicle_brand, vehicle_model, vehicle_type, service_id, preferred_date, preferred_time_period, allocated_time, status)
      VALUES 
      ('Ajay Test', '9876543210', 'test@example.com', 'Mercedes', 'C-Class', 'Sedan', 
        (SELECT id FROM services LIMIT 1), 
        CURRENT_DATE, 'Morning', '10:00', 'confirmed'
      )
    `);
    console.log('Inserted fresh web booking');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
