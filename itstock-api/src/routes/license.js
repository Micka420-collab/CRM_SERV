const express = require('express');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate');
const { requireApiKey } = require('../middleware/apiKey');
const { validationLimiter, activationLimiter } = require('../middleware/rateLimiter');
const licenseService = require('../services/licenseService');

const router = express.Router();

/**
 * POST /api/v1/licenses/validate
 * Validate a license key + hardware ID (called by CRM .exe)
 */
router.post('/validate',
  requireApiKey,
  validationLimiter,
  [
    body('licenseKey').isString().trim().notEmpty().withMessage('Cle de licence requise'),
    body('hardwareId').isString().trim().notEmpty().withMessage('Hardware ID requis')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { licenseKey, hardwareId } = req.body;
      const result = await licenseService.validateLicense(licenseKey, hardwareId);

      if (result.valid) {
        res.json(result);
      } else {
        const statusCode = result.error === 'LICENSE_NOT_FOUND' ? 404
          : result.error === 'NOT_ACTIVATED' ? 403
          : result.error === 'LICENSE_EXPIRED' ? 410
          : 400;
        res.status(statusCode).json(result);
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/licenses/activate
 * Activate a license on a specific machine (called by CRM .exe)
 */
router.post('/activate',
  requireApiKey,
  activationLimiter,
  [
    body('licenseKey').isString().trim().notEmpty().withMessage('Cle de licence requise'),
    body('hardwareId').isString().trim().notEmpty().withMessage('Hardware ID requis'),
    body('machineName').optional().isString().trim()
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { licenseKey, hardwareId, machineName } = req.body;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

      const result = await licenseService.activateLicense(licenseKey, hardwareId, machineName, ipAddress);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error === 'LICENSE_NOT_FOUND' ? 404
          : result.error === 'SEAT_LIMIT_REACHED' ? 409
          : result.error === 'LICENSE_EXPIRED' ? 410
          : 400;
        res.status(statusCode).json(result);
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/licenses/deactivate
 * Deactivate a license on a machine (free a seat)
 */
router.post('/deactivate',
  requireApiKey,
  [
    body('licenseKey').isString().trim().notEmpty().withMessage('Cle de licence requise'),
    body('hardwareId').isString().trim().notEmpty().withMessage('Hardware ID requis')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { licenseKey, hardwareId } = req.body;
      const result = await licenseService.deactivateLicense(licenseKey, hardwareId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error === 'LICENSE_NOT_FOUND' ? 404 : 400).json(result);
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/licenses/heartbeat
 * Periodic check-in from CRM client (every 24h)
 */
router.post('/heartbeat',
  requireApiKey,
  validationLimiter,
  [
    body('licenseKey').isString().trim().notEmpty(),
    body('hardwareId').isString().trim().notEmpty()
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { licenseKey, hardwareId } = req.body;
      const result = await licenseService.heartbeat(licenseKey, hardwareId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
