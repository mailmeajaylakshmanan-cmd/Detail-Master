process.env.TZ = 'Asia/Kolkata';

const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const { ensureIndexes } = require('./db/indexes');

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in the environment.');
  process.exit(1);
}

const app = express();

const allowedOrigins = [
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : []),
  'https://manage.detailingmasters.in',
  'https://detailingmasters.in',
  'http://localhost:5173',
  'http://localhost:3000'
].map(s => s.trim()).filter(Boolean);

// Root Health Checks for Railway, Load Balancers, and Pingers (before any heavy middleware)
app.get('/', (req, res) => res.status(200).json({ status: 'ok', app: 'DETAILING MASTERS API' }));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', app: 'DETAILING MASTERS Billing' }));
app.head('/', (req, res) => res.sendStatus(200));
app.head('/health', (req, res) => res.sendStatus(200));

app.use(compression());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(cors({
  origin(origin, cb) {
    // Allow same-origin / server-to-server / local tools with no Origin header
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const sanitize = require('./middleware/sanitize');
const csrfProtection = require('./middleware/csrf');
const { protect } = require('./middleware/auth');

app.use(sanitize);

// Public Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/web_bookings', require('./routes/web_bookings'));

app.use(csrfProtection);

// Services (GET is public; mutations are protected within the router)
app.use('/api/services', require('./routes/services'));

// Protected Routes
app.use('/api/clients', protect, require('./routes/clients'));
app.use('/api/vehicles', protect, require('./routes/vehicles'));
app.use('/api/job_orders', protect, require('./routes/job_orders'));
app.use('/api/job_order_services', protect, require('./routes/job_order_services'));
app.use('/api/invoices', protect, require('./routes/invoices'));
app.use('/api/payments', protect, require('./routes/payments'));
app.use('/api/permissions', protect, require('./routes/permissions'));
app.use('/api/organizations', protect, require('./routes/organizations'));
app.use('/api/third_party_services', protect, require('./routes/third_party_services'));
app.use('/api/offerMaster', protect, require('./routes/master_offers'));
app.use('/api/offers', protect, require('./routes/assigned_offers'));
app.use('/api/reports', protect, require('./routes/reports'));
app.use('/api/service-time', protect, require('./routes/service_time'));
app.use('/api/vehicle_types', protect, require('./routes/vehicle_types'));
app.use('/api/dashboard', protect, require('./routes/dashboard'));
app.use('/api/notifications', protect, require('./routes/notifications'));

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
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
  ensureIndexes().catch((err) => console.error('[indexes] bootstrap failed', err));
  require('./jobs/serviceCompletionReminders').start();
}

module.exports = app;
