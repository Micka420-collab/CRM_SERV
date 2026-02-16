/**
 * Routes de Licence - Nouveau système sécurisé
 * 
 * Ce fichier remplace les anciennes routes de licence dans index.js
 * Utilise le système de licence avec Hardware ID
 */

const express = require('express');
const router = express.Router();
const { 
  activateLicense, 
  getLicenseStatus, 
  validateLicense,
  loadLicense,
  getHardwareId 
} = require('../utils/secureLicense');

/**
 * GET /api/license/status
 * Retourne le statut de la licence actuelle
 */
router.get('/status', (req, res) => {
  const status = getLicenseStatus();
  const hardwareId = getHardwareId();
  
  res.json({
    ...status,
    hardwareId: hardwareId, // Utile pour le support client
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/license/hardware-id
 * Retourne le Hardware ID de cette machine
 * (Utile pour pré-activer une licence)
 */
router.get('/hardware-id', (req, res) => {
  res.json({
    hardwareId: getHardwareId(),
    message: 'Utilisez cet ID pour générer une licence liée à cette machine'
  });
});

/**
 * POST /api/license/activate
 * Active une nouvelle licence sur cette machine
 * 
 * Body: { key }
 * Response: { success, plan, expiresAt, message }
 */
router.post('/activate', async (req, res) => {
  const { key } = req.body;
  
  if (!key || typeof key !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'MISSING_KEY',
      message: 'Clé de licence requise'
    });
  }

  // Nettoyer la clé
  const cleanKey = key.trim().toUpperCase();
  
  // Vérifier le format
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanKey)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_FORMAT',
      message: 'Format de clé invalide. Format attendu: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX'
    });
  }

  // Activer la licence
  const result = activateLicense(cleanKey);
  
  if (result.success) {
    // Logger l'activation
    console.log(`[License] Activated ${result.plan} plan. Expires: ${result.expiresAt || 'never'}`);
    
    res.json({
      success: true,
      plan: result.plan,
      expiresAt: result.expiresAt,
      isPerpetual: result.isPerpetual,
      message: 'Licence activée avec succès!'
    });
  } else {
    // Détail de l'erreur
    let statusCode = 400;
    if (result.error === 'HARDWARE_MISMATCH') statusCode = 403;
    if (result.error === 'EXPIRED') statusCode = 410;
    
    res.status(statusCode).json({
      success: false,
      error: result.error,
      message: result.message,
      hardwareId: result.currentHardware // Pour le support
    });
  }
});

/**
 * POST /api/license/validate
 * Valide une clé sans l'activer (pour vérification)
 * 
 * Body: { key }
 */
router.post('/validate', (req, res) => {
  const { key } = req.body;
  
  if (!key) {
    return res.status(400).json({ valid: false, error: 'MISSING_KEY' });
  }

  const result = validateLicense(key.trim().toUpperCase());
  res.json(result);
});

/**
 * DELETE /api/license (Admin)
 * Révoque la licence locale (pour tests ou support)
 */
router.delete('/', async (req, res) => {
  // En production, vérifier que l'utilisateur est admin
  // Pour l'instant, on demande une confirmation
  
  const { confirm, adminKey } = req.body;
  
  if (confirm !== 'REMOVE_LICENSE') {
    return res.status(400).json({
      success: false,
      message: 'Confirmation requise. Envoyer { confirm: "REMOVE_LICENSE" }'
    });
  }

  const { removeLicense } = require('../utils/secureLicense');
  const success = removeLicense();
  
  if (success) {
    res.json({ success: true, message: 'Licence locale supprimée' });
  } else {
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
  }
});

module.exports = router;
