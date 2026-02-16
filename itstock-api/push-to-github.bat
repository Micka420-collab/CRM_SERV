@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════════
echo   PUSH VERS GITHUB - ITStock API
echo ═══════════════════════════════════════════════════
echo.

cd /d "%~dp0"

echo [1/5] Initialisation de git...
git init
echo.

echo [2/5] Ajout des fichiers...
git add .
echo.

echo [3/5] Création du commit...
git commit -m "Initial commit - ITStock License Server API"
echo.

echo [4/5] Connexion au repo GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/Micka420-collab/CRM_SERV.git
echo.

echo [5/5] Push vers GitHub...
git branch -M main
git push -u origin main

echo.
if %errorlevel% == 0 (
    echo ✅ SUCCÈS ! Le code est sur GitHub.
    echo.
    echo Allez sur : https://github.com/Micka420-collab/CRM_SERV
    echo.
    echo Prochaine étape : Deploy sur Railway
echo    https://railway.app
) else (
    echo ❌ ERREUR - Vérifiez les messages ci-dessus
    echo.
    echo Si authentification requise :
    echo 1. Créez un token sur https://github.com/settings/tokens
    echo 2. Utilisez le token comme mot de passe
)
echo.
pause
