#!/usr/bin/env node
/**
 * Script de Build pour créer un .exe de ITStock CRM
 * 
 * Ce script:
 * 1. Build le frontend React
 * 2. Copie les assets nécessaires
 * 3. Compile le serveur Node.js en .exe avec pkg
 * 4. Crée un installateur (optionnel)
 * 
 * Prérequis:
 *   npm install -g pkg
 * 
 * Usage:
 *   node build-exe.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function execute(command, cwd = process.cwd()) {
  log(`> ${command}`, 'cyan');
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      windowsHide: true
    });
    return true;
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, 'red');
    return false;
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    log(`  ✓ Copié: ${path.basename(src)}`, 'green');
  } else {
    log(`  ⚠ Manquant: ${src}`, 'yellow');
  }
}

async function build() {
  log(`
╔════════════════════════════════════════════════════════╗
║        BUILD ITSTOCK CRM - Création du .exe            ║
╚════════════════════════════════════════════════════════╝
`, 'bright');

  const rootDir = __dirname;
  const clientDir = path.join(rootDir, 'client');
  const serverDir = path.join(rootDir, 'server');
  const distDir = path.join(rootDir, 'dist');

  // Vérifier les prérequis
  log('\n📋 Vérification des prérequis...', 'yellow');
  
  try {
    execSync('pkg --version', { stdio: 'pipe' });
    log('  ✓ pkg est installé', 'green');
  } catch {
    log('  ✗ pkg n\'est pas installé. Installation...', 'yellow');
    if (!execute('npm install -g pkg')) {
      log('❌ Impossible d\'installer pkg. Installez-le manuellement: npm install -g pkg', 'red');
      process.exit(1);
    }
  }

  // Étape 1: Build du frontend
  log('\n🔨 Étape 1: Build du frontend React...', 'yellow');
  
  // Installer les dépendances du client si nécessaire
  if (!fs.existsSync(path.join(clientDir, 'node_modules'))) {
    log('  → Installation des dépendances du client...', 'cyan');
    if (!execute('npm install', clientDir)) {
      log('❌ Échec de l\'installation des dépendances client', 'red');
      process.exit(1);
    }
  }

  // Build React
  log('  → Build React...', 'cyan');
  if (!execute('npm run build', clientDir)) {
    log('❌ Échec du build React', 'red');
    process.exit(1);
  }
  log('  ✓ Frontend buildé avec succès', 'green');

  // Étape 2: Préparation du serveur
  log('\n🔨 Étape 2: Préparation du serveur...', 'yellow');
  
  // Installer les dépendances du serveur si nécessaire
  if (!fs.existsSync(path.join(serverDir, 'node_modules'))) {
    log('  → Installation des dépendances du serveur...', 'cyan');
    if (!execute('npm install', serverDir)) {
      log('❌ Échec de l\'installation des dépendances serveur', 'red');
      process.exit(1);
    }
  }

  // Copier le client buildé dans le serveur
  const serverClientDir = path.join(serverDir, 'client-dist');
  ensureDir(serverClientDir);
  
  if (fs.existsSync(path.join(clientDir, 'dist'))) {
    log('  → Copie du frontend buildé...', 'cyan');
    
    // Fonction récursive pour copier le dossier
    function copyDir(src, dest) {
      ensureDir(dest);
      const entries = fs.readdirSync(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
    
    copyDir(path.join(clientDir, 'dist'), serverClientDir);
    log('  ✓ Frontend copié', 'green');
  }

  // Étape 3: Création du fichier de configuration pkg
  log('\n🔨 Étape 3: Configuration du build...', 'yellow');
  
  const pkgConfig = {
    pkg: {
      assets: [
        "client-dist/**/*",
        ".env.example"
      ],
      targets: ["node18-win-x64"],
      outputPath: "dist",
      compress: "GZip"
    }
  };

  // Étape 4: Compilation avec pkg
  log('\n🔨 Étape 4: Compilation en .exe...', 'yellow');
  
  ensureDir(distDir);
  
  // Créer un fichier entry point pour pkg
  const entryPoint = path.join(serverDir, 'index.js');
  const pkgCommand = `pkg "${entryPoint}" --config "${path.join(serverDir, 'pkg.config.json')}" --output "${path.join(distDir, 'ITStock-CRM.exe')}"`;
  
  if (!execute(pkgCommand, serverDir)) {
    log('❌ Échec de la compilation', 'red');
    process.exit(1);
  }

  // Étape 5: Copier les fichiers supplémentaires
  log('\n🔨 Étape 5: Finalisation...', 'yellow');
  
  // Copier la base de données vide (template)
  const dbPath = path.join(serverDir, 'inventory.db');
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, path.join(distDir, 'inventory.db'));
    log('  ✓ Base de données copiée', 'green');
  }

  // Créer un fichier .env.example
  const envExample = `# ITStock CRM - Configuration
# Copiez ce fichier en .env et modifiez les valeurs

# Sécurité (OBLIGATOIRE - CHANGEZ CES VALEURS!)
JWT_SECRET=votre_cle_secrete_tres_longue_et_aleatoire_ici_min_32_chars
LICENSE_SECRET=votre_che_license_secrete_ici

# Configuration serveur
PORT=3000
NODE_ENV=production

# Rate limiting (en production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5

# CORS (origines autorisées)
CORS_ORIGINS=http://localhost:3000
`;
  fs.writeFileSync(path.join(distDir, '.env.example'), envExample);
  log('  ✓ Template .env créé', 'green');

  // Créer un fichier README pour l'installation
  const readmeContent = `# ITStock CRM - Installation

## 🚀 Démarrage rapide

1. **Extraire** tous les fichiers dans un dossier
2. **Renommer** \`.env.example\` en \`.env\`
3. **Modifier** \`.env\` avec vos clés secrètes
4. **Lancer** \`ITStock-CRM.exe\`
5. **Ouvrir** votre navigateur à http://localhost:3000

## 🔐 Configuration de la licence

Lors du premier démarrage, le logiciel vous demandera une clé de licence.

Pour générer une clé de licence:
\`\`\`
node utils/generateLicenseKey.js --plan pro --days 365
\`\`\`

## 📝 Notes

- La base de données est stockée localement dans \`inventory.db\`
- Gardez vos clés secrètes en sécurité
- Ne partagez pas votre fichier \`.env\`

## 🆘 Support

En cas de problème, contactez le support.
`;
  fs.writeFileSync(path.join(distDir, 'README.txt'), readmeContent);
  log('  ✓ README créé', 'green');

  // Résumé
  log(`
╔════════════════════════════════════════════════════════╗
║              BUILD TERMINÉ AVEC SUCCÈS!                ║
╚════════════════════════════════════════════════════════╝

📁 Fichiers générés dans: ${distDir}

📦 Contenu:
   • ITStock-CRM.exe    - L'application compilée
   • inventory.db       - Base de données SQLite
   • .env.example       - Template de configuration
   • README.txt         - Instructions d'installation

🚀 Pour tester:
   1. cd ${distDir}
   2. ./ITStock-CRM.exe
   3. Ouvrir http://localhost:3000

⚠️  IMPORTANT AVANT DISTRIBUTION:
   • Modifier les secrets dans .env
   • Générer une vraie clé de licence
   • Tester l'activation
   • Signer l'exécutable avec un certificat (optionnel)

📖 Prochaines étapes:
   • Créer un installateur avec Inno Setup
   • Configurer les mises à jour automatiques
   • Déployer le serveur de licence en ligne
`, 'bright');

}

build().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
