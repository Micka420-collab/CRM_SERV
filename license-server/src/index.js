require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const supabase = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS - allow all for API
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', async (req, res) => {
  // Test Supabase connection
  const { data, error } = await supabase.from('User').select('count').limit(1);
  
  res.json({
    status: error ? 'error' : 'ok',
    service: 'ITStock License Server (Supabase)',
    version: '1.0.0',
    database: error ? 'disconnected' : 'connected',
    timestamp: new Date().toISOString()
  });
});

// ========== LICENSE ROUTES ==========

// Validate license
app.post('/api/v1/licenses/validate', async (req, res) => {
  try {
    const { licenseKey, hardwareId } = req.body;
    
    if (!licenseKey || !hardwareId) {
      return res.status(400).json({ error: 'LICENSE_KEY_AND_HARDWARE_ID_REQUIRED' });
    }

    // Get license
    const { data: license, error: licenseError } = await supabase
      .from('License')
      .select('*, Plan:planId(*), User:userId(*)')
      .eq('licenseKey', licenseKey)
      .single();

    if (licenseError || !license) {
      return res.status(404).json({ error: 'LICENSE_NOT_FOUND' });
    }

    // Check status
    if (license.status === 'REVOKED') {
      return res.status(403).json({ error: 'LICENSE_REVOKED' });
    }

    if (license.status === 'EXPIRED' || (license.expiresAt && new Date(license.expiresAt) < new Date())) {
      return res.status(403).json({ error: 'LICENSE_EXPIRED' });
    }

    // Get activations
    const { data: activations, error: actError } = await supabase
      .from('Activation')
      .select('*')
      .eq('licenseId', license.id)
      .eq('isActive', true);

    const activeActivations = activations || [];
    const existingActivation = activeActivations.find(a => a.hardwareId === hardwareId);

    // Check hardware ID
    if (!existingActivation && activeActivations.length >= license.maxActivations) {
      return res.status(403).json({ 
        error: 'MAX_ACTIVATIONS_REACHED',
        maxActivations: license.maxActivations,
        currentActivations: activeActivations.length
      });
    }

    // Success response
    res.json({
      valid: true,
      license: {
        key: license.licenseKey,
        status: license.status,
        plan: license.Plan?.displayName || 'Unknown',
        maxActivations: license.maxActivations,
        currentActivations: activeActivations.length,
        expiresAt: license.expiresAt
      }
    });

  } catch (err) {
    console.error('Validate error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// Activate license
app.post('/api/v1/licenses/activate', async (req, res) => {
  try {
    const { licenseKey, hardwareId, machineName, ipAddress } = req.body;
    
    if (!licenseKey || !hardwareId) {
      return res.status(400).json({ error: 'LICENSE_KEY_AND_HARDWARE_ID_REQUIRED' });
    }

    // Get license
    const { data: license, error: licenseError } = await supabase
      .from('License')
      .select('*')
      .eq('licenseKey', licenseKey)
      .single();

    if (licenseError || !license) {
      return res.status(404).json({ error: 'LICENSE_NOT_FOUND' });
    }

    // Check existing activation
    const { data: existing } = await supabase
      .from('Activation')
      .select('*')
      .eq('licenseId', license.id)
      .eq('hardwareId', hardwareId)
      .eq('isActive', true)
      .single();

    if (existing) {
      // Update last check-in
      await supabase
        .from('Activation')
        .update({ lastCheckIn: new Date().toISOString() })
        .eq('id', existing.id);
      
      return res.json({ 
        success: true, 
        message: 'ALREADY_ACTIVATED',
        activatedAt: existing.activatedAt
      });
    }

    // Check max activations
    const { data: activeActs } = await supabase
      .from('Activation')
      .select('*')
      .eq('licenseId', license.id)
      .eq('isActive', true);

    if (activeActs && activeActs.length >= license.maxActivations) {
      return res.status(403).json({ error: 'MAX_ACTIVATIONS_REACHED' });
    }

    // Create activation
    const { data: activation, error } = await supabase
      .from('Activation')
      .insert({
        licenseId: license.id,
        hardwareId,
        machineName: machineName || 'Unknown',
        ipAddress: ipAddress || req.ip,
        lastCheckIn: new Date().toISOString(),
        activatedAt: new Date().toISOString(),
        isActive: true
      })
      .select()
      .single();

    if (error) {
      console.error('Activation error:', error);
      return res.status(500).json({ error: 'ACTIVATION_FAILED' });
    }

    res.json({ 
      success: true, 
      message: 'ACTIVATED',
      activatedAt: activation.activatedAt
    });

  } catch (err) {
    console.error('Activate error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// Deactivate license
app.post('/api/v1/licenses/deactivate', async (req, res) => {
  try {
    const { licenseKey, hardwareId } = req.body;
    
    // Get license
    const { data: license } = await supabase
      .from('License')
      .select('id')
      .eq('licenseKey', licenseKey)
      .single();

    if (!license) {
      return res.status(404).json({ error: 'LICENSE_NOT_FOUND' });
    }

    // Deactivate
    const { error } = await supabase
      .from('Activation')
      .update({ 
        isActive: false, 
        deactivatedAt: new Date().toISOString() 
      })
      .eq('licenseId', license.id)
      .eq('hardwareId', hardwareId);

    if (error) {
      return res.status(500).json({ error: 'DEACTIVATION_FAILED' });
    }

    res.json({ success: true, message: 'DEACTIVATED' });

  } catch (err) {
    console.error('Deactivate error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// Heartbeat
app.post('/api/v1/licenses/heartbeat', async (req, res) => {
  try {
    const { licenseKey, hardwareId } = req.body;
    
    const { data: license } = await supabase
      .from('License')
      .select('id')
      .eq('licenseKey', licenseKey)
      .single();

    if (!license) {
      return res.status(404).json({ error: 'LICENSE_NOT_FOUND' });
    }

    await supabase
      .from('Activation')
      .update({ lastCheckIn: new Date().toISOString() })
      .eq('licenseId', license.id)
      .eq('hardwareId', hardwareId);

    res.json({ success: true });

  } catch (err) {
    console.error('Heartbeat error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ========== AUTH ROUTES ==========

// Login
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data: user, error } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    // Compare password (bcrypt)
    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(password, user.passwordHash);
    
    if (!valid) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    // Generate JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// Register
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if exists
    const { data: existing } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'EMAIL_ALREADY_EXISTS' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabase
      .from('User')
      .insert({
        id: require('crypto').randomUUID(),
        email,
        passwordHash,
        name: name || email.split('@')[0],
        role: 'CUSTOMER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'REGISTRATION_FAILED' });
    }

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ========== PLANS ==========

app.get('/api/v1/plans', async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from('Plan')
      .select('*')
      .eq('isActive', true)
      .order('sortOrder', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'FETCH_FAILED' });
    }

    res.json({ plans: plans || [] });

  } catch (err) {
    console.error('Plans error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  ITStock License Server - Supabase Direct - v1.0.0   ║
╚══════════════════════════════════════════════════════╝

Server:  http://localhost:${PORT}
Health:  http://localhost:${PORT}/health

Endpoints:
  POST /api/v1/licenses/validate
  POST /api/v1/licenses/activate
  POST /api/v1/licenses/deactivate
  POST /api/v1/licenses/heartbeat
  POST /api/v1/auth/login
  POST /api/v1/auth/register
  GET  /api/v1/plans
`);
});
