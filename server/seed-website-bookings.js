const mongoose = require('mongoose');
require('dotenv').config();
const WebsiteBooking = require('./models/WebsiteBooking');

const MONGODB_URI = process.env.MONGODB_URI;

const bookings = [
  {
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '1234567890',
    carMake: 'Toyota',
    carModel: 'Camry',
    serviceInterested: 'Foam Wash',
    preferredDate: new Date(Date.now() + 86400000),
    status: 'Pending',
    notes: 'Please call before coming.'
  },
  {
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    customerPhone: '0987654321',
    carMake: 'Honda',
    carModel: 'Civic',
    serviceInterested: 'Interior Cleaning',
    preferredDate: new Date(Date.now() + 172800000),
    status: 'Confirmed',
    notes: 'Needs deep cleaning.'
  },
  {
    customerName: 'Alice Johnson',
    customerEmail: 'alice@example.com',
    customerPhone: '5551234567',
    carMake: 'BMW',
    carModel: 'X5',
    serviceInterested: 'Ceramic Coating',
    preferredDate: new Date(Date.now() - 86400000),
    status: 'Completed',
    notes: 'Completed successfully.'
  },
  {
    customerName: 'Bob Williams',
    customerEmail: 'bob@example.com',
    customerPhone: '5559876543',
    carMake: 'Audi',
    carModel: 'A4',
    serviceInterested: 'Headlight Restoration',
    preferredDate: new Date(Date.now() + 259200000),
    status: 'Cancelled',
    notes: 'Customer cancelled due to emergency.'
  },
  {
    customerName: 'Charlie Brown',
    customerEmail: 'charlie@example.com',
    customerPhone: '5554443333',
    carMake: 'Mercedes',
    carModel: 'C-Class',
    serviceInterested: 'Paint Protection Film',
    preferredDate: new Date(Date.now() + 345600000),
    status: 'Pending',
    notes: ''
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected for seeding Website Bookings');

    // Clear existing
    await WebsiteBooking.deleteMany({});
    console.log('Cleared existing Website Bookings data');

    // Seed new
    const docs = await WebsiteBooking.insertMany(bookings);
    console.log(`Seeded ${docs.length} website bookings`);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seed();
