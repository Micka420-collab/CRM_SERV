# Migration vers Supabase

Ce guide explique comment migrer ITStock vers Supabase.

## Configuration requise

### 1. Configuration Supabase

1. Connectez-vous à votre projet Supabase : https://azwtzuqfyxfltqzrunmf.supabase.co
2. Allez dans **SQL Editor** (Éditeur SQL)
3. Créez une **New query** (Nouvelle requête)
4. Copiez-collez le contenu du fichier `license-server/supabase_setup.sql`
5. Exécutez le script en cliquant sur **Run**

### 2. Configuration des variables d'environnement

#### License Server (`license-server/.env`)

```env
# Supabase Configuration
SUPABASE_URL=https://azwtzuqfyxfltqzrunmf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key_reel
SUPABASE_ANON_KEY=votre_anon_key_reel

# Database (Supabase PostgreSQL)
# Remplacez [VOTRE_MOT_DE_PASSE] par votre vrai mot de passe
# Pour encoder votre mot de passe (URL encoding):
# @ → %40
# ! → %21
# [ → %5B
# ] → %5D
# Exemple: si mot de passe = test@123!
# Encode → test%40123%21
DATABASE_URL="postgresql://postgres:[MOT_DE_PASSE_ENCODE]@db.azwtzuqfyxfltqzrunmf.supabase.co:5432/postgres?sslmode=require"
```

Pour obtenir vos clés Supabase :
1. Allez dans **Project Settings** → **API**
2. Copiez `service_role key` (ne la partagez jamais publiquement)
3. Copiez `anon key` pour le frontend

#### Website (`website/.env.local`)

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://azwtzuqfyxfltqzrunmf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key_reel

# License Server API
NEXT_PUBLIC_LICENSE_SERVER_URL=http://localhost:4000
LICENSE_SERVER_URL=http://localhost:4000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_votre_stripe_key
STRIPE_SECRET_KEY=sk_test_votre_stripe_key
```

### 3. Configuration de l'authentification Supabase

1. Dans Supabase Dashboard, allez dans **Authentication** → **Providers**
2. Assurez-vous que **Email** est activé
3. Désactivez **Confirm email** si vous voulez une inscription directe
4. Configurez les **Site URL** et **Redirect URLs** dans **Authentication** → **URL Configuration**:
   - Site URL: `http://localhost:3001`
   - Redirect URLs: `http://localhost:3001/auth/callback`

### 4. Exécution des migrations

Une fois les variables d'environnement configurées :

```bash
cd license-server
npx prisma db push
```

Si vous avez des erreurs de connexion :
1. Vérifiez que votre mot de passe est correctement encodé
2. Vérifiez que l'IP de votre serveur est autorisée dans **Database** → **Network Restrictions**
3. Essayez avec l'URL Transaction Pooler au lieu de Direct Connection

### 5. Démarrer les serveurs

```bash
# Terminal 1 - License Server
cd license-server
npm start

# Terminal 2 - Website
cd website
npm run dev
```

## Changements majeurs

### Authentification
- L'authentification est maintenant gérée par **Supabase Auth**
- Les mots de passe ne sont plus stockés dans votre base de données
- Les tokens JWT sont générés et validés par Supabase

### Base de données
- Migration de PostgreSQL local vers Supabase PostgreSQL
- Row Level Security (RLS) activé pour la sécurité
- Les tables sont créées via le script SQL fourni

### API
- Les routes d'authentification utilisent Supabase
- Le middleware d'authentification vérifie les tokens Supabase
- La synchronisation utilisateur se fait automatiquement

## Dépannage

### Erreur "Authentication failed"
- Vérifiez que le mot de passe est correctement URL encodé
- Vérifiez que vous utilisez le bon host (db.azwtzuqfyxfltqzrunmf.supabase.co)

### Erreur "SSL connection is required"
- Ajoutez `?sslmode=require` à la fin de votre DATABASE_URL

### Erreur "P1001: Can't reach database server"
- Vérifiez que votre IP est autorisée dans Supabase
- Essayez de désactiver temporairement les restrictions IP

### Tables non créées
- Exécutez le script SQL manuellement dans l'éditeur SQL Supabase
- Vérifiez que vous avez les permissions nécessaires

## Support

Pour plus d'informations :
- Documentation Supabase : https://supabase.com/docs
- Documentation Prisma avec Supabase : https://supabase.com/docs/guides/database/prisma
