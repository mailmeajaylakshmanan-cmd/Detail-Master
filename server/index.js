process.env.TZ = 'Asia/Kolkata';

const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const { ensureIndexes } = require('./db/indexes');

const app = express();

const allowedOrigins = [
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['http://localhost:5173']),
  'https://detailingmasters.in'
].map(s => s.trim()).filter(Boolean);

app.use(compression());
app.use(cors({
  origin(origin, cb) {
    // Allow same-origin / server-to-server / local tools with no Origin header
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/services', require('./routes/services'));
app.use('/api/job_orders', require('./routes/job_orders'));
app.use('/api/job_order_services', require('./routes/job_order_services'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/permissions', require('./routes/permissions'));
app.use('/api/web_bookings', require('./routes/web_bookings'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/third_party_services', require('./routes/third_party_services'));
app.use('/api/offerMaster', require('./routes/master_offers'));
app.use('/api/offers', require('./routes/assigned_offers'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/service-time', require('./routes/service_time'));
app.use('/api/vehicle_types', require('./routes/vehicle_types'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'DETAILING MASTERS Billing' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.message === 'Not allowed by CORS' ? 403 : 500)
    .json({ message: err.message === 'Not allowed by CORS' ? err.message : 'Internal Server Error' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  // Apply idempotent performance indexes before serving traffic.
  ensureIndexes()
    .catch((err) => console.error('[indexes] bootstrap failed', err))
    .finally(() => {
      app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
      require('./jobs/serviceCompletionReminders').start();
    });
}

module.exports = app;
