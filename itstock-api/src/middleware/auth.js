const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { UnauthorizedError } = require('../utils/errors');
const prisma = require('../config/database');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * JWT authentication middleware
 * Verifies the JWT token and sets req.user
 */
async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token manquant'));
  }

  const token = authHeader.split(' ')[1];

  try {
    // First, try to verify as a Supabase JWT
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    
    if (!error && supabaseUser) {
      // Get or create user in our database
      let dbUser = await prisma.user.findUnique({
        where: { id: supabaseUser.id },
        select: { id: true, email: true, name: true, role: true }
      });

      if (!dbUser) {
        // Sync user from Supabase to our database
        dbUser = await prisma.user.create({
          data: {
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.name || null,
            role: supabaseUser.user_metadata?.role || 'CUSTOMER',
            passwordHash: 'supabase_managed'
          },
          select: { id: true, email: true, name: true, role: true }
        });
      }

      req.user = dbUser;
      req.authProvider = 'supabase';
      return next();
    }

    // If Supabase auth fails, try our own JWT (for backwards compatibility)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true }
    });

    if (!dbUser) {
      return next(new UnauthorizedError('Utilisateur non trouve'));
    }

    req.user = dbUser;
    req.authProvider = 'jwt';
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expire'));
    }
    return next(new UnauthorizedError('Token invalide'));
  }
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new UnauthorizedError('Acces reserve aux administrateurs'));
  }
  next();
}

/**
 * Generate JWT token (for our own auth)
 */
function generateJWT(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { authenticateJWT, requireAdmin, generateJWT, supabase };
