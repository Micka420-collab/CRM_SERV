const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Trop de requetes, reessayez plus tard' }
});

/**
 * License validation rate limiter (more generous)
 */
const validationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Trop de validations, reessayez plus tard' }
});

/**
 * License activation rate limiter (strict)
 */
const activationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Trop de tentatives d\'activation, reessayez plus tard' }
});

/**
 * Auth rate limiter (login/register)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Trop de tentatives, reessayez dans 15 minutes' }
});

module.exports = {
  generalLimiter,
  validationLimiter,
  activationLimiter,
  authLimiter
};
