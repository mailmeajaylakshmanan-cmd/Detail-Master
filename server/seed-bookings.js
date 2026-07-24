require('dotenv').config();
const mongoose = require('mongoose');
const WebsiteBooking = require('./models/WebsiteBooking');

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Clear existing
    await WebsiteBooking.deleteMany({});

    const dummyBookings = [
      {
        customerName: 'Alice Johnson',
        customerEmail: 'alice@example.com',
        customerPhone: '555-0100',
        carMake: 'Tesla',
        carModel: 'Model 3',
        serviceInterested: 'Ceramic Coating Package',
        preferredDate: new Date(Date.now() + 86400000 * 2), // in 2 days
        status: 'Pending',
        notes: 'I would like to know if this package includes interior detailing as well.'
      },
      {
        customerName: 'Bob Smith',
        customerEmail: 'bob@smith.com',
        customerPhone: '555-0200',
        carMake: 'BMW',
        carModel: 'M4',
        serviceInterested: 'Paint Protection Film (PPF)',
        preferredDate: new Date(Date.now() + 86400000 * 5),
        status: 'Pending',
        notes: 'Looking to wrap the full front.'
      },
      {
        customerName: 'Charlie Davis',
        customerEmail: 'charlie@davis.net',
        customerPhone: '555-0300',
        carMake: 'Porsche',
        carModel: '911 Carrera',
        serviceInterested: 'Premium Wash & Wax',
        preferredDate: new Date(Date.now() - 86400000 * 1), // yesterday
        status: 'Confirmed',
        notes: 'Bringing it in at 10 AM.'
      },
      {
        customerName: 'Diana Prince',
        customerEmail: 'diana@amazon.com',
        customerPhone: '555-0400',
        carMake: 'Audi',
        carModel: 'RS6 Avant',
        serviceInterested: 'Interior Deep Clean',
        preferredDate: new Date(Date.now() - 86400000 * 5),
        status: 'Completed',
        notes: 'Coffee spill on passenger seat.'
      }
    ];

    await WebsiteBooking.insertMany(dummyBookings);
    console.log('Dummy bookings inserted successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
