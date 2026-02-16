@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════════
echo   PUSH DU FIX PRISMA
echo ═══════════════════════════════════════════════════
echo.

cd /d "%~dp0"

echo [1/3] Ajout du fichier corrigé...
git add prisma/schema.prisma
echo.

echo [2/3] Commit...
git commit -m "Fix: Add missing relation targetDevices in AppVersion"
echo.

echo [3/3] Push vers GitHub...
git push origin main
echo.

if %errorlevel% == 0 (
    echo ✅ FIX ENVOYÉ !
    echo.
    echo Railway va automatiquement rebuild dans quelques secondes.
    echo.
    echo Allez vérifier : https://railway.app/project/CRM_SERV
) else (
    echo ❌ ERREUR - Vérifiez le message ci-dessus
)
echo.
pause
