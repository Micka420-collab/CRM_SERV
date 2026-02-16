# 🔄 Migration vers le Nouveau Système de Licence

Ce guide explique comment migrer de l'ancien système de licence vers le nouveau système sécurisé avec Hardware ID.

---

## 📋 Différences entre les systèmes

| Fonctionnalité | Ancien Système | Nouveau Système |
|---------------|----------------|-----------------|
| Format clé | `CRM-YYYYMMDD-HASH` | `ITSTOCK-XXXX-YYMMDD-HHHH-PP-SIG` |
| Liaison machine | ❌ Non | ✅ Oui (Hardware ID) |
| Chiffrement local | ❌ Non | ✅ AES-256 |
| Plans (Basic/Pro/Ent) | ❌ Non | ✅ Oui |
| Durée | Fixe | Configurable ou perpétuel |
| Génération | Manuelle | Script automatisé |

---

## 🚀 Étapes de Migration

### 1. Sauvegarder les données existantes

```bash
cd CRM/server
cp inventory.db inventory.db.backup.pre-migration
```

### 2. Mettre à jour la base de données

La nouvelle table `licenses_v2` sera créée automatiquement. L'ancienne table reste en place pour référence.

### 3. Modifier le fichier `server/index.js`

**Remplacer** les anciennes routes de licence (lignes ~207-269 et ~2775-2829) par:

```javascript
// ==================== NOUVEAU SYSTÈME DE LICENCE ====================
const licenseRouter = require('./routes/license');
const { getLicenseStatus } = require('./utils/secureLicense');

// Middleware de vérification de licence
async function checkLicense(req, res, next) {
  // Toujours autoriser les endpoints de licence
  const path = req.path.toLowerCase();
  if (path.includes('/api/license')) {
    return next();
  }

  // Vérifier la licence
  const status = getLicenseStatus();
  
  if (status.status === 'UNLICENSED') {
    return res.status(402).json({
      error: "LICENSE_REQUIRED",
      code: "LICENSE_REQUIRED",
      message: "Une licence valide est requise pour utiliser ce logiciel.",
      activationUrl: '/api/license/activate'
    });
  }

  if (!status.valid) {
    return res.status(402).json({
      error: status.error || "LICENSE_INVALID",
      code: status.status,
      message: status.message || "Licence invalide ou expirée.",
      expiresAt: status.expiresAt
    });
  }

  // Licence valide, continuer
  next();
}

// Appliquer le middleware de licence
app.use(checkLicense);

// Routes de licence
app.use('/api/license', licenseRouter);
```

### 4. Supprimer l'ancien code

**Supprimer** ces sections de `index.js`:
- La constante `LICENSE_SECRET` (ligne ~208)
- La fonction `validateLicenseKey()` (lignes ~214-234)
- L'ancien middleware `checkLicense()` (lignes ~237-269)
- Les anciennes routes `/api/license/status` et `/api/license/activate` (lignes ~2775-2829)

### 5. Générer de nouvelles clés

Pour les licences existantes, vous devez générer de nouvelles clés au nouveau format:

```bash
cd CRM/server/utils

# Générer une clé Pro pour 1 an
node generateLicenseKey.js --plan pro --days 365 --email client@example.com

# Générer une clé Enterprise perpétuelle
node generateLicenseKey.js --plan enterprise --days 0

# Générer une clé liée à une machine spécifique
node generateLicenseKey.js --plan pro --days 365 --hardware ABCD-1234-EFGH-IJKL
```

### 6. Tester la migration

1. Démarrer le serveur
2. Vérifier que la page d'activation s'affiche
3. Activer avec une nouvelle clé
4. Vérifier que toutes les fonctionnalités marchent

---

## 🔧 Gestion des licences existantes

### Clients avec licence active

1. Récupérez leur Hardware ID:
   ```
   GET http://localhost:3000/api/license/hardware-id
   ```

2. Générez une nouvelle clé liée à leur machine:
   ```bash
   node generateLicenseKey.js --plan pro --days 365 --hardware <HARDWARE_ID>
   ```

3. Envoyez la nouvelle clé au client

### Clients avec licence expirée

1. Ils doivent acheter une nouvelle licence
2. Générez une clé avec la durée souhaitée

---

## 📊 Table de correspondance des plans

| Ancien | Nouveau | Prix suggéré |
|--------|---------|--------------|
| N/A | Basic | 99€/an |
| N/A | Pro | 299€/an |
| N/A | Enterprise | 999€/an |

**Notes:**
- Les anciennes licences sont considérées comme "Pro"
- Prix perpétuel = 3x le prix annuel

---

## ⚠️ Points d'attention

1. **Hardware ID change**: Si un client change de PC, il faut générer une nouvelle clé
2. **Support client**: Prévoyez un processus pour les transferts de licence
3. **Offline mode**: Le logiciel vérifie la licence localement, pas besoin de connexion internet

---

## 🆘 Rollback

Si vous devez revenir en arrière:

1. Restaurer la backup de la base de données
2. Remettre l'ancien code dans `index.js`
3. Redémarrer le serveur

```bash
cd CRM/server
cp inventory.db.backup.pre-migration inventory.db
```

---

## ✅ Checklist post-migration

- [ ] Ancien code de licence supprimé de `index.js`
- [ ] Nouveau middleware `checkLicense` en place
- [ ] Routes de licence importées
- [ ] Clés de licence générées pour tous les clients
- [ ] Tests effectués sur une machine de test
- [ ] Documentation support mise à jour
- [ ] Processus de transfert de licence défini
