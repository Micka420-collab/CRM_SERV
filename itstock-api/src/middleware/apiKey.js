const { UnauthorizedError } = require('../utils/errors');

/**
 * API Key authentication middleware
 * Used for CRM .exe -> server calls and admin API calls
 */
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!process.env.API_KEY) {
    // API key not configured, skip validation (dev mode)
    console.warn('[Security] API_KEY not configured, skipping API key validation');
    return next();
  }

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return next(new UnauthorizedError('Cle API invalide'));
  }

  next();
}

module.exports = { requireApiKey };
