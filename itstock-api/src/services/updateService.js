const prisma = require('../config/database');
const crypto = require('crypto');

/**
 * Service de gestion des mises à jour des clients CRM
 * Permet de forcer les mises à jour sur tous les devices
 */

/**
 * Créer une nouvelle version de l'application
 */
async function createVersion(data) {
  const version = await prisma.appVersion.create({
    data: {
      version: data.version,
      channel: data.channel || 'stable',
      releaseNotes: data.releaseNotes,
      downloadUrl: data.downloadUrl,
      size: data.size,
      checksum: data.checksum,
      mandatory: data.mandatory || false,
      minOsVersion: data.minOsVersion,
      rolloutPercent: data.rolloutPercent || 100,
      isActive: true
    }
  });

  // Si c'est une mise à jour obligatoire, notifier tous les devices actifs
  if (version.mandatory) {
    await forceUpdateForAllDevices(version.id);
  }

  return version;
}

/**
 * Récupérer la dernière version disponible pour un channel
 */
async function getLatestVersion(channel = 'stable', currentVersion = null) {
  const version = await prisma.appVersion.findFirst({
    where: {
      channel,
      isActive: true
    },
    orderBy: {
      releaseDate: 'desc'
    }
  });

  if (!version) return null;

  // Si une version actuelle est fournie, vérifier si update nécessaire
  if (currentVersion) {
    const needsUpdate = isNewerVersion(version.version, currentVersion);
    return {
      ...version,
      needsUpdate
    };
  }

  return version;
}

/**
 * Vérifier si une version est plus récente qu'une autre
 * Format: x.y.z (semver)
 */
function isNewerVersion(newVersion, currentVersion) {
  const parse = (v) => v.split('.').map(Number);
  const [nMajor, nMinor, nPatch] = parse(newVersion);
  const [cMajor, cMinor, cPatch] = parse(currentVersion);

  if (nMajor > cMajor) return true;
  if (nMajor === cMajor && nMinor > cMinor) return true;
  if (nMajor === cMajor && nMinor === cMinor && nPatch > cPatch) return true;
  return false;
}

/**
 * Forcer la mise à jour sur tous les devices
 */
async function forceUpdateForAllDevices(versionId, options = {}) {
  const { 
    onlyOutdated = false,      // Uniquement les devices pas à jour
    gradualRollout = false,    // Déploiement progressif
    rolloutPercent = 100,      // Pourcentage de devices à mettre à jour
    scheduledTime = null       // Date prévue de mise à jour
  } = options;

  const version = await prisma.appVersion.findUnique({
    where: { id: versionId }
  });

  if (!version) throw new Error('Version non trouvée');

  // Construire la requête
  const whereClause = {};
  
  if (onlyOutdated) {
    // Exclure les devices déjà à jour
    whereClause.appVersion = {
      not: version.version
    };
  }

  // Récupérer tous les devices concernés
  const devices = await prisma.device.findMany({
    where: whereClause,
    select: {
      id: true,
      hardwareId: true,
      machineName: true,
      appVersion: true
    }
  });

  // Si déploiement progressif, sélectionner un pourcentage aléatoire
  let devicesToUpdate = devices;
  if (gradualRollout && rolloutPercent < 100) {
    const count = Math.ceil(devices.length * (rolloutPercent / 100));
    devicesToUpdate = shuffleArray(devices).slice(0, count);
  }

  // Mettre à jour les devices
  const updates = await Promise.all(
    devicesToUpdate.map(device => 
      prisma.device.update({
        where: { id: device.id },
        data: {
          targetVersionId: versionId,
          forceUpdate: true,
          updateStatus: 'UPDATE_PENDING',
          updateScheduled: scheduledTime || new Date()
        }
      })
    )
  );

  // Créer les sessions de mise à jour
  await Promise.all(
    devicesToUpdate.map(device =>
      prisma.updateSession.create({
        data: {
          deviceId: device.id,
          versionId: versionId,
          status: 'PENDING'
        }
      })
    )
  );

  return {
    version: version.version,
    totalDevices: devices.length,
    targetedDevices: devicesToUpdate.length,
    scheduledFor: scheduledTime || 'immediate'
  };
}

/**
 * Forcer la mise à jour sur un device spécifique
 */
async function forceUpdateForDevice(hardwareId, versionId) {
  const device = await prisma.device.findUnique({
    where: { hardwareId }
  });

  if (!device) throw new Error('Device non trouvé');

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: {
      targetVersionId: versionId,
      forceUpdate: true,
      updateStatus: 'UPDATE_PENDING'
    }
  });

  // Créer une session de mise à jour
  await prisma.updateSession.create({
    data: {
      deviceId: device.id,
      versionId: versionId,
      status: 'PENDING'
    }
  });

  return updated;
}

/**
 * Vérifier si une mise à jour est disponible pour un device
 * Appelé par le client .exe au démarrage
 */
async function checkForUpdate(hardwareId, currentVersion, osVersion) {
  // Récupérer ou créer le device
  let device = await prisma.device.findUnique({
    where: { hardwareId },
    include: {
      targetVersion: true
    }
  });

  if (!device) {
    return {
      updateAvailable: false,
      message: 'Device not registered'
    };
  }

  // Mettre à jour la dernière connexion
  await prisma.device.update({
    where: { id: device.id },
    data: { 
      lastSeen: new Date(),
      appVersion: currentVersion 
    }
  });

  // Si une mise à jour forcée est programmée
  if (device.forceUpdate && device.targetVersion) {
    const now = new Date();
    const scheduledTime = device.updateScheduled;

    // Si la date programmée est atteinte ou dépassée
    if (!scheduledTime || scheduledTime <= now) {
      return {
        updateAvailable: true,
        mandatory: true,
        version: device.targetVersion.version,
        downloadUrl: device.targetVersion.downloadUrl,
        checksum: device.targetVersion.checksum,
        size: device.targetVersion.size,
        releaseNotes: device.targetVersion.releaseNotes,
        sessionId: await getOrCreateUpdateSession(device.id, device.targetVersion.id)
      };
    }
  }

  // Vérifier s'il y a une nouvelle version stable
  const latestVersion = await getLatestVersion('stable', currentVersion);
  
  if (latestVersion && latestVersion.needsUpdate) {
    return {
      updateAvailable: true,
      mandatory: latestVersion.mandatory,
      version: latestVersion.version,
      downloadUrl: latestVersion.downloadUrl,
      checksum: latestVersion.checksum,
      size: latestVersion.size,
      releaseNotes: latestVersion.releaseNotes,
      sessionId: await getOrCreateUpdateSession(device.id, latestVersion.id)
    };
  }

  return {
    updateAvailable: false,
    currentVersion: currentVersion
  };
}

/**
 * Récupérer ou créer une session de mise à jour
 */
async function getOrCreateUpdateSession(deviceId, versionId) {
  const existing = await prisma.updateSession.findFirst({
    where: {
      deviceId,
      versionId,
      status: { in: ['PENDING', 'DOWNLOADING'] }
    }
  });

  if (existing) return existing.id;

  const session = await prisma.updateSession.create({
    data: {
      deviceId,
      versionId,
      status: 'PENDING'
    }
  });

  return session.id;
}

/**
 * Mettre à jour le statut d'une session de mise à jour
 * Appelé par le client .exe pendant le processus de MAJ
 */
async function updateSessionStatus(sessionId, status, data = {}) {
  const updateData = {
    status,
    downloadPercent: data.downloadPercent,
    errorMessage: data.errorMessage
  };

  if (status === 'DOWNLOADING' && !data.startedAt) {
    updateData.startedAt = new Date();
  }

  if (['COMPLETED', 'FAILED'].includes(status)) {
    updateData.completedAt = new Date();
    
    // Mettre à jour le device si succès
    if (status === 'COMPLETED') {
      const session = await prisma.updateSession.findUnique({
        where: { id: sessionId },
        include: { version: true }
      });

      if (session) {
        await prisma.device.update({
          where: { id: session.deviceId },
          data: {
            appVersion: session.version.version,
            updateStatus: 'UP_TO_DATE',
            forceUpdate: false,
            targetVersionId: null
          }
        });

        // Logger la mise à jour
        await prisma.updateLog.create({
          data: {
            deviceId: session.deviceId,
            fromVersion: data.fromVersion,
            toVersion: session.version.version,
            status: 'success',
            duration: data.duration
          }
        });
      }
    }
  }

  return prisma.updateSession.update({
    where: { id: sessionId },
    data: updateData
  });
}

/**
 * Liste toutes les versions
 */
async function listVersions(options = {}) {
  const { channel, activeOnly = true } = options;
  
  return prisma.appVersion.findMany({
    where: {
      ...(channel && { channel }),
      ...(activeOnly && { isActive: true })
    },
    orderBy: { releaseDate: 'desc' },
    include: {
      _count: {
        select: { updateSessions: true }
      }
    }
  });
}

/**
 * Liste tous les devices avec leur statut de mise à jour
 */
async function listDevicesWithUpdateStatus(filters = {}) {
  const { status, version, userId } = filters;

  return prisma.device.findMany({
    where: {
      ...(status && { updateStatus: status }),
      ...(version && { appVersion: version }),
      ...(userId && { userId })
    },
    include: {
      user: {
        select: { email: true, name: true, company: true }
      },
      targetVersion: true,
      updateSessions: {
        where: {
          status: { in: ['PENDING', 'DOWNLOADING', 'INSTALLING'] }
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: { lastSeen: 'desc' }
  });
}

/**
 * Statistiques des mises à jour
 */
async function getUpdateStats(versionId) {
  const [totalDevices, pending, completed, failed, upToDate] = await Promise.all([
    prisma.device.count(),
    prisma.updateSession.count({ where: { versionId, status: 'PENDING' } }),
    prisma.updateSession.count({ where: { versionId, status: 'COMPLETED' } }),
    prisma.updateSession.count({ where: { versionId, status: 'FAILED' } }),
    prisma.device.count({ where: { updateStatus: 'UP_TO_DATE' } })
  ]);

  return {
    totalDevices,
    pending,
    completed,
    failed,
    upToDate,
    successRate: completed > 0 ? Math.round((completed / (completed + failed)) * 100) : 0
  };
}

/**
 * Désactiver une version (rollback)
 */
async function deactivateVersion(versionId) {
  // Désactiver la version
  await prisma.appVersion.update({
    where: { id: versionId },
    data: { isActive: false }
  });

  // Annuler toutes les mises à jour en cours vers cette version
  await prisma.device.updateMany({
    where: { targetVersionId: versionId },
    data: {
      targetVersionId: null,
      forceUpdate: false,
      updateStatus: 'UP_TO_DATE'
    }
  });

  // Annuler les sessions en cours
  await prisma.updateSession.updateMany({
    where: { 
      versionId,
      status: { in: ['PENDING', 'DOWNLOADING'] }
    },
    data: { status: 'CANCELLED' }
  });
}

// Helper: Mélanger un tableau (pour déploiement aléatoire)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

module.exports = {
  createVersion,
  getLatestVersion,
  forceUpdateForAllDevices,
  forceUpdateForDevice,
  checkForUpdate,
  updateSessionStatus,
  listVersions,
  listDevicesWithUpdateStatus,
  getUpdateStats,
  deactivateVersion,
  isNewerVersion
};
