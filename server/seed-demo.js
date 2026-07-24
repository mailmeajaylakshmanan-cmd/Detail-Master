const mongoose = require('mongoose');
require('dotenv').config();
const Service = require('./models/Service');
const Customer = require('./models/Customer');
const Invoice = require('./models/Invoice');

const MONGODB_URI = process.env.MONGODB_URI;

const detailingServices = [
  { name: 'Foam Wash', description: 'Complete exterior foam wash', price: 500 },
  { name: 'Interior Cleaning', description: 'Deep cleaning of interior surfaces', price: 1500 },
  { name: 'Ceramic Coating', description: 'Long lasting ceramic protection for paint', price: 15000 },
  { name: 'Headlight Restoration', description: 'Restore yellowed headlights to clear', price: 800 },
  { name: 'Interior Steaming', description: 'Steam clean seats and carpets', price: 1200 },
  { name: 'Engine Bay Detailing', description: 'Safe cleaning of the engine bay', price: 2000 },
  { name: 'Polish', description: 'Exterior machine polish', price: 3000 },
  { name: 'Paint Protection Film', description: 'Clear bra PPF application', price: 25000 },
  { name: 'Full Exterior Polish', description: 'High gloss correction', price: 8000 },
  { name: 'Deep Interior Steam', description: 'Premium steam care for cabin', price: 3500 }
];

const demoCustomers = [
  { name: 'Arjun Reddy', phone: '9876543210', address: 'Banjara Hills, Hyderabad' },
  { name: 'Vikram Singh', phone: '8765432109', address: 'Koramangala, Bengaluru' },
  { name: 'Neha Sharma', phone: '7654321098', address: 'Bandra West, Mumbai' },
  { name: 'Rahul Desai', phone: '6543210987', address: 'Vasant Vihar, Delhi' },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected for seeding demo data');

    // 1. Clear existing
    await Service.deleteMany({});
    await Customer.deleteMany({});
    await Invoice.deleteMany({});
    console.log('Cleared existing data (Services, Customers, Invoices)');

    // 2. Seed Services
    const serviceDocs = await Service.insertMany(detailingServices);
    console.log(`Seeded ${serviceDocs.length} services`);

    // 3. Seed Customers
    const customerDocs = await Customer.insertMany(demoCustomers);
    console.log(`Seeded ${customerDocs.length} customers`);

    // 4. Seed Invoices (Realistic past and upcoming)
    const today = new Date();
    const pastDate = new Date(); pastDate.setDate(today.getDate() - 5);
    const futureDate = new Date(); futureDate.setDate(today.getDate() + 2);

    const invoices = [
      {
        invoiceNo: 'INV-2023-001',
        customer: { name: customerDocs[0].name, phone: customerDocs[0].phone },
        carMake: 'Porsche',
        carModel: '911 GT3',
        licensePlate: 'KA 01 AB 1234',
        date: today.toISOString(),
        services: [
          { service: 'Paint Protection Film', price: 25000, total: 25000 },
          { service: 'Ceramic Coating', price: 15000, total: 15000 }
        ],
        subtotal: 40000,
        discount: 0,
        total: 40000,
        status: 'pending'
      },
      {
        invoiceNo: 'INV-2023-002',
        customer: { name: customerDocs[1].name, phone: customerDocs[1].phone },
        carMake: 'BMW',
        carModel: 'M5 Competition',
        licensePlate: 'MH 02 XY 9999',
        date: pastDate.toISOString(),
        services: [
          { service: 'Full Exterior Polish', price: 8000, total: 8000 },
          { service: 'Interior Cleaning', price: 1500, total: 1500 }
        ],
        subtotal: 9500,
        discount: 500,
        total: 9000,
        status: 'paid'
      },
      {
        invoiceNo: 'INV-2023-003',
        customer: { name: customerDocs[2].name, phone: customerDocs[2].phone },
        carMake: 'Tesla',
        carModel: 'Model 3',
        licensePlate: 'DL 4C ZA 7777',
        date: futureDate.toISOString(),
        services: [
          { service: 'Foam Wash', price: 500, total: 500 },
          { service: 'Deep Interior Steam', price: 3500, total: 3500 }
        ],
        subtotal: 4000,
        discount: 0,
        total: 4000,
        status: 'partial'
      }
    ];

    await Invoice.insertMany(invoices);
    console.log(`Seeded ${invoices.length} invoices`);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seed();
