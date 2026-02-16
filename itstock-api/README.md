# ITStock API - License Server

Serveur de licence et gestion des mises à jour pour ITStock CRM.

## 🚀 Déploiement Rapide sur Railway

### 1. Créer un repo GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/votre-username/itstock-api.git
git push -u origin main
```

### 2. Deploy sur Railway
1. Allez sur https://railway.app
2. New Project → Deploy from GitHub repo
3. Sélectionnez `itstock-api`
4. Railway détectera automatiquement le Dockerfile

### 3. Variables d'environnement
Dans Railway Dashboard → Variables, ajoutez :

```env
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://azwtzuqfyxfltqzrunmf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
SUPABASE_ANON_KEY=votre_anon_key

# JWT (générez avec: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=votre_secret_jwt_64_caracteres

# Stripe (optionnel)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
FRONTEND_URL=https://votre-site.vercel.app

# Mode
DEMO_MODE=false
```

### 4. Déployer
Cliquez sur **Deploy** et attendez la fin du build.

URL obtenue : `https://itstock-api.up.railway.app`

## 🧪 Test de l'API

```bash
# Health check
curl https://itstock-api.up.railway.app/api/v1/health

# Test activation
curl -X POST https://itstock-api.up.railway.app/api/v1/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"ITSTOCK-U5US-41U8-7DM3-P6CL-A88B","hardwareId":"test123"}'
```

## 📁 Structure

```
itstock-api/
├── src/
│   ├── config/         # Database, Supabase
│   ├── routes/         # API endpoints
│   ├── services/       # Business logic
│   └── index.js        # Entry point
├── prisma/
│   └── schema.prisma   # Database schema
├── Dockerfile          # Container config
├── package.json
└── README.md
```

## 🔗 URLs importantes

| Endpoint | Description |
|----------|-------------|
| GET `/api/v1/health` | Vérification serveur |
| POST `/api/v1/licenses/validate` | Valider une licence |
| POST `/api/v1/licenses/activate` | Activer une licence |
| POST `/api/v1/licenses/deactivate` | Désactiver une licence |
| POST `/api/v1/licenses/heartbeat` | Heartbeat client |

## 📞 Support

En cas de problème, vérifiez les logs dans Railway Dashboard → Deployments → Logs.
