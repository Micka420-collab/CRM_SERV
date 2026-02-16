/**
 * Serveur de Licence API pour ITStock CRM
 * 
 * Ce module gère la validation et l'activation des licences
 * via une API REST. Il peut être utilisé pour:
 * - Valider une licence depuis le logiciel client
 * - Activer une nouvelle licence
 * - Vérifier le statut d'une licence
 * - Révoquer une licence
 * 
 * Ce fichier est destiné à être exécuté sur votre serveur web
 * (où vous vendez les licences), pas sur les machines clients.
 */

const express = require('express');
const crypto = require('crypto');
const { generateLicenseKey, parseLicenseKey } = require('./secureLicense');

// Simuler une base de données de licences (en production, utilisez une vraie DB)
class LicenseDatabase {
  constructor() {
    this.licenses = new Map();
    this.activations = new Map(); // key -> { hardwareId, activatedAt, lastCheck }
  }

  /**
   * Crée une nouvelle licence dans la base
   */
  createLicense(options) {
    const key = generateLicenseKey(options);
    const licenseData = {
      key,
      ...options,
      createdAt: new Date(),
      activated: false,
      revoked: false
    };
    
    this.licenses.set(key, licenseData);
    return licenseData;
  }

  /**
   * Récupère une licence par sa clé
   */
  getLicense(key) {
    return this.licenses.get(key);
  }

  /**
   * Active une licence pour un Hardware ID
   */
  activateLicense(key, hardwareId) {
    const license = this.licenses.get(key);
    if (!license) return { success: false, error: 'LICENSE_NOT_FOUND' };
    if (license.revoked) return { success: false, error: 'LICENSE_REVOKED' };
    
    // Vérifier si déjà activé sur une autre machine
    const existingActivation = this.activations.get(key);
    if (existingActivation && existingActivation.hardwareId !== hardwareId) {
      return { 
        success: false, 
        error: 'ALREADY_ACTIVATED',
        message: 'Cette licence est déjà activée sur une autre machine'
      };
    }

    // Enregistrer l'activation
    this.activations.set(key, {
      hardwareId,
      activatedAt: new Date(),
      lastCheck: new Date(),
      checkCount: 1
    });

    license.activated = true;
    return { success: true };
  }

  /**
   * Vérifie le statut d'une licence
   */
  checkLicense(key, hardwareId) {
    const license = this.licenses.get(key);
    if (!license) return { valid: false, error: 'LICENSE_NOT_FOUND' };
    if (license.revoked) return { valid: false, error: 'LICENSE_REVOKED' };

    const activation = this.activations.get(key);
    
    // Si pas encore activé, c'est OK (première activation)
    if (!activation) {
      return { valid: true, activated: false };
    }

    // Vérifier le Hardware ID
    if (activation.hardwareId !== hardwareId) {
      return { 
        valid: false, 
        error: 'HARDWARE_MISMATCH',
        message: 'Cette licence est liée à une autre machine'
      };
    }

    // Mettre à jour le dernier check
    activation.lastCheck = new Date();
    activation.checkCount++;

    // Vérifier l'expiration
    if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
      return { valid: false, error: 'EXPIRED' };
    }

    return {
      valid: true,
      activated: true,
      plan: license.plan,
      expiresAt: license.expiresAt,
      activatedAt: activation.activatedAt
    };
  }

  /**
   * Révoque une licence
   */
  revokeLicense(key) {
    const license = this.licenses.get(key);
    if (!license) return false;
    
    license.revoked = true;
    this.activations.delete(key);
    return true;
  }

  /**
   * Transfère une licence vers une nouvelle machine
   * (utile pour le support client)
   */
  transferLicense(key, newHardwareId) {
    const license = this.licenses.get(key);
    if (!license || license.revoked) return false;

    this.activations.set(key, {
      hardwareId: newHardwareId,
      activatedAt: new Date(),
      lastCheck: new Date(),
      checkCount: 1,
      transferred: true
    });

    return true;
  }
}

// Instance de la base de données
const db = new LicenseDatabase();

/**
 * Crée et configure le router Express pour l'API de licence
 * 
 * @param {Object} options - Options de configuration
 * @param {string} options.apiKey - Clé API pour protéger les endpoints admin
 * @returns {express.Router} Router Express configuré
 */
function createLicenseRouter(options = {}) {
  const router = express.Router();
  const { apiKey } = options;

  // Middleware de parsing JSON
  router.use(express.json());

  // Middleware d'authentification API Key pour les routes admin
  const requireApiKey = (req, res, next) => {
    if (!apiKey) return next(); // Pas de protection si pas de clé configurée
    
    const providedKey = req.headers['x-api-key'];
    if (providedKey !== apiKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };

  /**
   * POST /api/license/validate
   * Valide une licence depuis le client
   * 
   * Body: { key, hardwareId }
   * Response: { valid, plan, expiresAt, ... }
   */
  router.post('/validate', (req, res) => {
    const { key, hardwareId } = req.body;
    
    if (!key || !hardwareId) {
      return res.status(400).json({ 
        error: 'MISSING_PARAMS',
        message: 'Clé de licence et Hardware ID requis'
      });
    }

    const result = db.checkLicense(key, hardwareId);
    res.json(result);
  });

  /**
   * POST /api/license/activate
   * Active une nouvelle licence
   * 
   * Body: { key, hardwareId, customerEmail? }
   * Response: { success, plan, expiresAt, ... }
   */
  router.post('/activate', (req, res) => {
    const { key, hardwareId, customerEmail } = req.body;
    
    if (!key || !hardwareId) {
      return res.status(400).json({ 
        error: 'MISSING_PARAMS',
        message: 'Clé de licence et Hardware ID requis'
      });
    }

    // Vérifier que la clé est valide
    const parsed = parseLicenseKey(key);
    if (!parsed) {
      return res.status(400).json({ 
        error: 'INVALID_KEY',
        message: 'Format de clé invalide'
      });
    }

    // Activer la licence
    const result = db.activateLicense(key, hardwareId);
    
    if (result.success) {
      res.json({
        success: true,
        plan: parsed.plan,
        expiresAt: parsed.expiresAt,
        message: 'Licence activée avec succès'
      });
    } else {
      res.status(400).json(result);
    }
  });

  /**
   * POST /api/license/create (Admin)
   * Crée une nouvelle licence
   * 
   * Headers: X-API-Key
   * Body: { plan, days, hardwareId?, email? }
   * Response: { key, plan, expiresAt, ... }
   */
  router.post('/create', requireApiKey, (req, res) => {
    const { plan = 'basic', days = 365, hardwareId, email } = req.body;

    // Valider le plan
    if (!['basic', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Calculer l'expiration
    let expiresAt = null;
    if (days > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
    }

    // Créer la licence
    const license = db.createLicense({
      plan,
      expiresAt,
      hardwareId,
      customerEmail: email
    });

    res.json({
      key: license.key,
      plan: license.plan,
      expiresAt: license.expiresAt,
      createdAt: license.createdAt
    });
  });

  /**
   * POST /api/license/revoke (Admin)
   * Révoque une licence
   * 
   * Headers: X-API-Key
   * Body: { key }
   * Response: { success }
   */
  router.post('/revoke', requireApiKey, (req, res) => {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Key required' });
    }

    const success = db.revokeLicense(key);
    res.json({ success });
  });

  /**
   * POST /api/license/transfer (Admin)
   * Transfère une licence vers une nouvelle machine
   * 
   * Headers: X-API-Key
   * Body: { key, newHardwareId }
   * Response: { success }
   */
  router.post('/transfer', requireApiKey, (req, res) => {
    const { key, newHardwareId } = req.body;
    
    if (!key || !newHardwareId) {
      return res.status(400).json({ error: 'Key and newHardwareId required' });
    }

    const success = db.transferLicense(key, newHardwareId);
    res.json({ success });
  });

  /**
   * GET /api/license/list (Admin)
   * Liste toutes les licences
   * 
   * Headers: X-API-Key
   * Response: { licenses: [...] }
   */
  router.get('/list', requireApiKey, (req, res) => {
    const licenses = Array.from(db.licenses.values()).map(l => ({
      key: l.key.substring(0, 20) + '...',
      plan: l.plan,
      activated: l.activated,
      revoked: l.revoked,
      createdAt: l.createdAt,
      expiresAt: l.expiresAt
    }));
    
    res.json({ licenses });
  });

  return router;
}

module.exports = {
  createLicenseRouter,
  LicenseDatabase
};

// Si exécuté directement, démarrer un serveur de démo
if (require.main === module) {
  const app = express();
  const PORT = process.env.PORT || 4000;
  const API_KEY = process.env.LICENSE_API_KEY || crypto.randomBytes(32).toString('hex');

  app.use('/api/license', createLicenseRouter({ apiKey: API_KEY }));

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║     Serveur de Licence ITStock CRM - Mode Démo         ║
╚════════════════════════════════════════════════════════╝

📡 Serveur démarré sur http://localhost:${PORT}

🔐 API Key (pour les endpoints admin):
   ${API_KEY}

📚 Endpoints disponibles:
   POST /api/license/validate    - Valider une licence
   POST /api/license/activate    - Activer une licence
   POST /api/license/create      - Créer une licence (admin)
   POST /api/license/revoke      - Révoquer une licence (admin)
   POST /api/license/transfer    - Transférer une licence (admin)
   GET  /api/license/list        - Lister les licences (admin)

⚠️  Ce serveur est en mode démo avec une base de données en mémoire.
    En production, utilisez une vraie base de données (PostgreSQL, MySQL, etc.)
`);
  });
}
