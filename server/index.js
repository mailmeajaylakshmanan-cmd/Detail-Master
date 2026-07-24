const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('MongoDB connected (cached with pool config)');
      return mongooseInstance;
    });
  }
  cached.conn = await cached.promise;
  
  // Seed admin user if none exists
  try {
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({ email: 'admin@detailingmasters.com', password: hashedPassword, studioId: 'default_studio' });
      console.log('Default admin user created.');
    }
  } catch (err) {
    console.error('Seed error:', err);
  }

  return cached.conn;
};

app.use(async (req, res, next) => {
  await connectDB();
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/services', require('./routes/services'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/media', require('./routes/media'));
app.use('/api/offerMaster', require('./routes/offerMaster'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/website-bookings', require('./routes/websiteBookings'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'DETAILING MASTERS Billing' }));



if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
