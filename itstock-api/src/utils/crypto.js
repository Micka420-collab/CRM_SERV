const crypto = require('crypto');

/**
 * Generate a cryptographically secure license key
 * Format: ITSTOCK-XXXX-XXXX-XXXX-XXXX
 */
function generateLicenseKey() {
  const segments = [];
  segments.push('ITSTOCK');
  for (let i = 0; i < 4; i++) {
    const segment = crypto.randomBytes(2).toString('hex').toUpperCase();
    segments.push(segment);
  }
  return segments.join('-');
}

/**
 * Verify HMAC signature from CRM client requests
 * The client signs: licenseKey + hardwareId + timestamp
 */
function verifyClientSignature(licenseKey, hardwareId, timestamp, signature) {
  const secret = process.env.CLIENT_SIGNING_SECRET;
  if (!secret) return true; // Skip if not configured

  const data = `${licenseKey}:${hardwareId}:${timestamp}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Generate a random token (for password reset, etc.)
 */
function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = {
  generateLicenseKey,
  verifyClientSignature,
  generateToken
};
