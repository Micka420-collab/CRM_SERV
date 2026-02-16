const express = require('express');
const { body } = require('express-validator');
const { authenticateJWT } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const { createCheckoutSession, createPortalSession } = require('../services/stripeService');
const { getUserLicenses, createLicense } = require('../services/licenseService');
const prisma = require('../config/database');

const router = express.Router();

/**
 * POST /api/v1/subscriptions/checkout
 * Create a Stripe Checkout Session
 */
router.post('/checkout',
  authenticateJWT,
  [
    body('planName').isIn(['basic', 'pro', 'enterprise']).withMessage('Plan invalide'),
    body('billingInterval').isIn(['monthly', 'yearly']).withMessage('Intervalle invalide')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { planName, billingInterval } = req.body;
      const result = await createCheckoutSession(req.user.id, planName, billingInterval);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/subscriptions/portal
 * Create a Stripe Customer Portal session (manage billing)
 */
router.post('/portal',
  authenticateJWT,
  async (req, res, next) => {
    try {
      const result = await createPortalSession(req.user.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/subscriptions/me
 * Get current user's subscriptions
 */
router.get('/me',
  authenticateJWT,
  async (req, res, next) => {
    try {
      const subscriptions = await prisma.subscription.findMany({
        where: { userId: req.user.id },
        include: { plan: true },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ subscriptions });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/subscriptions/licenses
 * Get current user's licenses with activation details
 */
router.get('/licenses',
  authenticateJWT,
  async (req, res, next) => {
    try {
      const licenses = await getUserLicenses(req.user.id);
      res.json({ licenses });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/subscriptions/trial
 * Create a 10-day trial license for the current user
 */
router.post('/trial',
  authenticateJWT,
  async (req, res, next) => {
    try {
      // Check if user already has a trial license
      const existingTrial = await prisma.license.findFirst({
        where: { 
          userId: req.user.id,
          plan: { name: 'trial' }
        }
      });

      if (existingTrial) {
        return res.status(409).json({
          error: 'TRIAL_ALREADY_EXISTS',
          message: 'Vous avez deja une licence d\'essai'
        });
      }

      // Find or create trial plan
      let trialPlan = await prisma.plan.findUnique({
        where: { name: 'trial' }
      });

      // If trial plan doesn't exist, use pro plan as base
      if (!trialPlan) {
        const proPlan = await prisma.plan.findUnique({
          where: { name: 'pro' }
        });
        if (!proPlan) {
          return res.status(500).json({
            error: 'PLAN_NOT_FOUND',
            message: 'Plan d\'essai non disponible'
          });
        }
        // Create trial plan based on pro
        trialPlan = await prisma.plan.create({
          data: {
            name: 'trial',
            displayName: 'Essai Gratuit',
            description: 'Licence d\'essai 10 jours',
            maxSeats: 1,
            priceMonthly: 0,
            priceYearly: 0,
            features: JSON.stringify([
              'Toutes les fonctionnalites Pro',
              '10 jours d\'essai',
              '1 poste'
            ])
          }
        });
      }

      // Create trial license (10 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 10);

      const license = await createLicense(req.user.id, trialPlan.id, expiresAt);

      res.status(201).json({
        success: true,
        license: {
          id: license.id,
          licenseKey: license.licenseKey,
          expiresAt: license.expiresAt,
          plan: trialPlan.displayName
        },
        message: 'Licence d\'essai de 10 jours creee avec succes'
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
