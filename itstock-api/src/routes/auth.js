const express = require('express');
const bcrypt = require('bcrypt');
const { body } = require('express-validator');
const prisma = require('../config/database');
const { handleValidationErrors } = require('../middleware/validate');
const { authenticateJWT, generateJWT, supabase } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * POST /api/v1/auth/register
 * Register a new user with Supabase Auth
 */
router.post('/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 8 }).withMessage('Mot de passe: 8 caracteres minimum'),
    body('name').optional().isString().trim().isLength({ max: 100 })
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email, password, name } = req.body;

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: name || null,
          role: 'CUSTOMER'
        }
      });

      if (authError) {
        if (authError.message?.includes('already')) {
          return res.status(409).json({
            error: 'EMAIL_EXISTS',
            message: 'Un compte existe deja avec cet email'
          });
        }
        throw authError;
      }

      const supabaseUser = authData.user;

      // Create user in our database
      const user = await prisma.user.create({
        data: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          passwordHash: 'supabase_managed',
          name: name || null,
          role: 'CUSTOMER',
          emailVerified: true
        },
        select: { id: true, email: true, name: true, role: true, createdAt: true }
      });

      // Create session
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (sessionError) {
        throw sessionError;
      }

      res.status(201).json({
        user,
        token: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
        expiresAt: sessionData.session.expires_at,
        message: 'Compte cree avec succes'
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Login with Supabase Auth
 */
router.post('/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').isString().notEmpty().withMessage('Mot de passe requis')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Try Supabase Auth first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!authError && authData.user) {
        // Get or create user in our database
        let user = await prisma.user.findUnique({
          where: { id: authData.user.id },
          select: { id: true, email: true, name: true, role: true }
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              id: authData.user.id,
              email: authData.user.email,
              passwordHash: 'supabase_managed',
              name: authData.user.user_metadata?.name || null,
              role: authData.user.user_metadata?.role || 'CUSTOMER',
              emailVerified: true
            },
            select: { id: true, email: true, name: true, role: true }
          });
        }

        return res.json({
          user,
          token: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          expiresAt: authData.session.expires_at
        });
      }

      // Fallback to local auth (for users created before Supabase migration)
      const user = await prisma.user.findUnique({ where: { email } });
      
      if (!user || user.passwordHash === 'supabase_managed') {
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'Email ou mot de passe incorrect'
        });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'Email ou mot de passe incorrect'
        });
      }

      const token = generateJWT(user);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/forgot-password
 */
router.post('/forgot-password',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email invalide')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const resetUrl = `${process.env.WEBSITE_URL}/auth/reset-password`;

      // Send reset email via Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl
      });

      if (error) {
        console.error('[Forgot Password Error]', error);
      }

      // Always return success to avoid email enumeration
      res.json({ message: 'Si cet email existe, un lien de reinitialisation a ete envoye' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/reset-password
 */
router.post('/reset-password',
  authLimiter,
  [
    body('token').isString().notEmpty().withMessage('Token requis'),
    body('password').isLength({ min: 8 }).withMessage('Mot de passe: 8 caracteres minimum')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { token, password } = req.body;

      // Update password via Supabase
      const { error } = await supabase.auth.updateUser({
        password
      }, {
        accessToken: token
      });

      if (error) {
        return res.status(400).json({
          error: 'INVALID_TOKEN',
          message: 'Token invalide ou expire'
        });
      }

      res.json({ message: 'Mot de passe reinitialise avec succes' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post('/refresh',
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'REFRESH_TOKEN_REQUIRED' });
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error || !data.session) {
        return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN' });
      }

      res.json({
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
router.get('/me',
  authenticateJWT,
  async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
          role: true,
          createdAt: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'USER_NOT_FOUND' });
      }

      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/logout
 */
router.post('/logout',
  authenticateJWT,
  async (req, res, next) => {
    try {
      if (req.authProvider === 'supabase') {
        await supabase.auth.signOut();
      }
      res.json({ message: 'Deconnecte avec succes' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
