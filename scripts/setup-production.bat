@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════════
echo   CONFIGURATION PRODUCTION ITSTOCK
echo ═══════════════════════════════════════════════════
echo.

REM Vérifier Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js non installé
    exit /b 1
)
echo ✓ Node.js installé

REM Vérifier Git
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git non installé
    exit /b 1
)
echo ✓ Git installé

echo.
echo ═══════════════════════════════════════════════════
echo   CONFIGURATION SUPABASE
echo ═══════════════════════════════════════════════════
echo.
set /p SUPABASE_URL="SUPABASE_URL (ex: https://xxx.supabase.co): "
set /p SUPABASE_SERVICE_ROLE_KEY="SUPABASE_SERVICE_ROLE_KEY: "
set /p SUPABASE_ANON_KEY="SUPABASE_ANON_KEY: "

echo.
echo Génération JWT_SECRET...
for /f "tokens=*" %%a in ('node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"') do set JWT_SECRET=%%a
echo ✓ JWT_SECRET généré

echo.
echo ═══════════════════════════════════════════════════
echo   CONFIGURATION STRIPE (optionnel)
echo ═══════════════════════════════════════════════════
echo.
set /p STRIPE_SECRET_KEY="STRIPE_SECRET_KEY (laisser vide si pas encore): "
if "%STRIPE_SECRET_KEY%"=="" set STRIPE_SECRET_KEY=sk_test_placeholder

echo.
echo ═══════════════════════════════════════════════════
echo   URL PRODUCTION
echo ═══════════════════════════════════════════════════
echo.
echo Une fois déployé sur Railway, vous aurez une URL comme:
echo   https://itstock-api.up.railway.app
echo.
set /p API_URL="URL License Server (ou Entrée pour valeur par défaut): "
if "%API_URL%"=="" set API_URL=https://itstock-api.up.railway.app

echo.
echo ═══════════════════════════════════════════════════
echo   CRÉATION DES FICHIERS
echo ═══════════════════════════════════════════════════
echo.

REM License Server .env.production
echo NODE_ENV=production> license-server\.env.production
echo PORT=3000>> license-server\.env.production
echo.>> license-server\.env.production
echo # Supabase>> license-server\.env.production
echo SUPABASE_URL=%SUPABASE_URL%>> license-server\.env.production
echo SUPABASE_SERVICE_ROLE_KEY=%SUPABASE_SERVICE_ROLE_KEY%>> license-server\.env.production
echo SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%>> license-server\.env.production
echo.>> license-server\.env.production
echo # JWT>> license-server\.env.production
echo JWT_SECRET=%JWT_SECRET%>> license-server\.env.production
echo.>> license-server\.env.production
echo # Stripe>> license-server\.env.production
echo STRIPE_SECRET_KEY=%STRIPE_SECRET_KEY%>> license-server\.env.production
echo.>> license-server\.env.production
echo # Frontend>> license-server\.env.production
echo FRONTEND_URL=https://itstock.vercel.app>> license-server\.env.production
echo.>> license-server\.env.production
echo # Demo Mode OFF>> license-server\.env.production
echo DEMO_MODE=false>> license-server\.env.production

echo ✓ license-server\.env.production créé

REM Website .env.production
echo NEXT_PUBLIC_LICENSE_SERVER_URL=%API_URL%> website\.env.production
echo NEXT_PUBLIC_SUPABASE_URL=%SUPABASE_URL%>> website\.env.production
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%>> website\.env.production
echo.>> website\.env.production
echo # Stripe>> website\.env.production
echo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder>> website\.env.production

echo ✓ website\.env.production créé

echo.
echo ═══════════════════════════════════════════════════
echo   RÉSUMÉ
echo ═══════════════════════════════════════════════════
echo.
echo Fichiers créés:
echo   • license-server\.env.production
echo   • website\.env.production
echo.
echo Prochaines étapes:
echo.
echo 1. Deploy sur Railway:
echo    - Aller sur https://railway.app
echo    - New Project ^> Deploy from GitHub
echo    - Upload les fichiers
echo.
echo 2. Deploy sur Vercel:
echo    - Aller sur https://vercel.com
echo    - Import website/
echo.
echo 3. Mettre à jour CRM.exe:
echo    - Changer URL pour: %API_URL%
echo    - Rebuild et redistribuer
echo.
echo ═══════════════════════════════════════════════════
pause
