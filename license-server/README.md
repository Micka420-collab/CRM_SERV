# ITStock API - Supabase Direct

Version du serveur API utilisant Supabase directement (sans Prisma).

## 🚀 Déploiement

```bash
# Initialiser git
git init
git add .
git commit -m "Initial commit"

# Connecter au repo (remplacez par votre URL)
git remote add origin https://github.com/Micka420-collab/CRM_SERV.git
git branch -M main
git push -u origin main --force
```

## ⚙️ Variables d'environnement (Railway)

```
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://azwtzuqfyxfltqzrunmf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_clé
JWT_SECRET=générez_un_secret_32_car
```

## 📡 Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | /health | Health check |
| POST | /api/v1/licenses/validate | Valider licence |
| POST | /api/v1/licenses/activate | Activer licence |
| POST | /api/v1/licenses/deactivate | Désactiver licence |
| POST | /api/v1/licenses/heartbeat | Heartbeat |
| POST | /api/v1/auth/login | Connexion |
| POST | /api/v1/auth/register | Inscription |
| GET | /api/v1/plans | Liste plans |

## 🎯 Test

```bash
curl https://votre-url.up.railway.app/health
curl -X POST https://votre-url.up.railway.app/api/v1/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"ITSTOCK-U5US-41U8-7DM3-P6CL-A88B","hardwareId":"test"}'
```
