require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { generalLimiter } = require('./middleware/rateLimiter');

// Routes
const licenseRoutes = require('./routes/license');
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhook');
const subscriptionRoutes = require('./routes/subscription');
const adminRoutes = require('./routes/admin');
const updateRoutes = require('./routes/updates');

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.WEBSITE_URL || 'http://localhost:3001',
  'http://localhost:3001',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like CRM .exe, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// General rate limiter
app.use(generalLimiter);

// Body parsing (webhook route needs raw body, so it's excluded here)
app.use((req, res, next) => {
  if (req.path === '/api/v1/webhooks/stripe') {
    return next(); // Webhook route handles its own body parsing
  }
  express.json({ limit: '1mb' })(req, res, next);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ITStock License Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/v1/licenses', licenseRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/updates', updateRoutes);

// Plans endpoint (public)
const prisma = require('./config/database');
app.get('/api/v1/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        maxSeats: true,
        priceMonthly: true,
        priceYearly: true,
        features: true,
        sortOrder: true
      },
      orderBy: { sortOrder: 'asc' }
    });
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} non trouvee`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`, err.stack);

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.errorCode,
      message: err.message
    });
  }

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS_ERROR', message: 'Origin non autorisee' });
  }

  // Unknown error
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne du serveur'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     ITStock License Server - v1.0.0                  ║
║     by Nextendo                                      ║
╚══════════════════════════════════════════════════════╝

  Server:  http://localhost:${PORT}
  Health:  http://localhost:${PORT}/health
  Env:     ${process.env.NODE_ENV || 'development'}

  API Endpoints:
    POST /api/v1/licenses/validate
    POST /api/v1/licenses/activate
    POST /api/v1/licenses/deactivate
    POST /api/v1/licenses/heartbeat
    POST /api/v1/auth/register
    POST /api/v1/auth/login
    POST /api/v1/webhooks/stripe
    GET  /api/v1/plans
  `);
});

module.exports = app;
