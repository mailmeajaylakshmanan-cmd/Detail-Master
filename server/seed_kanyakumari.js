require('dotenv').config();
const { pool } = require('./db');

// --- Helper Functions ---
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePastDate(daysAgoMin, daysAgoMax) {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(daysAgoMin, daysAgoMax));
  return date;
}

const kanyakumariNames = [
  'Muthu Kumar', 'Karthik Raja', 'Selvam', 'Anitha Krishnan', 
  'Jeya Prakash', 'Arun Vijay', 'Gopi Chand', 'Sundar Ram',
  'Meenakshi', 'Suresh Babu', 'Vinoth', 'Ramesh', 'Vignesh',
  'Priya', 'Sivakumar'
];

const kanyakumariAddresses = [
  'Nagercoil, Kanyakumari', 'Marthandam', 'Colachel', 'Thuckalay', 
  'Kanyakumari Town', 'Kuzhithurai', 'Parvathipuram', 'Vadasery'
];

const vehicleModels = [
  'Toyota Innova Crysta', 'Maruti Suzuki Swift', 'Royal Enfield Classic 350',
  'Mahindra Thar', 'Hyundai i20', 'Honda City', 'Tata Nexon', 'Kia Seltos'
];

async function seedKanyakumariData() {
  console.log('--- Starting Kanyakumari Demo Data Generation ---');
  const client = await pool.connect();

  try {

    // 1. Truncate operational tables to start fresh
    const tablesToTruncate = [
      'payments', 'invoice_services', 'invoice_third_party_services', 'invoice_vehicles',
      'invoices', 'assigned_offer_usages', 'assigned_offers', 'web_bookings',
      'vehicles', 'organizations', 'clients'
    ];
    console.log('Clearing existing transactional data...');
    await client.query(`TRUNCATE TABLE ${tablesToTruncate.join(', ')} RESTART IDENTITY CASCADE;`);

    // 2. Insert Master Services (if not already existing)
    console.log('Ensuring Master Services...');
    const servicesToInsert = [
      { name: 'Ceramic Coating', cat: 'Exterior', price: 15000 },
      { name: 'Paint Protection Film (PPF)', cat: 'Exterior', price: 45000 },
      { name: 'Deep Interior Cleaning', cat: 'Interior', price: 2500 },
      { name: 'Foam Wash & Wax', cat: 'Wash', price: 800 }
    ];
    
    let serviceIds = [];
    for (const svc of servicesToInsert) {
      let res = await client.query('SELECT id FROM services WHERE service_name = $1', [svc.name]);
      if (res.rows.length > 0) {
        serviceIds.push(res.rows[0].id);
      } else {
        res = await client.query(
          `INSERT INTO services (service_name, category, base_price) VALUES ($1, $2, $3) RETURNING id`,
          [svc.name, svc.cat, svc.price]
        );
        serviceIds.push(res.rows[0].id);
      }
    }

    // 3. Insert Third Party Vendors (Kanyakumari local)
    console.log('Adding Local Vendors...');
    const vendors = [
      { sName: 'Full Body Paint', vName: 'Nagercoil Paint Works', lCount: 2, lCharge: 1500, sPrice: 8500 },
      { sName: 'Dent Removal', vName: 'Marthandam Auto Tinkering', lCount: 1, lCharge: 800, sPrice: 2000 },
      { sName: 'Headlight Restoration', vName: 'Colachel Car Polishers', lCount: 1, lCharge: 300, sPrice: 1200 }
    ];

    let tpIds = [];
    for (const v of vendors) {
      let res = await client.query('SELECT id FROM third_party_services WHERE service_name = $1', [v.sName]);
      if (res.rows.length > 0) {
        tpIds.push(res.rows[0].id);
      } else {
        res = await client.query(
          `INSERT INTO third_party_services (service_name, vendor_name, labour_count, labour_charge, selling_price) 
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [v.sName, v.vName, v.lCount, v.lCharge, v.sPrice]
        );
        tpIds.push(res.rows[0].id);
      }
    }

    // 4. Generate Clients and Vehicles
    console.log('Generating Kanyakumari Clients & Vehicles...');
    const clientIds = [];
    const vehicleIds = [];
    
    for (let i = 0; i < 15; i++) {
      const cRes = await client.query(
        `INSERT INTO clients (full_name, phone, address, created_at) VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          randomChoice(kanyakumariNames) + (i > 5 ? ' ' + i : ''), 
          '9' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0'),
          randomChoice(kanyakumariAddresses),
          generatePastDate(30, 180)
        ]
      );
      const cId = cRes.rows[0].id;
      clientIds.push(cId);

      // Generate 1-2 vehicles per client
      const numVehicles = randomInt(1, 2);
      for (let j = 0; j < numVehicles; j++) {
        const tnxNumber = `TN-${randomChoice(['74', '75'])}`;
        const regNumber = `${tnxNumber} ${randomChoice(['A', 'B', 'Z', 'F'])} ${randomInt(1000, 9999)}`;
        const vRes = await client.query(
          `INSERT INTO vehicles (client_id, make_model, license_vin, induction_date) VALUES ($1, $2, $3, $4) RETURNING id`,
          [cId, randomChoice(vehicleModels), regNumber, generatePastDate(1, 30)]
        );
        vehicleIds.push(vRes.rows[0].id);
      }
    }

    // 5. Generate Invoices
    console.log('Generating Invoices and propagating IDs...');
    for (let i = 0; i < 30; i++) {
      const vId = randomChoice(vehicleIds);
      const cRes = await client.query('SELECT client_id FROM vehicles WHERE id = $1', [vId]);
      const cId = cRes.rows[0].client_id;
      
      const invDate = generatePastDate(1, 150);
      const invNum = `INV-KN-${1000 + i}`;
      const status = randomChoice(['completed', 'completed', 'completed', 'pending']);
      
      // Select 1-2 random services
      const selectedServices = [];
      const numSvc = randomInt(1, 2);
      let subTotal = 0;
      for (let k = 0; k < numSvc; k++) {
        const s = randomChoice(servicesToInsert);
        selectedServices.push(s);
        subTotal += s.price;
      }
      
      // Select 0-1 random third party services
      const selectedTp = [];
      if (Math.random() > 0.5) {
        const tp = randomChoice(vendors);
        selectedTp.push(tp);
        subTotal += tp.sPrice;
      }

      const invRes = await client.query(
        `INSERT INTO invoices (invoice_number, client_id, vehicle_id, status, sub_total, grand_total, amount_paid, balance_due, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          invNum, cId, vId, status, subTotal, subTotal, 
          status === 'completed' ? subTotal : 0, 
          status === 'completed' ? 0 : subTotal,
          invDate
        ]
      );
      const invId = invRes.rows[0].id;

      // Link Invoice Vehicles
      await client.query(
        `INSERT INTO invoice_vehicles (invoice_order_id, vehicle_id) VALUES ($1, $2)`,
        [invId, vId]
      );

      // Link Invoice Services
      for (const s of selectedServices) {
        const svcIdRes = await client.query('SELECT id FROM services WHERE service_name = $1 LIMIT 1', [s.name]);
        await client.query(
          `INSERT INTO invoice_services (invoice_order_id, service_id, unit_price) VALUES ($1, $2, $3)`,
          [invId, svcIdRes.rows[0].id, s.price]
        );
      }

      // Link Invoice Third Party Services
      for (const tp of selectedTp) {
        const tpIdRes = await client.query('SELECT id FROM third_party_services WHERE service_name = $1 LIMIT 1', [tp.sName]);
        await client.query(
          `INSERT INTO invoice_third_party_services (invoice_order_id, third_party_service_id, service_name, vendor_name, labour_count, labour_charge, selling_price, vehicle_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [invId, tpIdRes.rows[0].id, tp.sName, tp.vName, tp.lCount, tp.lCharge, tp.sPrice, vId]
        );
      }

      // Record Payments
      if (status === 'completed') {
        await client.query(
          `INSERT INTO payments (invoice_order_id, amount, payment_method, payment_date) VALUES ($1, $2, $3, $4)`,
          [invId, subTotal, randomChoice(['cash', 'upi', 'card']), invDate]
        );
      }
    }

    console.log('SUCCESS: Kanyakumari data generated and populated perfectly!');
    
  } catch (err) {
    console.error('ERROR during data generation:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seedKanyakumariData();
