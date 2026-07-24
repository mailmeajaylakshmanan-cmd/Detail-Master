const mongoose = require('mongoose');
require('dotenv').config();
const Service = require('./models/Service');

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
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected for seeding services');

    await Service.deleteMany({});
    console.log('Cleared existing services');

    for (const s of detailingServices) {
      await Service.create(s);
      console.log(`Seeded service: ${s.name}`);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding services:', err);
    process.exit(1);
  }
}

seed();
