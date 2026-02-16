#!/bin/bash
# Script de configuration production ITStock
# Usage: ./setup-production.sh

echo "═══════════════════════════════════════════════════"
echo "  CONFIGURATION PRODUCTION ITSTOCK"
echo "═══════════════════════════════════════════════════"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Vérification des prérequis...${NC}"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js non installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Vérifier Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git non installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git $(git --version)${NC}"

echo ""
echo -e "${YELLOW}2. Configuration Supabase...${NC}"
read -p "SUPABASE_URL (ex: https://xxx.supabase.co): " SUPABASE_URL
read -p "SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
read -p "SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY

echo ""
echo -e "${YELLOW}3. Génération JWT_SECRET...${NC}"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo -e "${GREEN}✓ JWT_SECRET généré${NC}"

echo ""
echo -e "${YELLOW}4. Configuration Stripe (optionnel)...${NC}"
read -p "STRIPE_SECRET_KEY (laisser vide pour skipper): " STRIPE_SECRET_KEY
read -p "STRIPE_WEBHOOK_SECRET (laisser vide pour skipper): " STRIPE_WEBHOOK_SECRET

echo ""
echo -e "${YELLOW}5. URLs Production...${NC}"
echo "Une fois déployé sur Railway, vous aurez une URL comme:"
echo "  https://itstock-api.up.railway.app"
read -p "URL License Server: " API_URL

echo ""
echo -e "${YELLOW}6. Création des fichiers .env...${NC}"

# License Server .env
cat > license-server/.env.production << EOF
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://placeholder

# Supabase
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# JWT
JWT_SECRET=${JWT_SECRET}

# Stripe
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-sk_test_placeholder}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-whsec_placeholder}

# Frontend
FRONTEND_URL=https://itstock.vercel.app

# Demo Mode OFF en production
DEMO_MODE=false
EOF

echo -e "${GREEN}✓ license-server/.env.production créé${NC}"

# Website .env
cat > website/.env.production << EOF
NEXT_PUBLIC_LICENSE_SERVER_URL=${API_URL:-https://itstock-api.up.railway.app}
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
EOF

echo -e "${GREEN}✓ website/.env.production créé${NC}"

echo ""
echo -e "${YELLOW}7. Configuration Prisma pour PostgreSQL...${NC}"

cat > license-server/prisma/schema.production.prisma << EOF
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String         @id
  email             String         @unique
  passwordHash      String
  name              String?
  company           String?
  role              UserRole       @default(CUSTOMER)
  stripeCustomerId  String?        @unique
  emailVerified     Boolean        @default(false)
  resetToken        String?
  resetTokenExpiry  DateTime?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  licenses          License[]
  subscriptions     Subscription[]
}

model Plan {
  id                 String         @id @default(cuid())
  name               String         @unique
  displayName        String
  description        String?
  maxSeats           Int
  priceMonthly       Int
  priceYearly        Int
  stripePriceIdMonthly String?
  stripePriceIdYearly  String?
  features           Json           @default("[]")
  isActive           Boolean        @default(true)
  sortOrder          Int            @default(0)
  createdAt          DateTime       @default(now())
  licenses           License[]
  subscriptions      Subscription[]
}

model License {
  id              String         @id @default(cuid())
  licenseKey      String         @unique
  userId          String
  planId          String
  status          LicenseStatus  @default(ACTIVE)
  maxActivations  Int            @default(1)
  expiresAt       DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan            Plan           @relation(fields: [planId], references: [id])
  activations     Activation[]
}

model Activation {
  id              String         @id @default(cuid())
  licenseId       String
  hardwareId      String
  machineName     String?
  ipAddress       String?
  lastCheckIn     DateTime       @default(now())
  activatedAt     DateTime       @default(now())
  deactivatedAt   DateTime?
  isActive        Boolean        @default(true)
  license         License        @relation(fields: [licenseId], references: [id], onDelete: Cascade)
  
  @@unique([licenseId, hardwareId])
}

model Subscription {
  id                   String         @id @default(cuid())
  userId               String
  planId               String
  stripeSubscriptionId String         @unique
  status               SubStatus      @default(ACTIVE)
  billingInterval      String         @default("monthly")
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean        @default(false)
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt
  user                 User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan                 Plan           @relation(fields: [planId], references: [id])
}

model Update {
  id          String   @id @default(cuid())
  version     String   @unique
  changelog   String?
  downloadUrl String
  mandatory   Boolean  @default(false)
  status      String   @default("draft")
  publishAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ClientUpdate {
  id           String   @id @default(cuid())
  clientId     String
  updateId     String
  status       String   @default("pending")
  downloadedAt DateTime?
  installedAt  DateTime?
  errorMessage String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@unique([clientId, updateId])
  @@index([clientId])
  @@index([status])
}

enum UserRole {
  CUSTOMER
  ADMIN
}

enum LicenseStatus {
  ACTIVE
  EXPIRED
  REVOKED
  SUSPENDED
}

enum SubStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  UNPAID
}
EOF

echo -e "${GREEN}✓ Prisma schema production créé${NC}"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  RÉSUMÉ CONFIGURATION"
echo "═══════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}Fichiers créés :${NC}"
echo "  • license-server/.env.production"
echo "  • website/.env.production"
echo "  • license-server/prisma/schema.production.prisma"
echo ""
echo -e "${YELLOW}Prochaines étapes :${NC}"
echo ""
echo "1. Deploy sur Railway :"
echo "   - Aller sur https://railway.app"
echo "   - New Project > Deploy from GitHub"
echo "   - Upload prisma/schema.production.prisma comme schema.prisma"
echo "   - Configurer les variables d'env"
echo ""
echo "2. Deploy sur Vercel :"
echo "   - Aller sur https://vercel.com"
echo "   - Import website/"
echo "   - Ajouter les env vars"
echo ""
echo "3. Mettre à jour CRM.exe :"
echo "   - Changer l'URL API pour: ${API_URL:-https://itstock-api.up.railway.app}"
echo "   - Rebuild et redistribuer"
echo ""
echo "═══════════════════════════════════════════════════"
