const express = require('express');
const { body, query } = require('express-validator');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const { listLicenses, revokeLicense, renewLicense, createLicense } = require('../services/licenseService');
const prisma = require('../config/database');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticateJWT);
router.use(requireAdmin);

/**
 * GET /api/v1/admin/dashboard
 * Admin dashboard analytics
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalLicenses,
      activeLicenses,
      totalActivations,
      activeSubscriptions,
      recentActivations
    ] = await Promise.all([
      prisma.user.count(),
      prisma.license.count(),
      prisma.license.count({ where: { status: 'ACTIVE' } }),
      prisma.activation.count({ where: { isActive: true } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.activation.findMany({
        where: { isActive: true },
        orderBy: { activatedAt: 'desc' },
        take: 10,
        include: {
          license: {
            select: { licenseKey: true, plan: { select: { displayName: true } } }
          }
        }
      })
    ]);

    // Revenue by plan (active subscriptions)
    const subscriptionsByPlan = await prisma.subscription.groupBy({
      by: ['planId'],
      where: { status: 'ACTIVE' },
      _count: { id: true }
    });

    res.json({
      totalUsers,
      totalLicenses,
      activeLicenses,
      totalActivations,
      activeSubscriptions,
      recentActivations: recentActivations.map(a => ({
        id: a.id,
        hardwareId: a.hardwareId,
        machineName: a.machineName,
        activatedAt: a.activatedAt,
        licenseKey: a.license.licenseKey.substring(0, 15) + '...',
        plan: a.license.plan.displayName
      })),
      subscriptionsByPlan
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/licenses
 * List all licenses with filters
 */
router.get('/licenses',
  [
    query('status').optional().isIn(['ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED']),
    query('plan').optional().isIn(['basic', 'pro', 'enterprise']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { status, plan, page, limit } = req.query;
      const result = await listLicenses({
        status,
        planName: plan,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/licenses
 * Create a license manually (admin)
 */
router.post('/licenses',
  [
    body('userId').isString().notEmpty().withMessage('User ID requis'),
    body('planName').isIn(['basic', 'pro', 'enterprise']).withMessage('Plan invalide'),
    body('days').optional().isInt({ min: 0 }).withMessage('Nombre de jours invalide')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { userId, planName, days = 365 } = req.body;

      const plan = await prisma.plan.findUnique({ where: { name: planName } });
      if (!plan) return res.status(404).json({ error: 'Plan non trouve' });

      let expiresAt = null;
      if (days > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      }

      const license = await createLicense(userId, plan.id, expiresAt);
      res.status(201).json(license);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/licenses/:id/revoke
 * Revoke a license
 */
router.post('/licenses/:id/revoke', async (req, res, next) => {
  try {
    const license = await revokeLicense(req.params.id);
    res.json({ success: true, license });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/licenses/:id/renew
 * Renew a license
 */
router.post('/licenses/:id/renew',
  [body('days').isInt({ min: 1 }).withMessage('Nombre de jours requis')],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + req.body.days);

      const license = await renewLicense(req.params.id, newExpiresAt);
      res.json({ success: true, license });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/users
 * List all users
 */
router.get('/users',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString()
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit) : 20;
      const search = req.query.search;

      const where = search
        ? { OR: [{ email: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }] }
        : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            company: true,
            role: true,
            createdAt: true,
            _count: { select: { licenses: true, subscriptions: true } }
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/plans
 * List all plans
 */
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { licenses: true, subscriptions: true } }
      }
    });
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
