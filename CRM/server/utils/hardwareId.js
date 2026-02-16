/**
 * Génération d'un Hardware ID unique pour la machine
 * Utilisé pour lier la licence à un ordinateur spécifique
 */

const os = require('os');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HARDWARE_ID_FILE = path.join(__dirname, '..', '.hardware_id');

/**
 * Collecte les informations hardware de la machine
 * Ces infos sont utilisées pour générer un ID unique
 */
function collectHardwareInfo() {
  try {
    const cpus = os.cpus();
    const networkInterfaces = os.networkInterfaces();
    
    // Trouver l'adresse MAC de la première interface non-interne
    let macAddress = 'unknown';
    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      const activeInterface = interfaces.find(
        ni => ni && !ni.internal && ni.mac && ni.mac !== '00:00:00:00:00:00'
      );
      if (activeInterface) {
        macAddress = activeInterface.mac;
        break;
      }
    }

    // Informations collectées (robustes mais pas trop sensibles)
    const hardwareInfo = {
      cpuModel: cpus[0]?.model?.trim() || 'unknown',
      cpuSpeed: cpus[0]?.speed || 0,
      cpuCores: cpus.length,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      totalMemory: Math.floor(os.totalmem() / (1024 * 1024 * 1024)), // En GB
      macAddress: macAddress,
      // Ajouter le volume serial sur Windows si possible
      machineId: getWindowsMachineId()
    };

    return hardwareInfo;
  } catch (error) {
    console.error('[HardwareID] Error collecting hardware info:', error);
    // Fallback minimal
    return {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      fallback: crypto.randomBytes(16).toString('hex')
    };
  }
}

/**
 * Tente de récupérer le Machine GUID sur Windows
 * C'est un identifiant unique généré lors de l'installation de Windows
 */
function getWindowsMachineId() {
  if (process.platform !== 'win32') {
    return null;
  }

  try {
    const { execSync } = require('child_process');
    // Récupérer le MachineGuid depuis le registre Windows
    const result = execSync(
      'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
      { encoding: 'utf8', timeout: 5000 }
    );
    
    const match = result.match(/MachineGuid\s+REG_SZ\s+([a-f0-9-]+)/i);
    if (match) {
      return match[1].trim();
    }
  } catch (error) {
    // Silencieux - ce n'est pas critique
  }
  return null;
}

/**
 * Génère le Hardware ID à partir des infos collectées
 */
function generateHardwareId() {
  const hardwareInfo = collectHardwareInfo();
  
  // Créer une chaîne normalisée
  const infoString = Object.entries(hardwareInfo)
    .filter(([_, value]) => value !== null && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');

  // Générer un hash SHA-256
  const hash = crypto
    .createHash('sha256')
    .update(infoString)
    .digest('hex');

  // Formater en blocs de 4 caractères: XXXX-XXXX-XXXX-XXXX
  const formatted = hash
    .substring(0, 16)
    .toUpperCase()
    .match(/.{4}/g)
    .join('-');

  return formatted;
}

/**
 * Récupère ou génère le Hardware ID de cette machine
 * Le sauvegarde dans un fichier pour éviter les changements
 */
function getHardwareId() {
  try {
    // Si le fichier existe, lire l'ID sauvegardé
    if (fs.existsSync(HARDWARE_ID_FILE)) {
      const savedId = fs.readFileSync(HARDWARE_ID_FILE, 'utf8').trim();
      if (savedId && /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(savedId)) {
        return savedId;
      }
    }

    // Sinon, générer un nouvel ID et le sauvegarder
    const newId = generateHardwareId();
    
    try {
      fs.writeFileSync(HARDWARE_ID_FILE, newId, { mode: 0o600 }); // Permissions restrictives
    } catch (writeError) {
      console.warn('[HardwareID] Could not save to file:', writeError.message);
    }

    return newId;
  } catch (error) {
    console.error('[HardwareID] Error:', error);
    // Fallback: générer à la volée sans sauvegarde
    return generateHardwareId();
  }
}

/**
 * Vérifie si le Hardware ID actuel correspond à celui attendu
 */
function verifyHardwareId(expectedId) {
  if (!expectedId) return false;
  
  const currentId = getHardwareId();
  return currentId === expectedId.toUpperCase().trim();
}

/**
 * Change le Hardware ID (utile pour le support client - migration de machine)
 * Nécessite une preuve de licence valide
 */
function resetHardwareId() {
  try {
    if (fs.existsSync(HARDWARE_ID_FILE)) {
      fs.unlinkSync(HARDWARE_ID_FILE);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[HardwareID] Error resetting:', error);
    return false;
  }
}

module.exports = {
  getHardwareId,
  generateHardwareId,
  verifyHardwareId,
  resetHardwareId,
  collectHardwareInfo
};
