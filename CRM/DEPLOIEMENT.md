# 🚀 Guide de Déploiement - ITStock CRM

Ce guide explique comment déployer ITStock CRM en tant qu'application commerciale avec système de licence.

---

## 📋 Vue d'ensemble de l'architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Utilisateur)                          │
│                                                                         │
│  ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │  ITStock-CRM.exe │───>│  Serveur local   │───>│  Base de données │   │
│  │  (Electron/pkg)  │    │  Node.js/Express │    │  SQLite chiffrée │   │
│  └─────────────────┘    └──────────────────┘    └──────────────────┘   │
│          │                      │                                            │
│          │ Activation           │                                           │
│          ▼                      ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                    SERVEUR DE LICENCE (Votre site)               │    │
│  │  • Génération de clés   • Validation   • Révocation              │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Phase 1: Préparation du Code

### 1.1 Sécuriser les secrets

```bash
cd CRM/server

# Créer un fichier .env sécurisé
cat > .env << 'EOF'
# Générer des clés aléatoires fortes:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

JWT_SECRET=votre_cle_jwt_64_chars_minimum_ici_changez_moi_vite
LICENSE_SECRET=votre_cle_license_64_chars_minimum_ici_changez_moi

NODE_ENV=production
PORT=3000

# Rate limiting strict
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5

# CORS - Votre domaine uniquement
CORS_ORIGINS=http://localhost:3000
EOF
```

### 1.2 Installer les dépendances

```bash
# Racine
cd CRM
npm install

# Client
cd client
npm install

# Serveur
cd ../server
npm install
```

---

## 🔨 Phase 2: Build de l'Application

### Option A: Build avec pkg (Recommandé - Plus léger)

```bash
cd CRM

# 1. Build React
npm run install-all
cd client
npm run build

# 2. Retourner à la racine et build l'exe
cd ..
node build-exe.js

# Ou manuellement avec pkg:
cd server
pkg . --targets node18-win-x64 --output ../dist/ITStock-CRM.exe
```

### Option B: Build avec Electron (Plus lourd mais plus natif)

```bash
# Créer un projet Electron
npm install -g create-electron-app
create-electron-app itstock-electron

# Configurer pour charger le serveur local + frontend
# (Voir template dans /templates/electron-main.js)
```

---

## 📦 Phase 3: Création de l'Installateur

### 3.1 Installer Inno Setup

1. Télécharger [Inno Setup](https://jrsoftware.org/isdl.php)
2. Installer la version Unicode

### 3.2 Créer le script d'installation

Créer `installer.iss`:

```pascal
[Setup]
AppName=ITStock CRM
AppVersion=1.0.0
DefaultDirName={autopf}\ITStock-CRM
DefaultGroupName=ITStock CRM
OutputDir=.
OutputBaseFilename=ITStock-CRM-Setup
Compression=lzma2
SolidCompression=yes
SetupIconFile=logo.ico

[Files]
Source: "dist\ITStock-CRM.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\.env.example"; DestDir: "{app}"; DestName: ".env"
Source: "dist\README.txt"; DestDir: "{app}"

[Icons]
Name: "{group}\ITStock CRM"; Filename: "{app}\ITStock-CRM.exe"
Name: "{autodesktop}\ITStock CRM"; Filename: "{app}\ITStock-CRM.exe"

[Run]
Filename: "{app}\ITStock-CRM.exe"; Description: "Lancer ITStock CRM"; Flags: postinstall skipifsilent
```

### 3.3 Compiler l'installateur

```bash
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
```

---

## 🌐 Phase 4: Serveur de Licence (Site Web)

### 4.1 Déployer l'API de licence

Hébergez `server/utils/licenseServer.js` sur votre serveur web:

```bash
# Sur votre serveur VPS/Cloud
mkdir /var/www/license-api
cd /var/www/license-api
npm init -y
npm install express crypto

# Copier licenseServer.js et secureLicense.js
cp /path/to/CRM/server/utils/licenseServer.js .
cp /path/to/CRM/server/utils/secureLicense.js .

# Démarrer avec PM2
npm install -g pm2
pm2 start licenseServer.js --name "license-api"
pm2 startup
pm2 save
```

### 4.2 Configurer Nginx (reverse proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name license.votresite.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🛒 Phase 5: Intégration E-Commerce

### 5.1 Exemple d'intégration avec WooCommerce (WordPress)

```php
// Après un achat réussi, générer une clé de licence
add_action('woocommerce_order_status_completed', 'generate_itstock_license');

function generate_itstock_license($order_id) {
    $order = wc_get_order($order_id);
    $items = $order->get_items();
    
    // Déterminer le plan selon le produit acheté
    $plan = 'basic'; // default
    foreach ($items as $item) {
        $product_id = $item->get_product_id();
        if ($product_id == 123) $plan = 'pro';
        if ($product_id == 124) $plan = 'enterprise';
    }
    
    // Appeler votre API de licence
    $response = wp_remote_post('https://license.votresite.com/api/license/create', [
        'headers' => [
            'X-API-Key' => 'votre_cle_api_secrete',
            'Content-Type' => 'application/json'
        ],
        'body' => json_encode([
            'plan' => $plan,
            'days' => 365,
            'email' => $order->get_billing_email()
        ])
    ]);
    
    $license_data = json_decode(wp_remote_retrieve_body($response), true);
    
    // Envoyer la clé par email
    $to = $order->get_billing_email();
    $subject = 'Votre clé de licence ITStock CRM';
    $message = "Merci pour votre achat!\n\n";
    $message .= "Votre clé de licence: " . $license_data['key'] . "\n";
    $message .= "Plan: " . $plan . "\n";
    $message .= "Valide jusqu'au: " . $license_data['expiresAt'] . "\n\n";
    $message .= "Téléchargez le logiciel: https://votresite.com/download\n";
    
    wp_mail($to, $subject, $message);
    
    // Sauvegarder dans les méta de la commande
    update_post_meta($order_id, '_itstock_license_key', $license_data['key']);
}
```

### 5.2 Page de téléchargement

```html
<!-- Page protégée, accessible après achat -->
<div class="download-page">
  <h1>Télécharger ITStock CRM</h1>
  
  <div class="license-info">
    <p>Votre clé de licence: <code><?php echo get_user_license_key(); ?></code></p>
    <button onclick="copyLicense()">Copier</button>
  </div>
  
  <a href="/download/ITStock-CRM-Setup.exe" class="download-btn">
    Télécharger pour Windows
  </a>
  
  <div class="instructions">
    <h3>Instructions d'installation:</h3>
    <ol>
      <li>Téléchargez et exécutez l'installateur</li>
      <li>Lancez ITStock CRM</li>
      <li>Entrez votre clé de licence lors du premier démarrage</li>
    </ol>
  </div>
</div>
```

---

## 🔒 Phase 6: Sécurisation Avancée

### 6.1 Obfuscation du code

```bash
# Installer javascript-obfuscator
npm install -g javascript-obfuscator

# Obfusquer avant le build pkg
javascript-obfuscator server/index.js --output server/index-obf.js \
  --compact true \
  --control-flow-flattening true \
  --dead-code-injection true \
  --debug-protection true \
  --disable-console-output true
```

### 6.2 Signature de l'exécutable (Windows)

Nécessite un certificat de signature de code (ex: Sectigo, DigiCert):

```bash
# Signer l'exécutable
signtool sign /f moncertificat.pfx /p motdepasse \
  /tr http://timestamp.sectigo.com \
  /td sha256 \
  /fd sha256 \
  dist/ITStock-CRM.exe
```

### 6.3 Protection anti-débogage

Ajouter dans le code serveur:

```javascript
// Détection de débogage
setInterval(() => {
  const start = Date.now();
  debugger;
  const end = Date.now();
  if (end - start > 100) {
    // Débogueur détecté, quitter
    process.exit(1);
  }
}, 1000);
```

---

## 📊 Phase 7: Monitoring et Analytics

### 7.1 Logger les activations

```javascript
// Dans licenseServer.js, ajouter:
const winston = require('winston');

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'activations.log' })
  ]
});

// Logger chaque activation
db.activateLicense = function(key, hardwareId) {
  logger.info('License activated', { key: key.substring(0, 10), hardwareId });
  // ... reste du code
};
```

### 7.2 Tableau de bord admin

Créer une page `/admin/licenses` sur votre site:

```javascript
// Liste des licences
fetch('/api/license/list', {
  headers: { 'X-API-Key': 'votre_cle' }
})
.then(r => r.json())
.then(data => {
  // Afficher dans un tableau avec options révoquer/transférer
});
```

---

## ✅ Checklist Finale

Avant de distribuer votre logiciel:

### Code
- [ ] Secrets changés (pas les valeurs par défaut)
- [ ] Rate limiting activé
- [ ] CORS configuré pour production
- [ ] Logs de sécurité en place
- [ ] Code obfusqué

### Build
- [ ] Testé sur Windows 10/11
- [ ] Testé sur une machine vierge (VM)
- [ ] Testé l'installation/désinstallation
- [ ] Taille de l'exe optimisée (< 100 Mo)

### Licence
- [ ] Système de licence testé
- [ ] Activation online testée
- [ ] Gestion des erreurs testée
- [ ] Processus de support défini

### Distribution
- [ ] Site web prêt
- [ ] Passerelle de paiement configurée
- [ ] Emails automatiques configurés
- [ ] Politique de remboursement définie

### Légal
- [ ] Conditions d'utilisation rédigées
- [ ] Politique de confidentialité
- [ ] Mention de licence dans l'installateur

---

## 🆘 Support et Maintenance

### Gestion des problèmes courants

| Problème | Solution |
|----------|----------|
| "Licence invalide" | Vérifier le Hardware ID, régénérer si nécessaire |
| "Hardware mismatch" | Client a changé de PC → Transfert de licence |
| "Clé volée/partagée" | Révoquer via l'admin, client doit racheter |
| "Perte de clé" | Retrouver via email de confirmation ou support |

### Processus de transfert de licence

1. Client contacte le support avec preuve d'achat
2. Vérifier l'ancienne activation dans les logs
3. Générer une nouvelle clé pour le nouveau Hardware ID
4. Révoquer l'ancienne clé
5. Envoyer la nouvelle clé au client

---

## 📈 Évolutions Futures

### Version 2.0
- [ ] Système de mises à jour automatiques
- [ ] Licences flottantes (multi-postes)
- [ ] Module cloud de synchronisation
- [ ] Application mobile companion

---

**Besoin d'aide?** Contactez le support technique.
