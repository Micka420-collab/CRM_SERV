#!/usr/bin/env node
/**
 * Script de génération de clés de licence pour ITStock CRM
 * 
 * Usage:
 *   node generateLicenseKey.js [options]
 * 
 * Options:
 *   --plan <basic|pro|enterprise>  Type de plan (défaut: basic)
 *   --days <nombre>               Durée en jours (défaut: 365, 0 = perpétuel)
 *   --email <email>               Email du client
 *   --hardware <id>               Hardware ID pour lier la licence
 *   --output <file>               Fichier de sortie (optionnel)
 * 
 * Exemples:
 *   node generateLicenseKey.js --plan pro --days 365 --email client@example.com
 *   node generateLicenseKey.js --plan enterprise --days 0 --hardware ABCD-1234-5678
 */

const { generateLicenseKey, getHardwareId } = require('./secureLicense');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    plan: 'basic',
    days: 365,
    email: null,
    hardware: null,
    output: null
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--plan':
        options.plan = args[++i];
        break;
      case '--days':
        options.days = parseInt(args[++i]);
        break;
      case '--email':
        options.email = args[++i];
        break;
      case '--hardware':
        options.hardware = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════╗
║     Générateur de Clés de Licence - ITStock CRM        ║
╚════════════════════════════════════════════════════════╝

Usage: node generateLicenseKey.js [options]

Options:
  --plan <basic|pro|enterprise>  Type de plan (défaut: basic)
  --days <nombre>                Durée en jours (défaut: 365, 0 = perpétuel)
  --email <email>                Email du client
  --hardware <id>                Hardware ID pour lier la licence
  --output <file>                Fichier de sortie (optionnel)
  --help, -h                     Afficher cette aide

Exemples:
  # Licence Pro pour 1 an
  node generateLicenseKey.js --plan pro --days 365 --email client@example.com

  # Licence Enterprise perpétuelle
  node generateLicenseKey.js --plan enterprise --days 0

  # Licence liée à une machine spécifique
  node generateLicenseKey.js --plan pro --days 365 --hardware ABCD-1234-EFGH-IJKL
`);
}

function main() {
  const options = parseArgs();

  // Valider le plan
  if (!['basic', 'pro', 'enterprise'].includes(options.plan)) {
    console.error('❌ Erreur: Plan invalide. Utilisez: basic, pro, ou enterprise');
    process.exit(1);
  }

  // Calculer la date d'expiration
  let expiresAt = null;
  if (options.days > 0) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + options.days);
  }

  // Générer la clé
  const key = generateLicenseKey({
    prefix: 'ITSTOCK',
    expiresAt,
    hardwareId: options.hardware,
    customerEmail: options.email,
    plan: options.plan
  });

  // Préparer le résultat
  const result = {
    key,
    plan: options.plan,
    type: options.days === 0 ? 'Perpétuelle' : `Valide ${options.days} jours`,
    expiresAt: expiresAt ? expiresAt.toISOString().split('T')[0] : 'Jamais',
    hardwareBound: options.hardware ? 'Oui' : 'Non',
    email: options.email || 'Non spécifié',
    generatedAt: new Date().toISOString()
  };

  // Afficher
  console.log(`
╔════════════════════════════════════════════════════════╗
║         CLÉ DE LICENCE GÉNÉRÉE AVEC SUCCÈS             ║
╚════════════════════════════════════════════════════════╝

🔑 Clé de licence:
   ${key}

📋 Informations:
   • Plan:           ${result.plan.toUpperCase()}
   • Type:           ${result.type}
   • Expiration:     ${result.expiresAt}
   • Liée au HW:     ${result.hardwareBound}
   • Client:         ${result.email}

⚠️  IMPORTANT:
   • Gardez cette clé en lieu sûr
   • Une clé liée à un Hardware ID ne fonctionnera que sur cette machine
   • Les clés perpétuelles n'expirent jamais
`);

  // Sauvegarder dans un fichier si demandé
  if (options.output) {
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`💾 Sauvegardé dans: ${outputPath}\n`);
  }

  // Sauvegarder automatiquement dans un fichier de log
  const logDir = path.join(__dirname, '..', 'licenses');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, `license_${Date.now()}.json`);
  fs.writeFileSync(logFile, JSON.stringify(result, null, 2));
  console.log(`📝 Log sauvegardé dans: ${logFile}\n`);
}

main();
