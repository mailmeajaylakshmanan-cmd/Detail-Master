const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_deOw6I4UjgAx@ep-square-hill-axmcdms4.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' }); 

client.connect()
  .then(() => {
    // Insert "Organizations" under "Masters"
    return client.query(`
      INSERT INTO menus (parent_id, menu_name, route_path, icon, sort_order)
      SELECT id, 'Organizations', '/master-organization', 'briefcase', 4
      FROM menus
      WHERE menu_name = 'Masters'
      RETURNING *;
    `);
  })
  .then(res => { 
    console.log("Inserted menu:", res.rows); 
    client.end(); 
  })
  .catch(err => {
    console.error(err);
    client.end();
  });
