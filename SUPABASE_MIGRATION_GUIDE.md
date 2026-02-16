# Guide de Migration vers Supabase

Ce guide explique comment migrer ITStock License Server vers Supabase.

## ✅ Migration Complétée

### 1. Configuration Supabase

**Fichier:** `license-server/src/config/supabase.js`

Le client Supabase est configuré avec:
- `SUPABASE_URL` - URL du projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Clé service pour les opérations serveur

### 2. Base de Données (Prisma + Supabase PostgreSQL)

**Fichier:** `license-server/prisma/schema.prisma`

Le schéma Prisma est configuré pour utiliser PostgreSQL:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Modèles migrés:**
- `User` - Utilisateurs
- `Plan` - Plans d'abonnement
- `License` - Licences
- `Activation` - Activations de licences
- `Subscription` - Abonnements Stripe

### 3. Authentification

**Fichiers modifiés:**
- `license-server/src/middleware/auth.js`
- `license-server/src/routes/auth.js`

**Fonctionnalités:**
- ✅ Login avec Supabase Auth
- ✅ Register avec Supabase Auth
- ✅ JWT local (compatibilité arrière)
- ✅ Fallback vers auth locale pour utilisateurs existants

**Flux d'authentification:**
1. Le client envoie email/password
2. Le serveur tente d'abord Supabase Auth
3. Si échec, fallback vers auth locale (bcrypt)
4. Retourne token Supabase ou JWT local

### 4. Service de Licence

**Fichier:** `license-server/src/services/licenseService.js`

Aucune modification nécessaire - utilise Prisma qui fonctionne avec Supabase PostgreSQL.

**Fonctions disponibles:**
- `createLicense()` - Créer une licence
- `validateLicense()` - Valider une licence
- `activateLicense()` - Activer sur une machine
- `deactivateLicense()` - Désactiver une machine
- `heartbeat()` - Vérification périodique
- `getUserLicenses()` - Récupérer les licences d'un utilisateur

### 5. Service Stripe

**Fichiers:**
- `license-server/src/config/stripe.js`
- `license-server/src/services/stripeService.js`
- `license-server/src/routes/webhook.js`

Aucune modification nécessaire - utilise Prisma pour la base de données.

## 🔧 Configuration Requise

### 1. Variables d'Environnement

Créez un fichier `license-server/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
SUPABASE_ANON_KEY=votre_anon_key

# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.votre-projet.supabase.co:5432/postgres?sslmode=require"

# Server
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET=votre-secret-jwt-tres-securise
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:3001/dashboard?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:3001/pricing

# API Key (pour le client CRM)
API_KEY=votre-api-key

# Client signing secret (pour HMAC)
CLIENT_SIGNING_SECRET=votre-signing-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_app_password
EMAIL_FROM=ITStock <noreply@votre-domaine.com>

# Website URL
WEBSITE_URL=http://localhost:3001

# Offline grace period
OFFLINE_GRACE_DAYS=7
```

### 2. Configuration Supabase

1. Créez un projet sur [Supabase](https://supabase.com)
2. Allez dans **Project Settings > API**
3. Copiez:
   - `URL` → `SUPABASE_URL`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`
   - `anon key` → `SUPABASE_ANON_KEY`

4. Allez dans **Database > Connection String**
5. Copiez la chaîne de connexion PostgreSQL
6. Remplacez `[PASSWORD]` par votre mot de passe de base de données

### 3. Migration de la Base de Données

```bash
cd license-server

# Installer les dépendances
npm install

# Pousser le schéma vers Supabase
npx prisma db push

# Vérifier la connexion
npx prisma studio
```

## 🧪 Tester l'API

### Démarrer le serveur

```bash
cd license-server
npm start
```

### Tester les endpoints

```bash
# Health check
curl http://localhost:4000/health

# Register
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get plans
curl http://localhost:4000/api/v1/plans
```

## 🔐 Sécurité

### Row Level Security (RLS)

Le script SQL `supabase_setup.sql` configure RLS:
- Users can only view their own data
- Licenses are protected by user ID
- Subscriptions are protected by user ID

### Authentification

- Supabase Auth gère les sessions utilisateur
- Les tokens JWT sont signés avec votre secret
- Validation du hardware ID pour les licences

## 📝 Notes Importantes

1. **Compatibilité arrière:** Les utilisateurs existants (avec hash bcrypt) peuvent toujours se connecter
2. **Migration progressive:** Vous pouvez migrer les utilisateurs un par un vers Supabase Auth
3. **Backup:** Gardez toujours une sauvegarde de votre base de données SQLite avant migration

## 🆘 Dépannage

### Erreur: "Invalid API key"
Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est correctement défini.

### Erreur: "Connection refused"
Vérifiez que l'URL de connexion PostgreSQL est correcte et que l'IP est autorisée dans Supabase.

### Erreur: "Database does not exist"
Vérifiez que le nom de la base de données dans l'URL est correct (généralement `postgres`).

## 📞 Support

Pour plus d'informations:
- [Documentation Supabase](https://supabase.com/docs)
- [Prisma avec Supabase](https://supabase.com/docs/guides/database/prisma)
