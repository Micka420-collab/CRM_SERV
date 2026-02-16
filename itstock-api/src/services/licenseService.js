const prisma = require('../config/database');
const { generateLicenseKey } = require('../utils/crypto');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');

/**
 * Create a new license for a user after successful payment
 */
async function createLicense(userId, planId, expiresAt = null) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('Plan non trouve');

  const licenseKey = generateLicenseKey();

  const license = await prisma.license.create({
    data: {
      licenseKey,
      userId,
      planId,
      maxActivations: plan.maxSeats,
      expiresAt,
      status: 'ACTIVE'
    },
    include: { plan: true }
  });

  return license;
}

/**
 * Validate a license key + hardware ID combination
 * Called by the CRM .exe on startup and periodically
 */
async function validateLicense(licenseKey, hardwareId) {
  const license = await prisma.license.findUnique({
    where: { licenseKey },
    include: {
      plan: true,
      activations: { where: { isActive: true } }
    }
  });

  if (!license) {
    return { valid: false, error: 'LICENSE_NOT_FOUND', message: 'Licence non trouvee' };
  }

  if (license.status === 'REVOKED') {
    return { valid: false, error: 'LICENSE_REVOKED', message: 'Licence revoquee' };
  }

  if (license.status === 'SUSPENDED') {
    return { valid: false, error: 'LICENSE_SUSPENDED', message: 'Licence suspendue' };
  }

  if (license.status === 'EXPIRED' || (license.expiresAt && new Date() > license.expiresAt)) {
    // Update status if not already expired
    if (license.status !== 'EXPIRED') {
      await prisma.license.update({
        where: { id: license.id },
        data: { status: 'EXPIRED' }
      });
    }
    return { valid: false, error: 'LICENSE_EXPIRED', message: 'Licence expiree' };
  }

  // Check if this hardware ID has an active activation
  const activation = license.activations.find(a => a.hardwareId === hardwareId);

  if (!activation) {
    return {
      valid: false,
      error: 'NOT_ACTIVATED',
      message: 'Cette licence n\'est pas activee sur cette machine',
      seatsUsed: license.activations.length,
      seatsMax: license.maxActivations
    };
  }

  // Update last check-in
  await prisma.activation.update({
    where: { id: activation.id },
    data: { lastCheckIn: new Date() }
  });

  return {
    valid: true,
    plan: license.plan.name,
    planDisplayName: license.plan.displayName,
    features: license.plan.features,
    expiresAt: license.expiresAt,
    seatsUsed: license.activations.length,
    seatsMax: license.maxActivations,
    activatedAt: activation.activatedAt
  };
}

/**
 * Activate a license on a specific machine
 */
async function activateLicense(licenseKey, hardwareId, machineName, ipAddress) {
  const license = await prisma.license.findUnique({
    where: { licenseKey },
    include: {
      plan: true,
      activations: { where: { isActive: true } }
    }
  });

  if (!license) {
    return { success: false, error: 'LICENSE_NOT_FOUND', message: 'Licence non trouvee' };
  }

  if (license.status !== 'ACTIVE') {
    return { success: false, error: `LICENSE_${license.status}`, message: `Licence ${license.status.toLowerCase()}` };
  }

  if (license.expiresAt && new Date() > license.expiresAt) {
    await prisma.license.update({
      where: { id: license.id },
      data: { status: 'EXPIRED' }
    });
    return { success: false, error: 'LICENSE_EXPIRED', message: 'Licence expiree' };
  }

  // Check if already activated on this machine
  const existingActivation = license.activations.find(a => a.hardwareId === hardwareId);
  if (existingActivation) {
    // Update last check-in and return success
    await prisma.activation.update({
      where: { id: existingActivation.id },
      data: { lastCheckIn: new Date(), machineName, ipAddress }
    });

    return {
      success: true,
      plan: license.plan.name,
      planDisplayName: license.plan.displayName,
      features: license.plan.features,
      expiresAt: license.expiresAt,
      seatsUsed: license.activations.length,
      seatsMax: license.maxActivations,
      alreadyActivated: true
    };
  }

  // Check seat limit
  if (license.activations.length >= license.maxActivations) {
    return {
      success: false,
      error: 'SEAT_LIMIT_REACHED',
      message: `Limite de postes atteinte (${license.activations.length}/${license.maxActivations})`,
      seatsUsed: license.activations.length,
      seatsMax: license.maxActivations
    };
  }

  // Create new activation
  const activation = await prisma.activation.create({
    data: {
      licenseId: license.id,
      hardwareId,
      machineName,
      ipAddress
    }
  });

  return {
    success: true,
    plan: license.plan.name,
    planDisplayName: license.plan.displayName,
    features: license.plan.features,
    expiresAt: license.expiresAt,
    seatsUsed: license.activations.length + 1,
    seatsMax: license.maxActivations,
    activationId: activation.id
  };
}

/**
 * Deactivate a license on a specific machine (free a seat)
 */
async function deactivateLicense(licenseKey, hardwareId) {
  const license = await prisma.license.findUnique({
    where: { licenseKey },
    include: { activations: { where: { isActive: true } } }
  });

  if (!license) {
    return { success: false, error: 'LICENSE_NOT_FOUND' };
  }

  const activation = license.activations.find(a => a.hardwareId === hardwareId);
  if (!activation) {
    return { success: false, error: 'ACTIVATION_NOT_FOUND', message: 'Aucune activation trouvee pour cette machine' };
  }

  await prisma.activation.update({
    where: { id: activation.id },
    data: { isActive: false, deactivatedAt: new Date() }
  });

  const remainingActivations = license.activations.filter(a => a.id !== activation.id).length;

  return {
    success: true,
    remainingActivations,
    seatsMax: license.maxActivations
  };
}

/**
 * Heartbeat: periodic check-in from CRM client
 */
async function heartbeat(licenseKey, hardwareId) {
  const license = await prisma.license.findUnique({
    where: { licenseKey },
    include: {
      plan: true,
      activations: { where: { hardwareId, isActive: true } }
    }
  });

  if (!license || license.status !== 'ACTIVE') {
    return { valid: false, error: license ? `LICENSE_${license.status}` : 'LICENSE_NOT_FOUND' };
  }

  if (license.expiresAt && new Date() > license.expiresAt) {
    await prisma.license.update({
      where: { id: license.id },
      data: { status: 'EXPIRED' }
    });
    return { valid: false, error: 'LICENSE_EXPIRED' };
  }

  const activation = license.activations[0];
  if (!activation) {
    return { valid: false, error: 'NOT_ACTIVATED' };
  }

  await prisma.activation.update({
    where: { id: activation.id },
    data: { lastCheckIn: new Date() }
  });

  return {
    valid: true,
    plan: license.plan.name,
    expiresAt: license.expiresAt,
    nextCheckIn: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h from now
  };
}

/**
 * Get all licenses for a user (dashboard)
 */
async function getUserLicenses(userId) {
  return prisma.license.findMany({
    where: { userId },
    include: {
      plan: true,
      activations: {
        where: { isActive: true },
        select: {
          id: true,
          hardwareId: true,
          machineName: true,
          lastCheckIn: true,
          activatedAt: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Revoke a license (admin action)
 */
async function revokeLicense(licenseId) {
  const license = await prisma.license.update({
    where: { id: licenseId },
    data: { status: 'REVOKED' }
  });

  // Deactivate all activations
  await prisma.activation.updateMany({
    where: { licenseId, isActive: true },
    data: { isActive: false, deactivatedAt: new Date() }
  });

  return license;
}

/**
 * Renew a license (extend expiration)
 */
async function renewLicense(licenseId, newExpiresAt) {
  return prisma.license.update({
    where: { id: licenseId },
    data: {
      expiresAt: newExpiresAt,
      status: 'ACTIVE'
    }
  });
}

/**
 * Admin: list all licenses with filters
 */
async function listLicenses({ status, planName, page = 1, limit = 20 }) {
  const where = {};
  if (status) where.status = status;
  if (planName) where.plan = { name: planName };

  const [licenses, total] = await Promise.all([
    prisma.license.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
        plan: { select: { name: true, displayName: true } },
        activations: { where: { isActive: true }, select: { id: true, hardwareId: true, machineName: true } }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.license.count({ where })
  ]);

  return { licenses, total, page, totalPages: Math.ceil(total / limit) };
}

module.exports = {
  createLicense,
  validateLicense,
  activateLicense,
  deactivateLicense,
  heartbeat,
  getUserLicenses,
  revokeLicense,
  renewLicense,
  listLicenses
};
