# Guide de Déploiement Production ITStock

## 🎯 Objectif
Déployer l'ensemble de l'infrastructure sur des serveurs cloud pour que le CRM.exe puisse se connecter depuis n'importe où.

## 📋 Architecture Production

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client CRM    │────▶│  License Server  │────▶│    Supabase     │
│    (.exe)       │     │   Railway/Render │     │  PostgreSQL     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               │
                        ┌──────▼──────┐
                        │    Website  │
                        │   Vercel    │
                        └─────────────┘
```

## 1️⃣ Supabase (Base de données)

Déjà configuré ! Vérifiez juste :

```bash
# Dans Supabase Dashboard > Settings > API
SUPABASE_URL=https://azwtzuqfyxfltqzrunmf.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### Configuration Production
1. Allez sur https://app.supabase.com
2. Votre projet > Settings > Database
3. Notez la connexion "Connection string" (pour backup)
4. SQL Editor > Execute le script `supabase_setup.sql`

## 2️⃣ Deploy License Server (Railway - Recommandé)

Railway offre un déploiement simple avec PostgreSQL intégrée.

### Étape 1 : Créer compte Railway
```bash
# Aller sur https://railway.app
# Sign up avec GitHub
```

### Étape 2 : Créer le projet
```bash
# Dans Railway Dashboard:
# New Project > Deploy from GitHub repo
# Sélectionnez votre repo CRM/license-server
```

### Étape 3 : Variables d'environnement
Dans Railway > Variables :

```env
NODE_ENV=production
PORT=3000

# Supabase (Production)
SUPABASE_URL=https://azwtzuqfyxfltqzrunmf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
SUPABASE_ANON_KEY=votre_anon_key

# JWT
JWT_SECRET=votre_secret_jwt_complexe_32_caracteres

# Stripe (si paiement activé)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://itstock.vercel.app

# Demo mode OFF en production
DEMO_MODE=false
```

### Étape 4 : Configuration CORS
Vérifiez que `license-server/src/index.js` a les bons CORS :

```javascript
const cors = require('cors');
app.use(cors({
  origin: [
    'https://itstock.vercel.app',           // Votre site
    'https://itstock-website.vercel.app',   // Alternative
    'http://localhost:3001',                // Dev local
  ],
  credentials: true
}));
```

### Étape 5 : Déployer
```bash
# Railway déploie automatiquement sur push GitHub
# Ou : Railway CLI
npm install -g @railway/cli
railway login
railway link
railway up
```

### URL obtenue
```
https://itstock-api.up.railway.app
```

## 3️⃣ Alternative : Deploy sur Render

Si Railway ne convient pas :

### Étape 1 : render.com
```bash
# Create Account on https://render.com
# New Web Service
```

### Étape 2 : Configuration
- **Build Command**: `npm install && npx prisma generate`
- **Start Command**: `npm start`
- **Plan**: Free (s'éteint après inactivité) ou Starter ($7/mois)

### Étape 3 : Variables d'environnement
Même variables que Railway ci-dessus.

## 4️⃣ Deploy Website (Vercel)

### Étape 1 : Connecter GitHub
```bash
# Aller sur https://vercel.com
# Add New Project
# Import Git Repository (website/)
```

### Étape 2 : Configuration Build
- **Framework Preset**: Next.js
- **Root Directory**: `website`

### Étape 3 : Variables d'environnement
```env
NEXT_PUBLIC_LICENSE_SERVER_URL=https://itstock-api.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://azwtzuqfyxfltqzrunmf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Étape 4 : Deploy
Vercel déploie automatiquement sur chaque push.

## 5️⃣ Mettre à jour le CRM.exe

Maintenant que le serveur est en ligne, il faut mettre à jour l'URL dans le CRM :

### Fichier à modifier dans le CRM (Electron)
```javascript
// Dans votre code CRM.exe
// Remplacer :
const API_URL = 'http://localhost:4000';

// Par :
const API_URL = 'https://itstock-api.up.railway.app';
```

### Rebuild et redistribuer
```bash
# Rebuild le .exe avec la nouvelle URL
npm run build
npm run dist
```

## 6️⃣ URLs finales

| Service | URL locale | URL Production |
|---------|-----------|----------------|
| License Server | http://localhost:4000 | https://itstock-api.up.railway.app |
| Website | http://localhost:3001 | https://itstock.vercel.app |
| Database | file:./dev.db | https://azwtzuqfyxfltqzrunmf.supabase.co |

## 7️⃣ Vérification post-déploiement

### Test API
```bash
curl https://itstock-api.up.railway.app/api/v1/health
# Doit retourner : {"status":"ok","version":"1.0.0"}
```

### Test Activation
```bash
curl -X POST https://itstock-api.up.railway.app/api/v1/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"ITSTOCK-U5US-41U8-7DM3-P6CL-A88B","hardwareId":"test123"}'
```

### Test Website
```bash
# Aller sur https://itstock.vercel.app
# Vérifier que la page d'accueil charge
# Tester login avec demo@itstock.com / demo123
```

## 8️⃣ Configuration DNS (Optionnel)

Pour avoir vos propres noms de domaine :

### Domaine personnalisé API
```
api.itstock.fr → Railway
# Railway Dashboard > Settings > Domains
# Add Custom Domain
```

### Domaine personnalisé Website
```
itstock.fr → Vercel
# Vercel Dashboard > Domains
# Add Domain
```

## 🔒 Sécurité Production

### 1. HTTPS obligatoire
- Railway et Vercel fournissent HTTPS automatiquement
- Ne jamais utiliser HTTP en production

### 2. Secrets
```bash
# Générer un JWT_SECRET fort
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Rate Limiting
Ajouter dans `license-server/src/index.js` :
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```

### 4. CORS strict
```javascript
// En production, whitelist exact
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

## 💰 Coûts estimés (par mois)

| Service | Plan | Prix |
|---------|------|------|
| Railway | Starter | $5/mois |
| Vercel | Hobby (Free) | $0 |
| Supabase | Free Tier | $0 |
| **Total** | | **~$5/mois** |

Pour plus de charge :
- Railway Pro : $20/mois
- Supabase Pro : $25/mois

## 🚨 Troubleshooting

### "Cannot connect to server"
1. Vérifier que le serveur Railway est en ligne
2. Vérifier CORS dans le serveur
3. Vérifier que l'URL dans le CRM.exe est correcte

### "Database connection error"
1. Vérifier SUPABASE_SERVICE_ROLE_KEY
2. Vérifier IP allowlist dans Supabase

### "License not found"
1. Vérifier que les données sont bien dans Supabase
2. Vérifier DEMO_MODE=false en production

## 📞 Support

En cas de problème :
1. Vérifier les logs Railway : Dashboard > Deployments > Logs
2. Vérifier les logs Vercel : Dashboard > Project > Functions
3. Tester les endpoints avec curl/Postman
