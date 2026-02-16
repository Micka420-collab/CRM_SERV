# Guide Mise à Jour CRM.exe

## Problème actuel
Le CRM.exe essaie de se connecter à `localhost:4000` mais le serveur n'est accessible que localement.

## Solution
Déployer le serveur sur Railway (cloud) + mettre à jour l'URL dans le CRM.exe

---

## 🚀 Option Rapide : Tester avec ngrok (immédiat)

Si vous voulez tester rapidement sans déployer :

```bash
# 1. Installer ngrok
# https://ngrok.com/download

# 2. Démarrer votre serveur local
cd license-server
npm start

# 3. Dans un autre terminal, exposer le port 4000
ngrok http 4000

# 4. ngrok donne une URL publique :
# https://abc123.ngrok.io

# 5. Dans le CRM.exe, changer l'URL API :
const API_URL = 'https://abc123.ngrok.io';

# 6. Rebuild et tester
```

⚠️ **ngrok est temporaire** - l'URL change à chaque redémarrage. Pour la production, utilisez Railway.

---

## 🌐 Déploiement Production (Recommandé)

### Étape 1 : Déployer sur Railway

1. **Créer compte** : https://railway.app (login avec GitHub)

2. **Nouveau projet** :
   - Dashboard > New Project
   - Deploy from GitHub repo
   - Sélectionnez votre repo

3. **Variables d'environnement** (dans Railway Dashboard) :
   ```env
   NODE_ENV=production
   PORT=3000
   
   # Supabase (déjà configuré)
   SUPABASE_URL=https://azwtzuqfyxfltqzrunmf.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=votre_clé
   SUPABASE_ANON_KEY=votre_clé
   
   # JWT (générez-en un)
   JWT_SECRET=votre_secret_32_caracteres_minimum
   
   # Pas de DEMO_MODE en production
   DEMO_MODE=false
   ```

4. **Deploy** : Railway déploie automatiquement

5. **Récupérer l'URL** :
   ```
   https://itstock-api.up.railway.app
   ```

### Étape 2 : Mettre à jour CRM.exe

Dans le code source du CRM.exe (Electron), trouvez :

```javascript
// ❌ Ancien (local)
const API_URL = 'http://localhost:4000';

// ✅ Nouveau (production)
const API_URL = 'https://itstock-api.up.railway.app';
```

**Fichiers à modifier** :
- `src/config/api.js` ou
- `src/services/license.js` ou
- Où que soit défini `API_URL`

### Étape 3 : Rebuild CRM.exe

```bash
# Dans le dossier CRM
npm run build
npm run dist

# Le nouvel .exe aura la bonne URL
```

### Étape 4 : Tester

```bash
# Test avec curl
curl https://itstock-api.up.railway.app/api/v1/health

# Doit retourner : {"status":"ok"}
```

---

## 🔧 URLs à configurer

| Service | URL de développement | URL Production |
|---------|---------------------|----------------|
| API Serveur | http://localhost:4000 | https://itstock-api.up.railway.app |
| Site Web | http://localhost:3001 | https://itstock.vercel.app |

---

## ✅ Checklist avant mise en production

- [ ] Serveur Railway déployé et en ligne
- [ ] Variables d'environnement configurées
- [ ] URL Railway mise dans CRM.exe
- [ ] CRM.exe rebuildé avec nouvelle URL
- [ ] Test d'activation avec une vraie clé
- [ ] HTTPS obligatoire (Railway fournit)

---

## 🆘 Si ça ne marche pas

### "Cannot connect to server"
1. Vérifier que Railway est en ligne (Dashboard > green dot)
2. Vérifier l'URL dans le CRM.exe
3. Tester avec curl depuis votre machine

### "CORS error"
1. Dans `license-server/src/index.js`, vérifier CORS :
```javascript
app.use(cors({
  origin: true, // Permet toutes les origines (temporaire pour test)
  credentials: true
}));
```

### "Database error"
1. Vérifier les clés Supabase dans Railway
2. Vérifier que Supabase est accessible

---

## 💡 Alternative : Fichier de configuration externe

Pour éviter de rebuild à chaque changement d'URL, créez un fichier `config.json` :

```json
{
  "apiUrl": "https://itstock-api.up.railway.app"
}
```

Le CRM.exe lit ce fichier au démarrage. Ainsi vous pouvez changer l'URL sans recompiler.

```javascript
// Dans CRM.exe
const fs = require('fs');
const path = require('path');

function getApiUrl() {
  try {
    const configPath = path.join(process.resourcesPath, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.apiUrl;
  } catch {
    return 'https://itstock-api.up.railway.app'; // Fallback
  }
}

const API_URL = getApiUrl();
```
