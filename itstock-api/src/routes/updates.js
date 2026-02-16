const express = require('express');
const { body, query } = require('express-validator');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const updateService = require('../services/updateService');
const prisma = require('../config/database');

const router = express.Router();

// All routes require authentication
router.use(authenticateJWT);

// ==================== CLIENT ENDPOINTS (for .exe) ====================

/**
 * GET /api/v1/updates/check
 * Check for updates - called by CRM .exe on startup
 */
router.get('/check',
  [
    query('hardwareId').isString().notEmpty(),
    query('version').isString().notEmpty(),
    query('osVersion').optional().isString()
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { hardwareId, version, osVersion } = req.query;
      
      const result = await updateService.checkForUpdate(
        hardwareId,
        version,
        osVersion
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/updates/status
 * Update session status - called by CRM .exe during update
 */
router.post('/status',
  [
    body('sessionId').isString().notEmpty(),
    body('status').isIn(['DOWNLOADING', 'DOWNLOADED', 'INSTALLING', 'COMPLETED', 'FAILED']),
    body('downloadPercent').optional().isInt({ min: 0, max: 100 }),
    body('errorMessage').optional().isString(),
    body('fromVersion').optional().isString(),
    body('duration').optional().isInt()
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { sessionId, status, ...data } = req.body;
      
      const result = await updateService.updateSessionStatus(sessionId, status, data);
      
      res.json({ success: true, session: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/updates/register-device
 * Register a device - called by CRM .exe on first run
 */
router.post('/register-device',
  [
    body('hardwareId').isString().notEmpty(),
    body('machineName').optional().isString(),
    body('osVersion').optional().isString(),
    body('appVersion').isString().notEmpty()
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { hardwareId, machineName, osVersion, appVersion } = req.body;
      const userId = req.user.id;

      // Upsert device
      const device = await prisma.device.upsert({
        where: { hardwareId },
        update: {
          machineName,
          osVersion,
          appVersion,
          lastSeen: new Date(),
          userId // Update user if device was previously registered to another user
        },
        create: {
          userId,
          hardwareId,
          machineName,
          osVersion,
          appVersion
        }
      });

      res.json({ success: true, device });
    } catch (err) {
      next(err);
    }
  }
);

// ==================== ADMIN ENDPOINTS ====================

// All admin routes require admin role
router.use(requireAdmin);

/**
 * GET /api/v1/updates/versions
 * List all versions
 */
router.get('/versions', async (req, res, next) => {
  try {
    const { channel, active } = req.query;
    const versions = await updateService.listVersions({
      channel,
      activeOnly: active !== 'false'
    });
    res.json({ versions });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/updates/versions
 * Create a new version
 */
router.post('/versions',
  [
    body('version').isString().notEmpty(),
    body('downloadUrl').isURL(),
    body('size').isInt({ min: 1 }),
    body('checksum').isString().notEmpty(),
    body('releaseNotes').isString().notEmpty(),
    body('channel').optional().isIn(['stable', 'beta', 'alpha']),
    body('mandatory').optional().isBoolean(),
    body('rolloutPercent').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const version = await updateService.createVersion(req.body);
      res.status(201).json({ version });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/updates/versions/:id
 * Deactivate a version (rollback)
 */
router.delete('/versions/:id', async (req, res, next) => {
  try {
    await updateService.deactivateVersion(req.params.id);
    res.json({ success: true, message: 'Version désactivée' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/updates/devices
 * List all devices with update status
 */
router.get('/devices', async (req, res, next) => {
  try {
    const { status, version, userId } = req.query;
    const devices = await updateService.listDevicesWithUpdateStatus({
      status,
      version,
      userId
    });
    res.json({ devices });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/updates/force-all
 * Force update on all devices
 */
router.post('/force-all',
  [
    body('versionId').isString().notEmpty(),
    body('onlyOutdated').optional().isBoolean(),
    body('gradualRollout').optional().isBoolean(),
    body('rolloutPercent').optional().isInt({ min: 1, max: 100 }),
    body('scheduledTime').optional().isISO8601()
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { versionId, ...options } = req.body;
      
      const result = await updateService.forceUpdateForAllDevices(versionId, {
        ...options,
        scheduledTime: options.scheduledTime ? new Date(options.scheduledTime) : null
      });

      res.json({
        success: true,
        message: `Mise à jour forcée programmée pour ${result.targetedDevices} devices`,
        ...result
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/updates/force-device
 * Force update on a specific device
 */
router.post('/force-device',
  [
    body('hardwareId').isString().notEmpty(),
    body('versionId').isString().notEmpty()
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { hardwareId, versionId } = req.body;
      
      const device = await updateService.forceUpdateForDevice(hardwareId, versionId);

      res.json({
        success: true,
        message: 'Mise à jour forcée pour ce device',
        device
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/updates/stats/:versionId
 * Get update statistics for a version
 */
router.get('/stats/:versionId', async (req, res, next) => {
  try {
    const stats = await updateService.getUpdateStats(req.params.versionId);
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/updates/dashboard
 * Get dashboard data for update management
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      totalDevices,
      devicesNeedingUpdate,
      activeUpdates,
      failedUpdates,
      latestVersion,
      recentSessions
    ] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({
        where: { updateStatus: { in: ['UPDATE_AVAILABLE', 'UPDATE_PENDING', 'UPDATE_FAILED'] } }
      }),
      prisma.updateSession.count({
        where: { status: { in: ['DOWNLOADING', 'INSTALLING'] } }
      }),
      prisma.updateSession.count({
        where: { status: 'FAILED' }
      }),
      updateService.getLatestVersion('stable'),
      prisma.updateSession.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        include: {
          device: { select: { machineName: true, hardwareId: true } },
          version: { select: { version: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    res.json({
      summary: {
        totalDevices,
        devicesNeedingUpdate,
        activeUpdates,
        failedUpdates,
        upToDate: totalDevices - devicesNeedingUpdate
      },
      latestVersion,
      recentSessions
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
