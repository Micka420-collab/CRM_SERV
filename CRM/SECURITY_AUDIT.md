# 🔒 Rapport d'Audit de Sécurité - ITStock CRM

> **Date:** 13 Février 2026  
> **Projet:** ITStock - Système de Gestion d'Inventaire IT  
> **Type:** Application Client-Serveur avec Système de Licence

---

## 📊 Résumé Exécutif

| Critère | Évaluation | Priorité |
|---------|-----------|----------|
| Sécurité des données | ⚠️ MOYENNE | Haute |
| Protection des licences | ❌ FAIBLE | Critique |
| Authentification | ✅ BONNE | Moyenne |
| Transport des données | ⚠️ MOYENNE | Haute |
| Stockage local | ❌ FAIBLE | Critique |

---

## 🚨 Vulnérabilités Critiques Identifiées

### 1. **LICENSE_SECRET codé en dur** 🔴 CRITIQUE

**Localisation:**
- `server/index.js` ligne 208
- `server/generate_license.js` ligne 3

**Problème:**
```javascript
const LICENSE_SECRET = "CRM_PREMIUM_SALT_2024"; // Secret en dur dans le code
```

**Impact:**
- N'importe qui peut générer des clés de licence valides
- Aucune protection contre la contrefaçon
- Le secret est visible dans le code source compilé

**Solution:**
- Utiliser une clé privée RSA pour signer les licences
- Chiffrer le secret avec un algorithme robuste
- Implémenter une vérification hardware ID

---

### 2. **Pas de Hardware ID / Fingerprint** 🔴 CRITIQUE

**Problème:**
Le système de licence actuel ne vérifie pas sur quelle machine il s'exécute :
```javascript
// N'importe quelle clé valide fonctionne sur N'importe quelle machine
function validateLicenseKey(key) {
  // Vérifie seulement le format, pas la machine
}
```

**Impact:**
- Une clé achetée peut être partagée à l'infini
- Impossible de bloquer une clé compromise
- Aucun contrôle sur le nombre d'installations

**Solution:**
- Générer un Hardware ID unique par machine (CPU + BIOS + Disque)
- Lier la licence à ce Hardware ID
- Vérifier le Hardware ID à chaque démarrage

---

### 3. **Base de données SQLite non chiffrée** 🔴 CRITIQUE

**Problème:**
- Le fichier `inventory.db` est en clair
- N'importe qui peut l'ouvrir avec DB Browser for SQLite
- Les mots de passe hashés sont visibles (risque de brute force offline)

**Impact:**
- Fuite de données clients si le fichier est volé
- Accès à toutes les informations d'inventaire
- Possibilité de modifier les données directement

**Solution:**
- Utiliser `sqlcipher` pour chiffrer la base de données
- Clé de chiffrement dérivée du Hardware ID
- Backup chiffré automatique

---

### 4. **JWT_SECRET avec fallback dangereux** 🟡 HAUTE

**Localisation:** `server/index.js` ligne 14

**Problème:**
```javascript
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_dev_key_change_in_production';
```

**Impact:**
- Si `.env` est manquant, le secret par défaut est utilisé
- Attaque par token forgé possible

**Solution:**
- Refuser de démarrer sans JWT_SECRET
- Générer un secret aléatoire au premier démarrage si absent

---

### 5. **Rate Limiting désactivé** 🟡 HAUTE

**Localisation:** `server/index.js` ligne 66

**Problème:**
```javascript
const generalLimiter = rateLimit({
  // ...
  skip: () => true // SKIP ALL REQUESTS - rate limiting disabled
});
```

**Impact:**
- Attaque par force brute sur les mots de passe
- DoS (Denial of Service) possible

**Solution:**
- Activer le rate limiting en production
- Configurer des limites par IP et par utilisateur

---

### 6. **CORS permissif en développement** 🟡 MOYENNE

**Localisation:** `server/index.js` ligne 50

**Problème:**
```javascript
if (allowedOrigins.indexOf(origin) !== -1) {
  callback(null, true);
} else {
  console.warn(`CORS blocked origin: ${origin}`);
  callback(null, true); // In dev, allow anyway but log warning
}
```

**Impact:**
- CSRF (Cross-Site Request Forgery) possible
- Requêtes depuis n'importe quel site autorisées

**Solution:**
- Enforce CORS strict en production
- Utiliser une whitelist d'origines

---

### 7. **Pas de vérification d'intégrité du code** 🟡 MOYENNE

**Problème:**
- Le frontend React peut être modifié après compilation
- Pas de signature du code serveur

**Impact:**
- Injection de code possible
- Modification des vérifications de licence côté client

**Solution:**
- Signer le code compilé
- Vérifier l'intégrité au démarrage

---

## ✅ Bonnes Pratiques Déjà en Place

1. **Authentification JWT** avec expiration
2. **Hashage des mots de passe** avec bcrypt (10 rounds)
3. **Helmet** pour les headers HTTP
4. **Audit logs** pour les actions sensibles
5. **Système de permissions** granulaire
6. **Validation des entrées** avec express-validator

---

## 🛡️ Recommandations pour un Système de Licence Commercial

### Architecture Recommandée

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Votre Site    │ ──────> │  Serveur de      │ <────── │   Logiciel      │
│   Web (Shop)    │         │  Licence API     │         │   Client (.exe) │
│                 │         │  (en ligne)      │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                    │                             │
                                    ▼                             ▼
                            ┌──────────────────┐         ┌─────────────────┐
                            │   Base de        │         │   Vérification  │
                            │   données        │         │   locale (HMAC) │
                            │   des licences   │         │                 │
                            └──────────────────┘         └─────────────────┘
```

### Fonctionnement du Système de Licence

1. **Achat sur le site web:**
   - Le client achète une licence
   - Génération d'une clé unique liée à l'achat
   - Stockage dans la base de données du serveur de licence

2. **Première activation:**
   - Le client entre la clé dans le logiciel
   - Le logiciel génère un Hardware ID unique
   - Envoi à votre serveur: `clé + hardware_id`
   - Le serveur valide et enregistre le hardware_id
   - Retour d'un token signé valide pour cette machine

3. **Vérifications ultérieures:**
   - Vérification locale du token (HMAC)
   - Vérification périodique en ligne (optionnel)
   - Blocage si hardware_id différent

---

## 📋 Checklist de Sécurisation avant Mise en Production

### Phase 1: Sécurisation du Code
- [ ] Supprimer tous les secrets codés en dur
- [ ] Implémenter le Hardware ID
- [ ] Chiffrer la base de données SQLite
- [ ] Activer le rate limiting
- [ ] Durcir la configuration CORS

### Phase 2: Système de Licence
- [ ] Créer un serveur de licence en ligne
- [ ] Implémenter la génération de clés sécurisée
- [ ] Ajouter la vérification Hardware ID
- [ ] Créer un mécanisme de révocation de licence
- [ ] Ajouter une grace period pour offline

### Phase 3: Packaging
- [ ] Compiler en .exe avec pkg ou nexe
- [ ] Obfusquer le code JavaScript
- [ ] Signer l'exécutable Windows (certificat code signing)
- [ ] Créer un installateur (Inno Setup ou NSIS)
- [ ] Implémenter un système de mise à jour auto

### Phase 4: Déploiement
- [ ] Configurer HTTPS obligatoire
- [ ] Mettre en place des backups automatiques
- [ ] Configurer les logs de sécurité
- [ ] Tester les scénarios d'attaque
- [ ] Préparer une procédure de réponse aux incidents

---

## 🔧 Solutions Techniques Détaillées

### 1. Génération du Hardware ID

```javascript
const os = require('os');
const crypto = require('crypto');

function generateHardwareId() {
  const cpus = os.cpus();
  const networkInterfaces = os.networkInterfaces();
  
  // Collecter des infos hardware uniques
  const hardwareInfo = {
    cpu: cpus[0]?.model || 'unknown',
    cores: cpus.length,
    platform: os.platform(),
    hostname: os.hostname(),
    totalMemory: os.totalmem(),
    macAddress: Object.values(networkInterfaces)
      .flat()
      .find(ni => ni && !ni.internal)?.mac || 'unknown'
  };
  
  // Générer un hash unique
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(hardwareInfo))
    .digest('hex')
    .substring(0, 32)
    .toUpperCase();
}
```

### 2. Structure d'une Clé de Licence Sécurisée

Format recommandé:
```
XXXX-XXXX-XXXX-XXXX-YYYY-HHHH-SIG

Où:
- XXXX-XXXX-XXXX-XXXX : Clé unique aléatoire (achat)
- YYYY : Date d'expiration (optionnel)
- HHHH : Hash du Hardware ID (8 premiers caractères)
- SIG : Signature HMAC-SHA256 (16 caractères)
```

### 3. Chiffrement de la Base de Données

Utiliser SQLCipher:
```javascript
const sqlite3 = require('sqlcipher').verbose();

// La clé est dérivée du Hardware ID
const dbKey = deriveKeyFromHardwareId(hardwareId);

db.run(`PRAGMA key = '${dbKey}'`);
```

---

## 📚 Ressources Recommandées

1. **Protection des licences:**
   - [Keygen.sh](https://keygen.sh) - Service de gestion de licences
   - [Cryptolens](https://cryptolens.io) - Système de licence cloud

2. **Packaging:**
   - [pkg](https://github.com/vercel/pkg) - Compiler Node.js en exe
   - [nexe](https://github.com/nexe/nexe) - Alternative à pkg
   - [electron-builder](https://www.electron.build) - Pour Electron

3. **Sécurité:**
   - [OWASP Top 10](https://owasp.org/www-project-top-ten/)
   - [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

---

## 🎯 Prochaines Étapes

1. **Immédiat (Cette semaine):**
   - Implémenter le système de licence sécurisé (voir fichiers fournis)
   - Chiffrer la base de données

2. **Court terme (Ce mois):**
   - Créer le serveur de licence en ligne
   - Intégrer avec votre site web

3. **Moyen terme (2-3 mois):**
   - Obtenir un certificat de signature de code
   - Déployer la version commerciale

---

*Rapport généré automatiquement. Pour toute question, consultez la documentation technique complète.*
