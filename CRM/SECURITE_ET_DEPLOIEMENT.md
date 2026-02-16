# 🔐 Analyse de Sécurité & Guide de Déploiement - ITStock CRM

> **Résumé Exécutif:** Ce document présente l'analyse de sécurité de votre CRM et les solutions implémentées pour le transformer en logiciel commercial avec système de licence.

---

## 🎯 Objectifs

1. ✅ Analyser la sécurité du code existant
2. ✅ Implémenter un système de licence robuste avec Hardware ID
3. ✅ Créer les outils pour générer un .exe
4. ✅ Documenter le déploiement commercial

---

## 📊 Résumé des Vulnérabilités trouvées

### 🔴 Critiques (À corriger immédiatement)

| Vulnérabilité | Fichier | Risque | Statut |
|--------------|---------|--------|--------|
| LICENSE_SECRET en dur | `index.js:208`, `generate_license.js:3` | Génération de clés pirates | ✅ Corrigé |
| Pas de Hardware ID | Licence non liée à la machine | Partage illimité | ✅ Corrigé |
| Base SQLite non chiffrée | `inventory.db` | Fuite de données | ⚠️ À implémenter |

### 🟡 Importantes

| Vulnérabilité | Fichier | Risque | Statut |
|--------------|---------|--------|--------|
| JWT_SECRET fallback | `index.js:14` | Token forgé possible | ⚠️ À corriger |
| Rate limiting désactivé | `index.js:66` | Brute force / DoS | ⚠️ À activer |
| CORS permissif | `index.js:50` | CSRF possible | ⚠️ À durcir |

---

## 🆕 Nouveau Système de Licence Implémenté

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NOUVEAU SYSTÈME                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔑 Clé de licence format:                                  │
│     ITSTOCK-XXXX-YYMMDD-HHHH-PP-SIG                         │
│                                                             │
│     XXXX = ID unique aléatoire                              │
│     YYMMDD = Date expiration                                │
│     HHHH = 4 premiers caractères Hardware ID                │
│     PP = Plan (BS/PR/EN)                                    │
│     SIG = Signature HMAC-SHA256                             │
│                                                             │
│  💾 Stockage local:                                         │
│     • Clé chiffrée AES-256 dans `.license.dat`              │
│     • Hardware ID sauvegardé dans `.hardware_id`            │
│                                                             │
│  ✅ Vérifications:                                          │
│     • Signature HMAC valide?                                │
│     • Date d'expiration non dépassée?                       │
│     • Hardware ID correspond?                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Fichiers créés

```
CRM/
├── SECURITY_AUDIT.md              # Rapport d'audit complet
├── MIGRATION_LICENCE.md           # Guide de migration
├── DEPLOIEMENT.md                 # Guide de déploiement
├── build-exe.js                   # Script de build
├── server/
│   ├── utils/
│   │   ├── hardwareId.js          # Génération Hardware ID
│   │   ├── secureLicense.js       # Système de licence
│   │   ├── generateLicenseKey.js  # Générateur de clés
│   │   └── licenseServer.js       # Serveur de licence API
│   ├── routes/
│   │   └── license.js             # Routes API licence
│   └── pkg.config.json            # Config pour pkg
```

---

## 🚀 Comment créer un .exe

### Prérequis

```bash
# Installer pkg globalement
npm install -g pkg

# Sur Windows, installer les build tools si besoin
npm install -g windows-build-tools
```

### Étape 1: Build automatique (Recommandé)

```bash
cd CRM
node build-exe.js
```

Ce script va:
1. Installer les dépendances
2. Build le frontend React
3. Compiler le serveur en .exe
4. Créer les fichiers nécessaires

### Étape 2: Résultat

Le dossier `CRM/dist/` contient:
- `ITStock-CRM.exe` - L'application compilée (~50-80 Mo)
- `.env.example` - Template de configuration
- `README.txt` - Instructions
- `inventory.db` - Base de données (vide)

### Étape 3: Test

```bash
cd dist
./ITStock-CRM.exe

# Ouvrir dans le navigateur:
# http://localhost:3000
```

---

## 🎫 Générer des Clés de Licence

### Méthode 1: Script local

```bash
cd CRM/server/utils

# Licence Pro pour 1 an
node generateLicenseKey.js --plan pro --days 365 --email client@example.com

# Licence Enterprise perpétuelle
node generateLicenseKey.js --plan enterprise --days 0

# Licence liée à une machine spécifique
node generateLicenseKey.js --plan pro --days 365 --hardware ABCD-1234-EFGH-IJKL
```

### Méthode 2: Serveur de licence (production)

```bash
# Démarrer le serveur de licence
cd CRM/server/utils
node licenseServer.js

# Créer une licence via API
curl -X POST http://localhost:4000/api/license/create \
  -H "X-API-Key: votre_cle_api" \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro","days":365}'
```

---

## 🔧 Intégration dans votre Site Web

### Flow d'achat recommandé

```
1. Client achète sur votre site (WooCommerce/Shopify/Stripe)
         ↓
2. Webhook appelle votre serveur de licence
         ↓
3. Génération d'une clé unique
         ↓
4. Email au client avec:
    - Clé de licence
    - Lien de téléchargement
    - Instructions d'activation
         ↓
5. Client télécharge et installe
         ↓
6. Première activation:
    - Logiciel génère Hardware ID
    - Envoie à votre serveur (clé + hardware_id)
    - Serveur valide et enregistre l'association
         ↓
7. Vérifications ultérieures: locale (offline)
```

### Exemple de code pour votre site

```php
// WordPress/WooCommerce - Après achat
function on_license_purchase($order_id) {
    $order = wc_get_order($order_id);
    
    // Appeler votre API de licence
    $response = wp_remote_post('https://license.votresite.com/api/license/create', [
        'headers' => ['X-API-Key' => 'votre_cle_secrete'],
        'body' => json_encode([
            'plan' => 'pro',
            'days' => 365,
            'email' => $order->get_billing_email()
        ])
    ]);
    
    $license = json_decode($response['body'], true);
    
    // Envoyer par email
    wp_mail(
        $order->get_billing_email(),
        'Votre licence ITStock CRM',
        "Clé: {$license['key']}\nTéléchargement: https://votresite.com/download"
    );
}
```

---

## 📋 Migration depuis l'ancien système

Si vous avez déjà des clients avec l'ancien système de licence:

```bash
# 1. Sauvegarder
cp CRM/server/inventory.db CRM/server/inventory.db.backup

# 2. Récupérer le Hardware ID d'un client
curl http://localhost:3000/api/license/hardware-id
# Réponse: { "hardwareId": "ABCD-1234-EFGH-IJKL" }

# 3. Générer une nouvelle clé liée à cette machine
node generateLicenseKey.js --plan pro --days 365 --hardware ABCD-1234-EFGH-IJKL

# 4. Envoyer au client
```

---

## ⚠️ Points d'attention Importants

### Sécurité à renforcer avant production

1. **Changer les secrets** dans `.env`:
   ```bash
   # Générer des clés aléatoires
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Activer le rate limiting** dans `index.js`:
   ```javascript
   // Remplacer ligne 66:
   skip: () => false // Au lieu de true
   ```

3. **Durcir le CORS**:
   ```javascript
   // Ligne 50: Supprimer cette ligne qui permet tout
   callback(null, true); // SUPPRIMER
   ```

4. **Chiffrer la base de données SQLite** (optionnel mais recommandé)

### Support client

Prévoyez un processus pour:
- **Transfert de licence**: Client change de PC
- **Révocation**: Clé compromise
- **Renvoi de clé**: Client perd son email

---

## 📈 Prochaines Étapes

### Court terme (1-2 semaines)
- [ ] Tester le build sur plusieurs machines Windows
- [ ] Créer un installateur avec Inno Setup
- [ ] Mettre en place le serveur de licence en ligne
- [ ] Intégrer avec votre système de paiement

### Moyen terme (1-2 mois)
- [ ] Obtenir un certificat de signature de code
- [ ] Implémenter les mises à jour automatiques
- [ ] Créer un tableau de bord admin pour les licences
- [ ] Ajouter des analytics d'utilisation

### Long terme
- [ ] Version Mac/Linux
- [ ] Application mobile
- [ ] Synchronisation cloud
- [ ] Licences flottantes (multi-postes)

---

## 📚 Ressources

### Documentation
- `SECURITY_AUDIT.md` - Analyse complète de la sécurité
- `MIGRATION_LICENCE.md` - Guide de migration
- `DEPLOIEMENT.md` - Guide de déploiement détaillé

### Outils
- [pkg](https://github.com/vercel/pkg) - Compiler Node.js en exe
- [Inno Setup](https://jrsoftware.org/isinfo.php) - Créer des installateurs Windows
- [Sectigo](https://www.sectigo.com/) - Certificats de signature de code

---

## 🆘 Besoin d'aide?

### Problèmes courants

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| `pkg` ne fonctionne pas | Node.js pas à jour | Mettre à jour Node vers 18+ |
| Exe trop gros | Assets non optimisés | Vérifier `pkg.config.json` |
| Licence invalide | Hardware ID différent | Générer clé avec bon HW ID |
| Erreur CORS | Configuration | Ajouter `localhost:3000` |

### Support

Pour toute question technique:
1. Consulter les fichiers de documentation
2. Vérifier les logs dans `server/logs/`
3. Tester avec `NODE_ENV=development`

---

**Date de création:** 13 Février 2026  
**Version:** 1.0.0  
**Auteur:** Kimi Code Assistant

*Ce document fait partie du livrable de sécurisation et déploiement de ITStock CRM.*
