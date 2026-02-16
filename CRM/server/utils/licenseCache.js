/**
 * License Cache for Offline Grace Period
 *
 * Stores encrypted license validation results locally.
 * Allows the CRM to function offline for up to OFFLINE_GRACE_DAYS
 * after the last successful server validation.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const userDataPath = process.env.ELECTRON_USER_DATA_PATH;
let CACHE_FILE;

if (userDataPath) {
  CACHE_FILE = path.join(userDataPath, '.license-cache.dat');
} else {
  CACHE_FILE = path.join(__dirname, '..', '.license-cache.dat');
}

const CACHE_SECRET = process.env.LICENSE_CLIENT_SECRET || process.env.JWT_SECRET || 'itstock-cache-default-key';
const OFFLINE_GRACE_DAYS = parseInt(process.env.OFFLINE_GRACE_DAYS || '7');

/**
 * Encrypt data for local storage
 */
function encrypt(data) {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(CACHE_SECRET).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt data from local storage
 */
function decrypt(encryptedData) {
  const [ivHex, encrypted] = encryptedData.split(':');
  if (!ivHex || !encrypted) return null;
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.createHash('sha256').update(CACHE_SECRET).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

/**
 * Save license validation result to local cache
 */
function saveCache(licenseData) {
  try {
    const cacheData = {
      ...licenseData,
      validatedAt: new Date().toISOString(),
      cacheExpiresAt: new Date(Date.now() + OFFLINE_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString()
    };

    const encrypted = encrypt(cacheData);
    fs.writeFileSync(CACHE_FILE, encrypted, { mode: 0o600 });
    return true;
  } catch (err) {
    console.error('[LicenseCache] Error saving cache:', err.message);
    return false;
  }
}

/**
 * Load and validate the license cache
 * Returns cached data if within grace period, null otherwise
 */
function loadCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;

    const encrypted = fs.readFileSync(CACHE_FILE, 'utf8');
    const data = decrypt(encrypted);

    if (!data || !data.cacheExpiresAt) return null;

    // Check if cache has expired (grace period over)
    if (new Date() > new Date(data.cacheExpiresAt)) {
      console.log('[LicenseCache] Cache expired (grace period over)');
      return null;
    }

    return data;
  } catch (err) {
    console.error('[LicenseCache] Error loading cache:', err.message);
    return null;
  }
}

/**
 * Get cached license key
 */
function getCachedLicenseKey() {
  const cache = loadCache();
  return cache?.licenseKey || null;
}

/**
 * Clear the license cache
 */
function clearCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
    return true;
  } catch (err) {
    console.error('[LicenseCache] Error clearing cache:', err.message);
    return false;
  }
}

/**
 * Check if we have a valid cached license (for offline mode)
 */
function hasValidCache() {
  const cache = loadCache();
  return cache !== null && cache.valid === true;
}

module.exports = {
  saveCache,
  loadCache,
  getCachedLicenseKey,
  clearCache,
  hasValidCache
};
