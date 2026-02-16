/**
 * Système de Licence Sécurisé pour ITStock CRM
 * 
 * Fonctionnalités:
 * - Génération de clés de licence signées
 * - Vérification de la validité des clés
 * - Liaison Hardware ID
 * - Vérification anti-tampering
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getHardwareId } = require('./hardwareId');

// Clé secrète pour HMAC - À CHANGER EN PRODUCTION!
// En production, cette clé devrait être:
// 1. Générée aléatoirement au premier démarrage
// 2. Stockée de manière sécurisée (pas en clair dans le code)
// 3. Ou récupérée depuis un serveur de licence
const LICENSE_SECRET = process.env.LICENSE_SECRET || require('crypto').randomBytes(32).toString('hex');

// Fichier de stockage de la licence locale
const LICENSE_FILE = path.join(__dirname, '..', '.license.dat');

/**
 * Génère une nouvelle clé de licence
 * 
 * @param {Object} options - Options de la licence
 * @param {string} options.prefix - Préfixe de la clé (ex: 'ITSTOCK')
 * @param {Date} options.expiresAt - Date d'expiration (null = perpétuel)
 * @param {string} options.hardwareId - Hardware ID lié (null = n'importe quelle machine)
 * @param {string} options.customerEmail - Email du client
 * @param {string} options.plan - Type de plan ('basic', 'pro', 'enterprise')
 * @returns {string} Clé de licence générée
 */
function generateLicenseKey(options = {}) {
  const {
    prefix = 'ITSTOCK',
    expiresAt = null,
    hardwareId = null,
    customerEmail = null,
    plan = 'basic'
  } = options;

  // Générer un ID unique aléatoire pour cette licence
  const licenseId = crypto.randomBytes(6).toString('hex').toUpperCase();
  
  // Date d'expiration au format YYMMDD (ou '000000' pour perpétuel)
  let expiryCode = '000000';
  if (expiresAt) {
    const date = new Date(expiresAt);
    expiryCode = date.getFullYear().toString().slice(-2) +
                 String(date.getMonth() + 1).padStart(2, '0') +
                 String(date.getDate()).padStart(2, '0');
  }

  // Hardware ID (4 premiers caractères ou '0000' pour libre)
  const hwCode = hardwareId ? hardwareId.replace(/-/g, '').substring(0, 4) : '0000';

  // Plan code (2 caractères)
  const planCodes = { basic: 'BS', pro: 'PR', enterprise: 'EN' };
  const planCode = planCodes[plan] || 'BS';

  // Construire la partie "content" de la clé
  const content = `${prefix}-${licenseId}-${expiryCode}-${hwCode}-${planCode}`;

  // Générer la signature HMAC
  const signature = crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(content)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();

  // Assembler la clé complète
  return `${content}-${signature}`;
}

/**
 * Parse et valide une clé de licence
 * 
 * @param {string} key - La clé de licence à valider
 * @returns {Object|null} Informations de la licence ou null si invalide
 */
function parseLicenseKey(key) {
  if (!key || typeof key !== 'string') return null;

  // Format attendu: PREFIX-XXXXXXXXXXXX-YYMMDD-HHHH-PP-XXXXXXXX
  const parts = key.split('-');
  if (parts.length !== 6) return null;

  const [prefix, licenseId, expiryCode, hwCode, planCode, signature] = parts;

  // Reconstituer le content
  const content = parts.slice(0, 5).join('-');

  // Vérifier la signature
  const expectedSignature = crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(content)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();

  if (signature !== expectedSignature) {
    return null; // Signature invalide
  }

  // Parser la date d'expiration
  let expiresAt = null;
  if (expiryCode !== '000000') {
    const year = 2000 + parseInt(expiryCode.substring(0, 2));
    const month = parseInt(expiryCode.substring(2, 4)) - 1;
    const day = parseInt(expiryCode.substring(4, 6));
    expiresAt = new Date(year, month, day, 23, 59, 59);
  }

  // Mapper le plan
  const planMap = { BS: 'basic', PR: 'pro', EN: 'enterprise' };

  return {
    valid: true,
    prefix,
    licenseId,
    expiresAt,
    hardwareIdPrefix: hwCode === '0000' ? null : hwCode,
    plan: planMap[planCode] || 'basic',
    raw: key
  };
}

/**
 * Vérifie si une licence est valide pour cette machine
 * 
 * @param {string} key - Clé de licence
 * @returns {Object} Résultat de la vérification
 */
function validateLicense(key) {
  const parsed = parseLicenseKey(key);
  
  if (!parsed) {
    return {
      valid: false,
      error: 'INVALID_KEY',
      message: 'Clé de licence invalide ou corrompue'
    };
  }

  // Vérifier l'expiration
  if (parsed.expiresAt && new Date() > parsed.expiresAt) {
    return {
      valid: false,
      error: 'EXPIRED',
      message: 'Licence expirée',
      expiresAt: parsed.expiresAt
    };
  }

  // Vérifier le Hardware ID si la licence est liée à une machine
  if (parsed.hardwareIdPrefix && parsed.hardwareIdPrefix !== '0000') {
    const currentHardwareId = getHardwareId();
    const currentPrefix = currentHardwareId.replace(/-/g, '').substring(0, 4);
    
    if (currentPrefix !== parsed.hardwareIdPrefix) {
      return {
        valid: false,
        error: 'HARDWARE_MISMATCH',
        message: 'Cette licence n\'est pas valide sur cette machine',
        currentHardware: currentHardwareId,
        expectedPrefix: parsed.hardwareIdPrefix
      };
    }
  }

  return {
    valid: true,
    plan: parsed.plan,
    expiresAt: parsed.expiresAt,
    isPerpetual: !parsed.expiresAt,
    isHardwareBound: !!parsed.hardwareIdPrefix
  };
}

/**
 * Sauvegarde la licence localement de manière sécurisée
 * 
 * @param {string} key - Clé de licence
 * @returns {boolean} Succès de l'opération
 */
function saveLicense(key) {
  try {
    // Chiffrer la clé avant sauvegarde
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(LICENSE_SECRET.padEnd(32).slice(0, 32)),
      iv
    );
    
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Sauvegarder IV + données chiffrées
    const data = iv.toString('hex') + ':' + encrypted;
    
    fs.writeFileSync(LICENSE_FILE, data, { mode: 0o600 });
    return true;
  } catch (error) {
    console.error('[License] Error saving license:', error);
    return false;
  }
}

/**
 * Charge la licence depuis le fichier local
 * 
 * @returns {string|null} Clé de licence ou null
 */
function loadLicense() {
  try {
    if (!fs.existsSync(LICENSE_FILE)) return null;

    const data = fs.readFileSync(LICENSE_FILE, 'utf8');
    const [ivHex, encrypted] = data.split(':');
    
    if (!ivHex || !encrypted) return null;

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(LICENSE_SECRET.padEnd(32).slice(0, 32)),
      iv
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[License] Error loading license:', error);
    return null;
  }
}

/**
 * Supprime la licence locale
 * 
 * @returns {boolean} Succès de l'opération
 */
function removeLicense() {
  try {
    if (fs.existsSync(LICENSE_FILE)) {
      fs.unlinkSync(LICENSE_FILE);
    }
    return true;
  } catch (error) {
    console.error('[License] Error removing license:', error);
    return false;
  }
}

/**
 * Vérifie et retourne le statut de la licence actuelle
 * 
 * @returns {Object} Statut complet de la licence
 */
function getLicenseStatus() {
  const key = loadLicense();
  
  if (!key) {
    return {
      status: 'UNLICENSED',
      valid: false,
      message: 'Aucune licence trouvée'
    };
  }

  const validation = validateLicense(key);
  
  if (validation.valid) {
    return {
      status: 'ACTIVE',
      valid: true,
      plan: validation.plan,
      expiresAt: validation.expiresAt,
      isPerpetual: validation.isPerpetual,
      daysUntilExpiry: validation.expiresAt 
        ? Math.ceil((validation.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
        : null
    };
  } else {
    return {
      status: validation.error,
      valid: false,
      message: validation.message,
      expiresAt: validation.expiresAt
    };
  }
}

/**
 * Active une nouvelle licence
 * 
 * @param {string} key - Clé de licence
 * @returns {Object} Résultat de l'activation
 */
function activateLicense(key) {
  // Valider la clé
  const validation = validateLicense(key);
  
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      message: validation.message
    };
  }

  // Sauvegarder la licence
  if (saveLicense(key)) {
    return {
      success: true,
      plan: validation.plan,
      expiresAt: validation.expiresAt,
      isPerpetual: validation.isPerpetual
    };
  } else {
    return {
      success: false,
      error: 'SAVE_ERROR',
      message: 'Erreur lors de la sauvegarde de la licence'
    };
  }
}

module.exports = {
  generateLicenseKey,
  parseLicenseKey,
  validateLicense,
  saveLicense,
  loadLicense,
  removeLicense,
  getLicenseStatus,
  activateLicense,
  getHardwareId: require('./hardwareId').getHardwareId
};
