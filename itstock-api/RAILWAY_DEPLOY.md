# Déploiement sur Railway - Guide Rapide

## Étape 1 : Préparer le repo GitHub

```bash
# Dans le dossier itstock-api
cd itstock-api

# Initialiser git
git init

# Créer le repo sur GitHub (sans README, sans .gitignore)
# Puis:
git remote add origin https://github.com/VOTRE_USERNAME/itstock-api.git

git add .
git commit -m "Initial commit"
git push -u origin main
```

## Étape 2 : Créer le projet Railway

1. Allez sur https://railway.app
2. Cliquez sur **"New Project"**
3. Sélectionnez **"GitHub Repository"**
4. Choisissez votre repo `itstock-api`

Railway va automatiquement :
- Détecter le Dockerfile
- Builder l'image
- Déployer le service

## Étape 3 : Variables d'environnement

Dans Railway Dashboard > votre service > Variables, ajoutez :

```
NODE_ENV=production
PORT=3000

SUPABASE_URL=https://azwtzuqfyxfltqzrunmf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role
SUPABASE_ANON_KEY=votre_clé_anon

JWT_SECRET=générez_avec_npm_run_generate_secret

DEMO_MODE=false
```

### Générer le JWT_SECRET
```bash
npm run generate:secret
```

## Étape 4 : Domaine public

Par défaut, Railway donne une URL comme :
```
https://itstock-api-production.up.railway.app
```

Vous pouvez la voir dans :
Dashboard > votre service > Settings > Domain

## Étape 5 : Vérifier le déploiement

```bash
# Test health
curl https://VOTRE_URL.up.railway.app/health

# Test licence
curl -X POST https://VOTRE_URL.up.railway.app/api/v1/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"ITSTOCK-U5US-41U8-7DM3-P6CL-A88B","hardwareId":"test123"}'
```

## Problèmes courants

### "Build failed"
Vérifiez les logs dans Railway Dashboard > Deployments > Logs

### "Cannot connect to database"
- Vérifiez SUPABASE_SERVICE_ROLE_KEY
- Vérifiez que Supabase est en ligne

### "CORS error"
Le CORS est configuré pour autoriser toutes les origines si pas d'origin (CRM.exe).
Si besoin, modifiez `src/index.js` ligne 30-37.

## Mettre à jour

```bash
# Modifier le code
git add .
git commit -m "Update"
git push

# Railway redéploie automatiquement!
```

## Coût

- **Gratuit** : $5 crédits/mois (suffisant pour démarrer)
- Si dépassement : $5/mois (plan Starter)

Le serveur s'éteint après inactivité sur le plan gratuit.
