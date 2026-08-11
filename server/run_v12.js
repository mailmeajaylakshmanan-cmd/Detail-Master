const { Pool } = require('pg'); 
const fs = require('fs');
const path = require('path');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_deOw6I4UjgAx@ep-square-hill-axmcdms4.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' }); 

const sql = fs.readFileSync(path.join(__dirname, 'db', 'migrations', 'v12__update_menu_names.sql'), 'utf8');

pool.query(sql)
  .then(res => { console.log("Migrations applied successfully!"); pool.end(); })
  .catch(err => { console.error("Error applying migrations:", err); pool.end(); });
